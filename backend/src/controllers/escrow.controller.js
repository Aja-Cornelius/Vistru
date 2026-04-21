// ═══════════════════════════════════════════════════════════
//  VISTRU — Escrow Controller
//  src/controllers/escrow.controller.js
// ═══════════════════════════════════════════════════════════
const db       = require('../config/db');
const emailSvc = require('../services/email.service');

const ESCROW_FEES = {
  milestone : 2.5,   // % charged on engineer milestone payments
  material  : 2.0,   // % charged on supplier material payments
  legal_fee : 0,     // legal fees pass through at face value
  cctv_fee  : 0,
  agent_visit: 0
};

// ── Calculate platform fee ──
const calcFee = (grossKobo, type) => {
  const pct = ESCROW_FEES[type] || 0;
  return Math.round(grossKobo * pct / 100);
};

// ════════════════════════════════════════════
//  POST /api/escrow/fund-milestone
//  Client funds a milestone into escrow
// ════════════════════════════════════════════
const fundMilestone = async (req, res) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const { milestoneId, flwReference, flwTxId, paymentMethod } = req.body;
    const clientId = req.user.id;

    // Fetch milestone + project
    const { rows: mRows } = await client.query(`
      SELECT m.*, p.engineer_id, p.title as project_title, p.client_id
      FROM milestones m
      JOIN projects p ON p.id = m.project_id
      WHERE m.id = $1
    `, [milestoneId]);

    if (!mRows.length) return res.status(404).json({ error: 'Milestone not found.' });
    const milestone = mRows[0];

    if (milestone.client_id !== clientId) {
      return res.status(403).json({ error: 'You do not have access to this milestone.' });
    }
    if (milestone.status !== 'pending_funding') {
      return res.status(400).json({ error: 'This milestone has already been funded.' });
    }

    const gross = milestone.amount;
    const fee   = calcFee(gross, 'milestone');
    const net   = gross - fee;

    // Create escrow transaction
    const { rows: txRows } = await client.query(`
      INSERT INTO escrow_transactions
        (project_id, milestone_id, payer_id, payee_id, type, status,
         gross_amount, platform_fee_pct, platform_fee, net_amount,
         flw_reference, flw_tx_id, payment_method)
      VALUES ($1,$2,$3,$4,'milestone','held',$5,$6,$7,$8,$9,$10,$11)
      RETURNING id
    `, [
      milestone.project_id, milestoneId, clientId, milestone.engineer_id,
      gross, ESCROW_FEES.milestone, fee, net,
      flwReference, flwTxId, paymentMethod
    ]);

    // Update milestone status
    await client.query(`
      UPDATE milestones SET status='funded', funded_at=NOW() WHERE id=$1
    `, [milestoneId]);

    // Update project escrow balance
    await client.query(`
      UPDATE projects SET escrow_balance = escrow_balance + $1 WHERE id=$2
    `, [gross, milestone.project_id]);

    await client.query('COMMIT');

    res.json({
      message        : `₦${(gross/100).toLocaleString()} held in escrow for ${milestone.title}.`,
      transactionId  : txRows[0].id,
      gross          : gross,
      platformFee    : fee,
      net
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('fundMilestone error:', err);
    res.status(500).json({ error: 'Payment failed. Please try again.' });
  } finally {
    client.release();
  }
};

// ════════════════════════════════════════════
//  POST /api/escrow/release-milestone
//  Client releases escrow to engineer after confirmation
// ════════════════════════════════════════════
const releaseMilestone = async (req, res) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const { milestoneId } = req.body;
    const clientId = req.user.id;

    const { rows: mRows } = await client.query(`
      SELECT m.*, p.client_id, p.engineer_id, p.title as project_title,
             u.email as engineer_email, u.first_name as engineer_name
      FROM milestones m
      JOIN projects p ON p.id = m.project_id
      JOIN users u ON u.id = p.engineer_id
      WHERE m.id = $1
    `, [milestoneId]);

    if (!mRows.length) return res.status(404).json({ error: 'Milestone not found.' });
    const m = mRows[0];

    if (m.client_id !== clientId) {
      return res.status(403).json({ error: 'Access denied.' });
    }
    if (!['filed', 'under_review'].includes(m.status)) {
      return res.status(400).json({ error: 'Milestone must be filed before escrow can be released.' });
    }

    // Update escrow transaction
    await client.query(`
      UPDATE escrow_transactions
      SET status='released', released_at=NOW(), released_by=$1
      WHERE milestone_id=$2 AND status='held'
    `, [clientId, milestoneId]);

    // Mark milestone complete
    await client.query(`
      UPDATE milestones
      SET status='completed', completed_at=NOW(), payment_released_at=NOW()
      WHERE id=$1
    `, [milestoneId]);

    // Reduce project escrow balance, add to total paid
    await client.query(`
      UPDATE projects
      SET escrow_balance = escrow_balance - $1,
          total_paid     = total_paid + $1,
          completion_percent = LEAST(completion_percent + (100 / total_milestones), 100)
      WHERE id=$2
    `, [m.amount, m.project_id]);

    // Auto-settle any engineer project loans from this release
    await client.query(`
      UPDATE project_loans
      SET status='settled', settled_at=NOW()
      WHERE engineer_id=$1 AND project_id=$2 AND status='approved'
    `, [m.engineer_id, m.project_id]);

    await client.query('COMMIT');

    // Notify engineer by email
    emailSvc.sendEscrowReleased({
      to            : m.engineer_email,
      recipientName : m.engineer_name,
      amount        : m.amount,
      milestoneName : m.title,
      projectTitle  : m.project_title
    }).catch(console.error);

    res.json({
      message : `Escrow of ₦${(m.amount/100).toLocaleString()} released to engineer for ${m.title}.`,
      milestone: { id: milestoneId, status: 'completed' }
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('releaseMilestone error:', err);
    res.status(500).json({ error: 'Release failed. Please try again.' });
  } finally {
    client.release();
  }
};

