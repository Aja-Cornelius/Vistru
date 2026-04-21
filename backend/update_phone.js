require('dotenv').config();
const db = require('./src/config/db');
async function update() {
  try {
    await db.query("UPDATE users SET phone = '2347012009012' WHERE email = 'adaeze@demo.vistru.ng'");
    console.log('✅ Phone number updated for Adaeze');
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}
update();
