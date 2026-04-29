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

// Mask password for safer logging
const safeUrl = process.env.DATABASE_URL 
  ? process.env.DATABASE_URL.replace(/:([^@]+)@/, ':****@') 
  : `${poolConfig.user}@${poolConfig.host}`;

console.log(`📡 Attempting DB connection to: ${safeUrl}`);

const pool = new Pool({
  ...poolConfig,
  max      : 10, // Reduced for free tier compatibility
  idleTimeoutMillis : 30000,
  connectionTimeoutMillis : 10000, 
  ssl      : (process.env.NODE_ENV === 'production' || process.env.DATABASE_URL?.includes('neon.tech') || process.env.DATABASE_URL?.includes('supabase.co'))
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
