const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://neondb_owner:npg_I4cpius7emtn@ep-shiny-queen-an3vxm5k.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require'
});
client.connect()
  .then(() => console.log('RAW CONNECTED'))
  .catch(err => console.error('RAW FAIL:', err))
  .finally(() => client.end());
