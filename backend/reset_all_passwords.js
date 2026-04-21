// reset_all_passwords.js
require('dotenv').config();
const b = require('bcryptjs');
const { pool } = require('./src/config/db');

async function reset() {
  const pass = 'Vistru@2025';
  const hash = b.hashSync(pass, 12);
  console.log('New Hash:', hash);
  
  try {
    await pool.query('UPDATE users SET password_hash = $1', [hash]);
    console.log('✅ All passwords updated successfully.');
    
    // Quick verify
    const { rows } = await pool.query('SELECT password_hash FROM users LIMIT 1');
    const match = b.compareSync(pass, rows[0].password_hash);
    console.log('Verification check:', match);
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
reset();
