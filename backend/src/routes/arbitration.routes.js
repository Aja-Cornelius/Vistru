// src/routes/arbitration.routes.js  (mounted under /api/project in server.js)
// File new arbitration case — accessible by client or engineer
const express  = require('express');
const router   = express.Router();
const db       = require('../config/db');
const { authenticate, requireRole } = require('../middleware/auth.middleware');
const emailSvc = require('../services/email.service');

router.use(authenticate);

// ── File a new arbitration case ──
router.post('/', requireRole('client','engineer'), async (req, res) => {
  try {
    const { projectId, nature, description, disputedAmount } = req.body;

    // Generate reference e.g. ARB-2025-042
    const year = new Date().getFullYear();
    const { rows: countRows } = await db.query(
      'SELECT COUNT(*) as cnt FROM arbitration_cases'
    );
    const seq = String(parseInt(countRows[0].cnt) + 1).padStart(3, '0');
    const caseRef = `ARB-${year}-${seq}`;

    const FILING_FEE    = 7500000; // ₦75,000 in kobo
    const PCT_FEE       = Math.round((disputedAmount || 0) * 100 * 0.005); // 0.5%
    const totalFee      = FILING_FEE + PCT_FEE;

    const { rows } = await db.query(`
      INSERT INTO arbitration_cases
        (case_reference, project_id, filed_by, nature, description,
         disputed_amount, filing_fee, percentage_fee, total_fee_charged)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING id, case_reference
    `, [
      caseRef, projectId, req.user.id, nature, description,
      (disputedAmount||0)*100, FILING_FEE, PCT_FEE, totalFee
    ]);

    // Notify the other party
    const { rows: projRows } = await db.query(
      'SELECT client_id, engineer_id, title FROM projects WHERE id=$1',
      [projectId]
    );
    if (projRows.length) {
      const otherPartyId = req.user.id === projRows[0].client_id
        ? projRows[0].engineer_id
        : projRows[0].client_id;

      if (otherPartyId) {
        await db.query(`
          INSERT INTO notifications (user_id, type, title, body)
          VALUES ($1,'action_required','⚖️ Arbitration Case Filed Against You',$2)
        `, [otherPartyId,
            `Case ${caseRef} has been filed on project "${projRows[0].title}". A platform lawyer will be in touch.`]);
      }
    }

    // Mark project as disputed
    await db.query(
      "UPDATE projects SET status='disputed' WHERE id=$1 AND status NOT IN ('completed','cancelled')",
      [projectId]
    );

    res.status(201).json({
      message        : `Arbitration case ${caseRef} filed. The platform lawyer will contact both parties.`,
      caseRef,
      caseId         : rows[0].id,
      totalFeePending: totalFee
    });
  } catch (err) {
    console.error('fileArbitration error:', err);
    res.status(500).json({ error: 'Could not file arbitration case.' });
  }
});

// ── Get cases related to current user ──
router.get('/my', async (req, res) => {
  const { rows } = await db.query(`
    SELECT a.*, p.title as project_title,
           u.first_name || ' ' || u.last_name as filed_by_name,
           l.first_name || ' ' || l.last_name as lawyer_name
    FROM arbitration_cases a
    JOIN projects p ON p.id = a.project_id
    JOIN users u ON u.id = a.filed_by
    LEFT JOIN users l ON l.id = a.lawyer_id
    WHERE a.filed_by=$1
       OR p.client_id=$1
       OR p.engineer_id=$1
    ORDER BY a.filed_at DESC
  `, [req.user.id]);
  res.json({ cases: rows });
});

module.exports = router;
