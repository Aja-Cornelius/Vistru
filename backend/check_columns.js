require('dotenv').config();
const db = require('./src/config/db');
async function check() {
  try {
    const { rows } = await db.query("SELECT column_name, is_nullable, data_type FROM information_schema.columns WHERE table_name = 'cctv_reports'");
    console.log('COLUMNS:', JSON.stringify(rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}
check();
