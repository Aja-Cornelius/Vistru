// ═══════════════════════════════════════════════════════════
//  VISTRU — PostgreSQL Database Connection
//  src/config/db.js
// ═══════════════════════════════════════════════════════════
const { Pool } = require('pg');

const poolConfig = process.env.DATABASE_URL 
  ? { connectionString: process.env.DATABASE_URL }
  : {
      host     : process.env.DB_HOST     || 'localhost',
      port     : parseInt(process.env.DB_PORT) || 5432,
      database : process.env.DB_NAME     || 'vistru_db',
      user     : process.env.DB_USER     || 'vistru_user',
      password : process.env.DB_PASSWORD || '',
    };

const pool = new Pool({
  ...poolConfig,
  max      : 20,
  idleTimeoutMillis : 30000,
  connectionTimeoutMillis : 60000, // 60 seconds for serverless wake-up
  keepAlive: true,
  ssl      : (process.env.NODE_ENV === 'production' || process.env.DATABASE_URL?.includes('neon.tech'))
             ? { rejectUnauthorized: false }
             : false
});

pool.on('error', (err) => {
  console.error('Unexpected DB pool error:', err);
});

module.exports = {
  query : (text, params) => pool.query(text, params),
  pool
};
