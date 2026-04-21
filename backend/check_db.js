// check_db.js
require('dotenv').config();
const { pool } = require('./src/config/db');

async function check() {
  try {
    const { rows } = await pool.query('SELECT email, password_hash FROM users');
    console.log(JSON.stringify(rows, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
check();
