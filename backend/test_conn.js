const { Client } = require('pg');
const url = 'postgresql://neondb_owner:npg_I4cpius7emtn@ep-shiny-queen-an3vxm5k.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require';

const client = new Client({
  connectionString: url,
  ssl: { rejectUnauthorized: false }
});

async function test() {
  try {
    await client.connect();
    console.log('Connected!');
    const res = await client.query("SELECT email, password_hash FROM users WHERE email = 'admin@vistru.ng'");
    console.log(res.rows);
    await client.end();
  } catch (err) {
    console.error('FAIL:', err);
  }
}
test();
