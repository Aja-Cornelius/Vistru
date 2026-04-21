// src/routes/client.routes.js
const express = require('express');
const router  = express.Router();
const db      = require('../config/db');
const { authenticate, requireRole } = require('../middleware/auth.middleware');

router.use(authenticate, requireRole('client','admin'));

// Dashboard summary
router.get('/dashboard', async (req, res) => {
  const { rows } = await db.query(`
    SELECT p.id, p.title, p.status, p.completion_percent, p.escrow_balance,
           p.contract_value, p.site_state,
           lv.status as land_status,
           (SELECT COUNT(*) FROM boq_submissions WHERE project_id=p.id) as boq_count,
           (SELECT COUNT(*) FROM milestones WHERE project_id=p.id AND status='filed') as milestones_pending
    FROM projects p
    LEFT JOIN land_verifications lv ON lv.project_id=p.id
    WHERE p.client_id=$1
    ORDER BY p.created_at DESC
  `, [req.user.id]);
  res.json({ projects: rows, user: req.user });
});

// Notifications
router.get('/notifications', async (req, res) => {
  const { rows } = await db.query(
    'SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50',
    [req.user.id]
  );
  res.json({ notifications: rows });
});

router.patch('/notifications/:id/read', async (req, res) => {
  await db.query('UPDATE notifications SET is_read=TRUE WHERE id=$1 AND user_id=$2',
    [req.params.id, req.user.id]);
  res.json({ message: 'Marked as read.' });
});

module.exports = router;
