// src/config/migrate.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('./db');

async function runMigrations() {
  console.log('🚀 Checking database schema...');
  
  try {
    const schemaPath = path.join(__dirname, '../../../database/migrations/001_full_schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');

    // Split by semicolon and run separately to avoid long-transaction issues or single-query limits
    // but the full file is better for psql compatibility. 
    // For simplicity, we'll try running the full file.
    await pool.query(sql);
    
    console.log('✅ Migrations/Schema check completed successfully.');
  } catch (err) {
    if (err.message.includes('already exists')) {
       console.log('ℹ️ Schema already partially or fully exists. Skipping...');
       return;
    }
    console.error('❌ Migration failed:', err.message);
    throw err;
  }
}

if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { runMigrations };
