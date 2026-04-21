// src/config/seed.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('./db');

async function runSeed() {
  console.log('🌱 Seeding database...');
  
  try {
    const seedPath = path.join(__dirname, '../../../database/seeds/demo_data.sql');
    const sql = fs.readFileSync(seedPath, 'utf8');

    await pool.query(sql);
    
    console.log('✅ Seeding completed.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  }
}

runSeed();
