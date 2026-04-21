// ═══════════════════════════════════════════════════════════
//  VISTRU — Main Server Entry Point
//  src/server.js
// ═══════════════════════════════════════════════════════════
require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const morgan     = require('morgan');
const rateLimit  = require('express-rate-limit');
const path       = require('path');

const db         = require('./config/db');

// Route imports
const arbitrationRoutes = require('./routes/arbitration.routes');
const authRoutes     = require('./routes/auth.routes');
const clientRoutes   = require('./routes/client.routes');
const engineerRoutes = require('./routes/engineer.routes');
const supplierRoutes = require('./routes/supplier.routes');
const lawyerRoutes   = require('./routes/lawyer.routes');
const escrowRoutes   = require('./routes/escrow.routes');
const projectRoutes  = require('./routes/project.routes');
const cctvRoutes     = require('./routes/cctv.routes');
const adminRoutes    = require('./routes/admin.routes');

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Security middleware ──
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5500',
    'http://127.0.0.1:5500'
  ],
  credentials: true
}));

// ── Rate limiting ──
const limiter = rateLimit({
  windowMs : 15 * 60 * 1000, // 15 minutes
  max      : 100,
  message  : { error: 'Too many requests. Please try again later.' }
});
const authLimiter = rateLimit({
  windowMs : 60 * 60 * 1000, // 1 hour
  max      : 20,              // stricter for auth endpoints
  message  : { error: 'Too many login attempts. Please wait an hour.' }
});
app.use('/api/', limiter);
app.use('/api/auth/', authLimiter);

// ── Parsing ──
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ── Static files (uploaded docs served locally in dev) ──
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ── Base Route ──
app.get('/', (req, res) => {
  res.send('🏗️ Vistru API is running. Navigate to <a href="/api/health">/api/health</a> for status.');
});

// ── API Routes ──
app.use('/api/arbitration', arbitrationRoutes);
app.use('/api/auth',     authRoutes);
app.use('/api/client',   clientRoutes);
app.use('/api/engineer', engineerRoutes);
app.use('/api/supplier', supplierRoutes);
app.use('/api/lawyer',   lawyerRoutes);
app.use('/api/escrow',   escrowRoutes);
app.use('/api/project',  projectRoutes);
app.use('/api/cctv',     cctvRoutes);
app.use('/api/admin',    adminRoutes);

// ── Health check ──
app.get('/api/health', (req, res) => {
  res.json({
    status  : 'ok',
    service : 'Vistru API',
    version : '1.0.0',
    env     : process.env.NODE_ENV
  });
});

// ── 404 handler ──
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ── Global error handler ──
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    error   : process.env.NODE_ENV === 'production'
              ? 'An internal server error occurred'
              : err.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// ── Start server ──
app.listen(PORT, async () => {
  console.log(`\n🏗️  Vistru API running on port ${PORT}`);
  console.log(`   Environment : ${process.env.NODE_ENV}`);
  const dbName = process.env.DB_NAME || (process.env.DATABASE_URL ? 'Cloud DB' : 'unknown');
  const dbHost = process.env.DB_HOST || (process.env.DATABASE_URL ? 'Neon' : 'localhost');
  console.log(`   Database    : ${dbName}@${dbHost}`);

  // Test DB connection
  try {
    await db.query('SELECT NOW()');
    console.log(`   DB Status   : ✅ Connected\n`);
  } catch (err) {
    console.error(`   DB Status   : ❌ Failed — ${err.message}\n`);
  }
});

module.exports = app;
