// src/routes/cctv.routes.js
const express = require('express');
const router  = express.Router();
const db      = require('../config/db');
const aiService = require('../services/ai.service');
const { authenticate } = require('../middleware/auth.middleware');

router.use(authenticate);

// Get cameras for a project
router.get('/:projectId/cameras', async (req, res) => {
  const { rows } = await db.query(
    'SELECT * FROM cctv_cameras WHERE project_id=$1 AND is_active=TRUE',
    [req.params.projectId]);
  res.json({ cameras: rows });
});

// Get AI reports for a project
router.get('/:projectId/reports', async (req, res) => {
  const { rows } = await db.query(
    'SELECT * FROM cctv_reports WHERE project_id=$1 ORDER BY generated_at DESC',
    [req.params.projectId]);
  res.json({ reports: rows });
});

// Submit AI report manually (e.g. from an external vision agent)
router.post('/:projectId/report', async (req, res) => {
  const { milestoneId, reportType, summary, observations, materialCounts,
          completionPercent, workerCount, recommendation, mediaUrls } = req.body;

  const { rows } = await db.query(`
    INSERT INTO cctv_reports
      (project_id, milestone_id, report_type, summary, observations,
       material_counts, completion_pct, worker_count, recommendation, media_urls)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    RETURNING id
  `, [req.params.projectId, milestoneId, reportType, summary, observations,
      JSON.stringify(materialCounts||{}), completionPercent, workerCount, recommendation,
      mediaUrls||[]]);

  // Notify client
  await db.query(`
    INSERT INTO notifications (user_id, type, title, body)
    SELECT client_id,'action_required','🤖 New AI Site Report','A new AI monitoring report is ready for your review.'
    FROM projects WHERE id=$1
  `, [req.params.projectId]);

  res.status(201).json({ message: 'Report saved.', reportId: rows[0].id });
});

// Trigger AI report generation (Manual SNAPSHOT / Simulating AI trigger)
router.post('/:projectId/analyze', async (req, res) => {
  try {
    const { imageUrl, milestoneId } = req.body;
    if (!imageUrl) return res.status(400).json({ error: 'imageUrl is required (URL of the site photo)' });

    const result = await aiService.generateReport(req.params.projectId, imageUrl, milestoneId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'AI analysis failed: ' + err.message });
  }
});

module.exports = router;
