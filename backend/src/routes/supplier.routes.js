// src/routes/supplier.routes.js
const express = require('express');
const router  = express.Router();
const db      = require('../config/db');
const { authenticate, requireRole } = require('../middleware/auth.middleware');

router.use(authenticate, requireRole('supplier','admin'));

router.get('/dashboard', async (req, res) => {
  const { rows: profile } = await db.query('SELECT * FROM supplier_profiles WHERE user_id=$1', [req.user.id]);
  const { rows: orders }  = await db.query(
    'SELECT * FROM supplier_orders WHERE supplier_id=$1 ORDER BY placed_at DESC LIMIT 20', [req.user.id]);
  res.json({ profile: profile[0], orders, user: req.user });
});

router.get('/inventory', async (req, res) => {
  const { rows } = await db.query('SELECT * FROM inventory WHERE supplier_id=$1 ORDER BY created_at DESC', [req.user.id]);
  res.json({ inventory: rows });
});

router.post('/inventory', async (req, res) => {
  const { name, category, unit, unitPrice, quantityAvailable, description } = req.body;
  const { rows } = await db.query(`
    INSERT INTO inventory (supplier_id, name, category, unit, unit_price, quantity_available, description)
    VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *
  `, [req.user.id, name, category, unit, unitPrice * 100, quantityAvailable, description]);
  res.status(201).json({ message: 'Item added to inventory.', item: rows[0] });
});

router.patch('/orders/:id/dispatch', async (req, res) => {
  await db.query(
    "UPDATE supplier_orders SET status='dispatched', dispatched_at=NOW() WHERE id=$1 AND supplier_id=$2",
    [req.params.id, req.user.id]);
  res.json({ message: 'Order marked as dispatched.' });
});

router.patch('/orders/:id/delivered', async (req, res) => {
  await db.query(
    "UPDATE supplier_orders SET status='delivered', delivered_at=NOW() WHERE id=$1 AND supplier_id=$2",
    [req.params.id, req.user.id]);
  const { rows } = await db.query(
    'SELECT order_reference, client_id FROM supplier_orders WHERE id=$1', [req.params.id]);
  if (rows.length) {
    await db.query(`
      INSERT INTO notifications (user_id, type, title, body)
      VALUES ($1,'action_required','Delivery Confirmed — Release Payment',$2)
    `, [rows[0].client_id,
        `Order ${rows[0].order_reference} has been delivered. Please confirm and release escrow.`]);
  }
  res.json({ message: 'Delivery confirmed. Client notified.' });
});

module.exports = router;