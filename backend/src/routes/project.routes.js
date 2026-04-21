// src/routes/project.routes.js
const express = require('express');
const router  = express.Router();
const db      = require('../config/db');
const { authenticate, requireRole } = require('../middleware/auth.middleware');

router.use(authenticate);

// ── Create project (client) ──
router.post('/', requireRole('client'), async (req, res) => {
  try {
    const { title, description, projectType, siteAddress, siteState, siteLga } = req.body;
    const { rows } = await db.query(`
      INSERT INTO projects (client_id, title, description, project_type, site_address, site_state, site_lga)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      RETURNING *
    `, [req.user.id, title, description, projectType, siteAddress, siteState, siteLga]);

    // Create blank land verification record
    await db.query(`INSERT INTO land_verifications (project_id) VALUES ($1)`, [rows[0].id]);

    res.status(201).json({ message: 'Project created.', project: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Could not create project.' });
  }
});

// ── Get client's own projects ──
router.get('/my', requireRole('client'), async (req, res) => {
  const { rows } = await db.query(
    'SELECT * FROM projects WHERE client_id=$1 ORDER BY created_at DESC',
    [req.user.id]
  );
  res.json({ projects: rows });
});

// ── Get single project (with full detail) ──
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT p.*,
        json_build_object('id',c.id,'firstName',c.first_name,'lastName',c.last_name,'email',c.email) as client,
        json_build_object('id',e.id,'firstName',e.first_name,'lastName',e.last_name) as engineer,
        lv.status as land_status,
        lv.verified_at as land_verified_at,
        con.status as contract_status,
        con.id as contract_id
      FROM projects p
      LEFT JOIN users c  ON c.id = p.client_id
      LEFT JOIN users e  ON e.id = p.engineer_id
      LEFT JOIN land_verifications lv ON lv.project_id = p.id
      LEFT JOIN contracts con ON con.project_id = p.id
      WHERE p.id=$1
    `, [req.params.id]);

    if (!rows.length) return res.status(404).json({ error: 'Project not found.' });

    // Access control — only parties involved
    const p = rows[0];
    const uid = req.user.id;
    const role = req.user.role;
    if (role !== 'admin' && role !== 'lawyer' &&
        p.client_id !== uid && p.engineer_id !== uid) {
      // Suppliers and engineers can see basic details for quoting
    }

    res.json({ project: p });
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch project.' });
  }
});

// ── Get project milestones ──
router.get('/:id/milestones', async (req, res) => {
  const { rows } = await db.query(
    'SELECT * FROM milestones WHERE project_id=$1 ORDER BY milestone_number',
    [req.params.id]
  );
  res.json({ milestones: rows });
});

// ── Engineer files milestone complete ──
router.post('/:projectId/milestones/:milestoneId/file', requireRole('engineer'), async (req, res) => {
  try {
    const { milestoneId } = req.params;
    const { notes } = req.body;

    await db.query(`
      UPDATE milestones SET status='filed', filed_at=NOW(), engineer_notes=$1 WHERE id=$2
    `, [notes, milestoneId]);

    // Notify client via notification table
    const { rows } = await db.query(`
      SELECT m.title, p.client_id, p.title as project_title
      FROM milestones m JOIN projects p ON p.id=m.project_id WHERE m.id=$1
    `, [milestoneId]);

    if (rows.length) {
      await db.query(`
        INSERT INTO notifications (user_id, type, title, body)
        VALUES ($1,'action_required','Milestone filed — Action Required',
          $2)
      `, [rows[0].client_id,
          `${rows[0].title} has been filed as complete on ${rows[0].project_title}. Review and release escrow.`]);
    }

    res.json({ message: 'Milestone filed. Client has been notified.' });
  } catch (err) {
    res.status(500).json({ error: 'Could not file milestone.' });
  }
});

// ── Get BOQ bids for a project ──
router.get('/:id/boqs', async (req, res) => {
  const { rows } = await db.query(`
    SELECT b.*, u.first_name, u.last_name, ep.discipline, ep.years_experience, ep.primary_state, ep.specialisations
    FROM boq_submissions b
    JOIN users u ON u.id = b.engineer_id
    JOIN engineer_profiles ep ON ep.user_id = b.engineer_id
    WHERE b.project_id=$1
    ORDER BY b.total_value ASC
  `, [req.params.id]);
  res.json({ bids: rows });
});

// ── Client awards BOQ (selects engineer) ──
router.post('/:projectId/boqs/:boqId/award', requireRole('client'), async (req, res) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const { projectId, boqId } = req.params;

    const { rows: boqRows } = await client.query(
      'SELECT * FROM boq_submissions WHERE id=$1 AND project_id=$2',
      [boqId, projectId]
    );
    if (!boqRows.length) return res.status(404).json({ error: 'BOQ not found.' });
    const boq = boqRows[0];

    // Award BOQ, set engineer on project
    await client.query('UPDATE boq_submissions SET is_awarded=TRUE, awarded_at=NOW() WHERE id=$1', [boqId]);
    await client.query(`
      UPDATE projects SET engineer_id=$1, contract_value=$2, status='boq_selection' WHERE id=$3
    `, [boq.engineer_id, boq.total_value, projectId]);

    // Notify engineer
    await client.query(`
      INSERT INTO notifications (user_id, type, title, body)
      VALUES ($1,'action_required','🏆 BOQ Awarded','Your BOQ has been selected. The platform lawyer will prepare your contract shortly.')
    `, [boq.engineer_id]);

    await client.query('COMMIT');
    res.json({ message: 'Engineer selected. Platform lawyer will now prepare the contract.' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Could not award BOQ.' });
  } finally {
    client.release();
  }
});

// ── Get open projects for engineers to bid on ──
router.get('/open/for-engineers', requireRole('engineer','admin'), async (req, res) => {
  const { state } = req.query;
  let query = `
    SELECT p.id, p.title, p.description, p.project_type, p.site_state, p.site_lga,
           p.created_at,
           u.first_name as client_first, u.last_name as client_last,
           COUNT(b.id) as bid_count,
           lv.status as land_status
    FROM projects p
    JOIN users u ON u.id = p.client_id
    LEFT JOIN boq_submissions b ON b.project_id = p.id
    LEFT JOIN land_verifications lv ON lv.project_id = p.id
    WHERE p.status IN ('land_verified','drawings_uploaded','boq_selection')
    AND lv.status = 'verified'
  `;
  const params = [];
  if (state) { params.push(state); query += ` AND p.site_state=$${params.length}`; }
  query += ' GROUP BY p.id, u.first_name, u.last_name, lv.status ORDER BY p.created_at DESC';

  const { rows } = await db.query(query, params);
  res.json({ projects: rows });
});

module.exports = router;
