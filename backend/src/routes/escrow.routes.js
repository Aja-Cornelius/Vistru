// src/routes/escrow.routes.js
const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/escrow.controller');
const { authenticate, requireRole } = require('../middleware/auth.middleware');

router.use(authenticate);
router.post('/fund-milestone',    requireRole('client'),   ctrl.fundMilestone);
router.post('/release-milestone', requireRole('client'),   ctrl.releaseMilestone);
router.post('/fund-order',        requireRole('client'),   ctrl.fundOrder);
router.post('/release-order',     requireRole('client'),   ctrl.releaseOrder);
router.get('/summary/:projectId', ctrl.getEscrowSummary);

module.exports = router;
