const b = require('bcryptjs');
const p = 'Vistru@2025';
const h = b.hashSync(p, 12);
console.log('Hash:', h);
console.log('Sync Match:', b.compareSync(p, h));
b.compare(p, h).then(m => console.log('Async Match:', m));