// ════════════════════════════════════════════
//  POST /api/escrow/fund-order
//  Client pays for supplier materials into escrow
// ════════════════════════════════════════════
const fundOrder = async (req, res) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const { orderId, flwReference, flwTxId } = req.body;
    const clientId = req.user.id;

    const { rows } = await client.query(`
      SELECT o.*, u.id as supplier_uid
      FROM supplier_orders o
      JOIN supplier_profiles sp ON sp.user_id = o.supplier_id
      JOIN users u ON u.id = o.supplier_id
      WHERE o.id=$1 AND o.client_id=$2
    `, [orderId, clientId]);

    if (!rows.length) return res.status(404).json({ error: 'Order not found.' });
    const order = rows[0];

    const gross = order.total_amount;
    const fee   = calcFee(gross, 'material');
    const net   = gross - fee;

    await client.query(`
      INSERT INTO escrow_transactions
        (project_id, order_id, payer_id, payee_id, type, status,
         gross_amount, platform_fee_pct, platform_fee, net_amount, flw_reference, flw_tx_id)
      VALUES ($1,$2,$3,$4,'material','held',$5,$6,$7,$8,$9,$10)
    `, [order.project_id, orderId, clientId, order.supplier_id,
        gross, ESCROW_FEES.material, fee, net, flwReference, flwTxId]);

    await client.query(`UPDATE supplier_orders SET status='confirmed' WHERE id=$1`, [orderId]);

    await client.query('COMMIT');

    res.json({
      message     : `₦${(gross/100).toLocaleString()} held in escrow for order ${order.order_reference}.`,
      gross, platformFee: fee, net
    });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Payment failed.' });
  } finally {
    client.release();
  }
};

// ════════════════════════════════════════════
//  POST /api/escrow/release-order
//  Client releases payment to supplier after delivery
// ════════════════════════════════════════════
const releaseOrder = async (req, res) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const { orderId } = req.body;

    const { rows } = await client.query(`
      SELECT o.*, u.email as supplier_email, u.first_name as supplier_name,
             sp.business_name
      FROM supplier_orders o
      JOIN users u ON u.id = o.supplier_id
      JOIN supplier_profiles sp ON sp.user_id = o.supplier_id
      WHERE o.id=$1 AND o.client_id=$2
    `, [orderId, req.user.id]);

    if (!rows.length) return res.status(404).json({ error: 'Order not found.' });
    const order = rows[0];

    if (order.status !== 'delivered') {
      return res.status(400).json({ error: 'Order must be marked delivered before releasing payment.' });
    }

    await client.query(`
      UPDATE escrow_transactions SET status='released', released_at=NOW(), released_by=$1
      WHERE order_id=$2 AND status='held'
    `, [req.user.id, orderId]);

    await client.query(`UPDATE supplier_orders SET status='completed', completed_at=NOW() WHERE id=$1`, [orderId]);

    await client.query('COMMIT');

    emailSvc.sendEscrowReleased({
      to            : order.supplier_email,
      recipientName : order.supplier_name || order.business_name,
      amount        : order.total_amount,
      milestoneName : `Order ${order.order_reference}`,
      projectTitle  : 'Material Delivery'
    }).catch(console.error);

    res.json({ message: `Payment released to ${order.business_name} for order ${order.order_reference}.` });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Release failed.' });
  } finally {
    client.release();
  }
};

// ════════════════════════════════════════════
//  GET /api/escrow/summary/:projectId
// ════════════════════════════════════════════
const getEscrowSummary = async (req, res) => {
  try {
    const { projectId } = req.params;

    const { rows: txRows } = await db.query(`
      SELECT type, status,
             SUM(gross_amount) as gross,
             SUM(platform_fee) as fee,
             SUM(net_amount) as net,
             COUNT(*) as tx_count
      FROM escrow_transactions
      WHERE project_id=$1
      GROUP BY type, status
      ORDER BY type, status
    `, [projectId]);

    const { rows: projRows } = await db.query(
      'SELECT escrow_balance, total_paid, contract_value FROM projects WHERE id=$1',
      [projectId]
    );

    res.json({
      summary    : txRows,
      project    : projRows[0] || {},
    });
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch escrow summary.' });
  }
};

module.exports = { fundMilestone, releaseMilestone, fundOrder, releaseOrder, getEscrowSummary };
