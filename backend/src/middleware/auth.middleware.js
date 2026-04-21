// ═══════════════════════════════════════════════════════════
//  VISTRU — Auth & Role Middleware
//  src/middleware/auth.middleware.js
// ═══════════════════════════════════════════════════════════
const jwt = require('jsonwebtoken');
const db  = require('../config/db');

// ── Verify JWT token ──
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided. Please log in.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch user from DB to ensure they still exist and are active
    const { rows } = await db.query(
      'SELECT id, role, status, email, first_name, last_name FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (!rows.length) {
      return res.status(401).json({ error: 'User no longer exists.' });
    }

    const user = rows[0];

    if (user.status === 'suspended') {
      return res.status(403).json({ error: 'Your account has been suspended. Contact support.' });
    }
    if (user.status === 'deactivated') {
      return res.status(403).json({ error: 'This account has been deactivated.' });
    }
    if (user.status === 'pending_email') {
      return res.status(403).json({ error: 'Please verify your email before continuing.' });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Session expired. Please log in again.' });
    }
    return res.status(401).json({ error: 'Invalid token. Please log in again.' });
  }
};

// ── Role guard factory ──
// Usage: requireRole('client') or requireRole('engineer','admin')
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated.' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Access denied. This route requires role: ${roles.join(' or ')}.`
      });
    }
    next();
  };
};

// ── Optional auth (attaches user if token present, doesn't fail if not) ──
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return next();

    const token   = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { rows } = await db.query(
      'SELECT id, role, status, email, first_name, last_name FROM users WHERE id = $1',
      [decoded.userId]
    );
    if (rows.length) req.user = rows[0];
  } catch (_) { /* ignore */ }
  next();
};

module.exports = { authenticate, requireRole, optionalAuth };
