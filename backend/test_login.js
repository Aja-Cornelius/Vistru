const bcrypt = require('bcryptjs');

const pass = 'Vistru@2025';
const hash = '$2a$12$vWE9.8Xt7Vrm1BTcTBCWkuGBdbJGOjSWgV3qErH9T8Jin8ZvvQ3rFG';

async function test() {
  const match = await bcrypt.compare(pass, hash);
  console.log('Match:', match);
}
test();
