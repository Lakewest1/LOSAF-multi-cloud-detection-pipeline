const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

p.rawEvent.deleteMany({})
  .then((r) => {
    console.log('Cleared rows:', r.count);
    return p.$disconnect();
  })
  .catch((e) => {
    console.error('ERROR:', e.message);
    return p.$disconnect();
  });