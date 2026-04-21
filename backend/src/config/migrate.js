// src/config/migrate.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('./db');

async function runMigrations() {
  console.log('🚀 Starting migrations...');
  
  try {
    const schemaPath = path.join(__dirname, '../../../database/migrations/001_full_schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');

    console.log('📄 Reading schema file...');
    
    // We can run the whole file as one query if it doesn't contain psql-specific commands like \c
    // Vistru schema seems to be standard SQL.
    await pool.query(sql);
    
    console.log('✅ Migrations completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

runMigrations();
