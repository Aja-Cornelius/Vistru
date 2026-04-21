// src/routes/engineer.routes.js
const express = require('express');
const router  = express.Router();
const db      = require('../config/db');
const { authenticate, requireRole } = require('../middleware/auth.middleware');
router.use(authenticate, requireRole('engineer','admin'));

router.get('/dashboard', async (req, res) => {
  const { rows: profile } = await db.query(
    'SELECT * FROM engineer_profiles WHERE user_id=$1', [req.user.id]);
  const { rows: projects } = await db.query(`
    SELECT p.*, m.status as current_milestone_status
    FROM projects p
    LEFT JOIN milestones m ON m.project_id=p.id AND m.milestone_number=p.current_milestone
    WHERE p.engineer_id=$1 AND p.status NOT IN ('completed','cancelled')
  `, [req.user.id]);
  res.json({ profile: profile[0], projects, user: req.user });
});

// Submit BOQ
router.post('/boq', async (req, res) => {
  const { projectId, totalValue, durationMonths, milestoneBreakdown, boqDocUrl } = req.body;
  const { rows } = await db.query(`
    INSERT INTO boq_submissions (project_id, engineer_id, total_value, duration_months, milestone_breakdown, boq_doc_url)
    VALUES ($1,$2,$3,$4,$5,$6) RETURNING id
  `, [projectId, req.user.id, totalValue * 100, durationMonths, milestoneBreakdown, boqDocUrl]);

  await db.query(`
    INSERT INTO notifications (user_id, type, title, body)
    SELECT client_id,'info','New BOQ Received',
      'A new BOQ has been submitted for your project. Review it in your Drawings & BOQ section.'
    FROM projects WHERE id=$1
  `, [projectId]);

  res.status(201).json({ message: 'BOQ submitted successfully.', boqId: rows[0].id });
});

// Apply for project loan
router.post('/loan', async (req, res) => {
  const { projectId, milestoneId, amountRequested, purpose } = req.body;
  const { rows } = await db.query(`
    INSERT INTO project_loans (engineer_id, project_id, milestone_id, amount_requested, purpose)
    VALUES ($1,$2,$3,$4,$5) RETURNING id
  `, [req.user.id, projectId, milestoneId, amountRequested * 100, purpose]);
  res.status(201).json({ message: 'Loan application submitted. You will be notified of approval.', loanId: rows[0].id });
});

module.exports = router;
