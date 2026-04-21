require('dotenv').config();
const db = require('./src/config/db');
async function check() {
  try {
    const { rows } = await db.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
    console.log('TABLES:', rows.map(r => r.table_name));
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}
check();
