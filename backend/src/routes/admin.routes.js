// src/routes/admin.routes.js
const express = require('express');
const router  = express.Router();
const db      = require('../config/db');
const { authenticate, requireRole } = require('../middleware/auth.middleware');
const emailSvc = require('../services/email.service');

router.use(authenticate, requireRole('admin'));

// ── Platform stats ──
router.get('/stats', async (req, res) => {
  try {
    const [users, projects, escrow, orders] = await Promise.all([
      db.query(`SELECT role, status, COUNT(*) as count FROM users GROUP BY role, status`),
      db.query(`SELECT status, COUNT(*) as count FROM projects GROUP BY status`),
      db.query(`SELECT status, SUM(gross_amount) as total FROM escrow_transactions GROUP BY status`),
      db.query(`SELECT status, COUNT(*) as count FROM supplier_orders GROUP BY status`)
    ]);
    res.json({
      users    : users.rows,
      projects : projects.rows,
      escrow   : escrow.rows,
      orders   : orders.rows
    });
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch stats.' });
  }
});

// ── List users pending review ──
router.get('/pending-reviews', async (req, res) => {
  const { rows } = await db.query(`
    SELECT u.id, u.role, u.first_name, u.last_name, u.email, u.created_at,
           u.id_document_url,
           ep.licence_number, ep.licence_body, ep.licence_expiry, ep.licence_doc_url,
           sp.business_name, sp.cac_number, sp.cac_doc_url, sp.cac_verified
    FROM users u
    LEFT JOIN engineer_profiles ep ON ep.user_id = u.id
    LEFT JOIN supplier_profiles sp ON sp.user_id = u.id
    WHERE u.status = 'pending_review'
    ORDER BY u.created_at ASC
  `);
  res.json({ pending: rows });
});

// ── Approve user (engineer or supplier) ──
router.patch('/users/:id/approve', async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT id, role, email, first_name FROM users WHERE id=$1',
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found.' });
    const user = rows[0];

    await db.query(
      "UPDATE users SET status='active' WHERE id=$1",
      [user.id]
    );

    if (user.role === 'engineer') {
      await db.query(
        'UPDATE engineer_profiles SET licence_verified=TRUE WHERE user_id=$1',
        [user.id]
      );
    }
    if (user.role === 'supplier') {
      await db.query(
        'UPDATE supplier_profiles SET cac_verified=TRUE WHERE user_id=$1',
        [user.id]
      );
    }

    // Notify user
    await db.query(`
      INSERT INTO notifications (user_id, type, title, body)
      VALUES ($1,'info','✅ Account Approved',
        'Your account has been reviewed and approved. You now have full access to the platform.')
    `, [user.id]);

    emailSvc.sendAccountApproved({
      to   : user.email,
      name : user.first_name,
      role : user.role
    }).catch(console.error);

    res.json({ message: `${user.first_name}'s account approved.` });
  } catch (err) {
    res.status(500).json({ error: 'Approval failed.' });
  }
});

// ── Suspend user ──
router.patch('/users/:id/suspend', async (req, res) => {
  const { reason } = req.body;
  await db.query("UPDATE users SET status='suspended' WHERE id=$1", [req.params.id]);
  await db.query(`
    INSERT INTO notifications (user_id, type, title, body)
    VALUES ($1,'system','⛔ Account Suspended',$2)
  `, [req.params.id, reason || 'Your account has been suspended. Contact support@vistru.ng']);
  res.json({ message: 'User suspended.' });
});

// ── Onboard a lawyer (admin creates lawyer accounts directly) ──
router.post('/onboard-lawyer', async (req, res) => {
  const bcrypt = require('bcryptjs');
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const {
      firstName, lastName, email, phone,
      barNumber, barBranch, licenceDocUrl,
      yearsExperience, assignedStates, specialisation,
      temporaryPassword
    } = req.body;

    const dup = await client.query('SELECT id FROM users WHERE email=$1', [email.toLowerCase()]);
    if (dup.rows.length) return res.status(409).json({ error: 'Email already registered.' });

    const hash = await bcrypt.hash(temporaryPassword, 12);

    const { rows } = await client.query(`
      INSERT INTO users
        (role, status, first_name, last_name, email, phone, password_hash, email_verified)
      VALUES ('lawyer','active',$1,$2,$3,$4,$5,TRUE)
      RETURNING id
    `, [firstName, lastName, email.toLowerCase(), phone, hash]);

    const userId = rows[0].id;

    await client.query(`
      INSERT INTO lawyer_profiles
        (user_id, bar_number, bar_branch, licence_doc_url, years_experience,
         assigned_states, specialisation)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
    `, [
      userId, barNumber, barBranch, licenceDocUrl,
      yearsExperience,
      Array.isArray(assignedStates) ? assignedStates : [assignedStates],
      Array.isArray(specialisation) ? specialisation : [specialisation]
    ]);

    await client.query('COMMIT');

    emailSvc.sendAccountApproved({
      to   : email,
      name : firstName,
      role : 'lawyer'
    }).catch(console.error);

    res.status(201).json({
      message : `Lawyer ${firstName} ${lastName} onboarded successfully.`,
      userId
    });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Onboarding failed.' });
  } finally {
    client.release();
  }
});

// ── Get all arbitration cases ──
router.get('/arbitrations', async (req, res) => {
  const { rows } = await db.query(`
    SELECT a.*, p.title as project_title, p.site_state,
           u.first_name || ' ' || u.last_name as filed_by_name,
           l.first_name || ' ' || l.last_name as lawyer_name
    FROM arbitration_cases a
    JOIN projects p ON p.id = a.project_id
    JOIN users u ON u.id = a.filed_by
    LEFT JOIN users l ON l.id = a.lawyer_id
    ORDER BY a.filed_at DESC
  `);
  res.json({ cases: rows });
});

// ── Assign lawyer to arbitration ──
router.patch('/arbitrations/:id/assign-lawyer', async (req, res) => {
  const { lawyerId } = req.body;
  await db.query(
    "UPDATE arbitration_cases SET lawyer_id=$1, status='under_review' WHERE id=$2",
    [lawyerId, req.params.id]
  );
  res.json({ message: 'Lawyer assigned to arbitration case.' });
});

// ── Audit log ──
router.get('/audit-log', async (req, res) => {
  const { rows } = await db.query(`
    SELECT a.*, u.first_name || ' ' || u.last_name as actor_name, u.role as actor_role
    FROM audit_log a
    LEFT JOIN users u ON u.id = a.actor_id
    ORDER BY a.created_at DESC
    LIMIT 200
  `);
  res.json({ log: rows });
});

module.exports = router;
