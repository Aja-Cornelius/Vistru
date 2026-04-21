// fix_schema.js
require('dotenv').config();
const { pool } = require('./src/config/db');

async function fix() {
  console.log('Fixing schema column lengths...');
  try {
    await pool.query('ALTER TABLE users ALTER COLUMN email_otp TYPE VARCHAR(255)');
    console.log('✅ email_otp column expanded.');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
fix();
