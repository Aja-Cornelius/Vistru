// src/routes/lawyer.routes.js
const express = require('express');
const router  = express.Router();
const db      = require('../config/db');
const { authenticate, requireRole } = require('../middleware/auth.middleware');
const emailSvc = require('../services/email.service');

router.use(authenticate, requireRole('lawyer','admin'));

router.get('/dashboard', async (req, res) => {
  const { rows: queue } = await db.query(`
    SELECT lv.*, p.title, p.site_address, p.site_state,
           u.first_name, u.last_name, u.email as client_email
    FROM land_verifications lv
    JOIN projects p ON p.id=lv.project_id
    JOIN users u ON u.id=p.client_id
    WHERE lv.status IN ('pending','under_review')
    ORDER BY lv.created_at ASC
  `);
  const { rows: contracts } = await db.query(`
    SELECT con.*, p.title, p.site_state
    FROM contracts con JOIN projects p ON p.id=con.project_id
    WHERE con.lawyer_id=$1 ORDER BY con.created_at DESC LIMIT 20
  `, [req.user.id]);
  const { rows: cases } = await db.query(
    'SELECT * FROM arbitration_cases WHERE lawyer_id=$1 ORDER BY filed_at DESC LIMIT 20',
    [req.user.id]);
  const { rows: fees } = await db.query(`
    SELECT SUM(lawyer_fee) as contract_fees FROM contracts WHERE lawyer_id=$1 AND status='active'
  `, [req.user.id]);

  res.json({ queue, contracts, cases, fees: fees[0] });
});

// Issue land verdict
router.patch('/land/:verificationId/verdict', async (req, res) => {
  const { verdict, notes, feeCharged } = req.body;
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      'SELECT * FROM land_verifications WHERE id=$1', [req.params.verificationId]);
    if (!rows.length) return res.status(404).json({ error: 'Verification not found.' });

    await client.query(`
      UPDATE land_verifications
      SET status=$1, notes=$2, lawyer_id=$3, fee_charged=$4,
          verified_at=${verdict==='verified'?'NOW()':'NULL'}, updated_at=NOW()
      WHERE id=$5
    `, [verdict, notes, req.user.id, (feeCharged||0)*100, req.params.verificationId]);

    if (verdict === 'verified') {
      await client.query(`
        UPDATE projects SET status='land_verified'
        WHERE id=$1
      `, [rows[0].project_id]);
      // Notify client
      await client.query(`
        INSERT INTO notifications (user_id, type, title, body)
        SELECT client_id,'action_required','✅ Land Verified — Upload Your Drawings',
          'Your land has been verified. You can now upload architectural and structural drawings.'
        FROM projects WHERE id=$1
      `, [rows[0].project_id]);
    } else if (verdict === 'disputed') {
      await client.query(`
        UPDATE projects SET status='disputed' WHERE id=$1
      `, [rows[0].project_id]);
      await client.query(`
        INSERT INTO notifications (user_id, type, title, body)
        SELECT client_id,'action_required','⛔ Land Dispute Found',
          'A dispute or issue was found with your land documents. Please review the lawyer notes.'
        FROM projects WHERE id=$1
      `, [rows[0].project_id]);
    }

    await client.query('COMMIT');
    res.json({ message: `Land marked as ${verdict}.` });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Could not update verdict.' });
  } finally {
    client.release();
  }
});

// Draft contract
router.post('/contract', async (req, res) => {
  const { projectId, contractValue, durationMonths, boqId, specialConditions } = req.body;
  const lawyerFee = Math.round(contractValue * 100 * 0.01); // 1% of contract

  const { rows: proj } = await db.query(
    'SELECT client_id, engineer_id FROM projects WHERE id=$1', [projectId]);
  if (!rows.length) return res.status(404).json({ error: 'Project not found.' });

  const { rows } = await db.query(`
    INSERT INTO contracts
      (project_id, lawyer_id, client_id, engineer_id, boq_id,
       contract_value, duration_months, lawyer_fee, special_conditions, status)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'draft')
    RETURNING id
  `, [projectId, req.user.id, proj[0].client_id, proj[0].engineer_id,
      boqId || null, contractValue*100, durationMonths, lawyerFee, specialConditions]);

  await db.query(`UPDATE projects SET status='contract_signed' WHERE id=$1`, [projectId]);

  res.status(201).json({ message: 'Contract drafted.', contractId: rows[0].id });
});

// Handle arbitration
router.patch('/arbitration/:caseId/schedule', async (req, res) => {
  const { hearingDate } = req.body;
  await db.query(`
    UPDATE arbitration_cases
    SET status='scheduled', hearing_date=$1, lawyer_id=$2, updated_at=NOW()
    WHERE id=$3
  `, [hearingDate, req.user.id, req.params.caseId]);
  res.json({ message: 'Hearing scheduled.' });
});

router.patch('/arbitration/:caseId/ruling', async (req, res) => {
  const { ruling } = req.body;
  await db.query(`
    UPDATE arbitration_cases
    SET status='ruling_issued', ruling=$1, ruling_issued_at=NOW(), updated_at=NOW()
    WHERE id=$2
  `, [ruling, req.params.caseId]);
  res.json({ message: 'Ruling issued.' });
});

module.exports = router;
