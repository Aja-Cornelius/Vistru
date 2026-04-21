// fix_passwords.js
require('dotenv').config();
const { pool } = require('./src/config/db');

async function fix() {
  const hash = '$2a$12$vWE9.8Xt7Vrm1BTcTBCWkuGBdbJGOjSWgV3qErH9T8Jin8ZvvQ3rFG';
  console.log('Updating passwords...');
  try {
    await pool.query('UPDATE users SET password_hash = $1', [hash]);
    console.log('✅ Passwords updated to Vistru@2025');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
fix();
