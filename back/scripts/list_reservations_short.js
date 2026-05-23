const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  try {
    const reservations = await prisma.reservation.findMany({
      include: { device: true, operator: true },
      orderBy: { id: 'asc' },
    });

    for (const r of reservations) {
      console.log('---');
      console.log(`id: ${r.id}`);
      console.log(`object: ${r.object}`);
      console.log(`requestedBy: ${r.requestedBy}`);
      console.log(`email: ${r.email ?? '(none)'}`);
      console.log(`startAt: ${r.startAt}`);
      console.log(`status: ${r.status}`);
      console.log(`penalty: ${r.penalty}`);
      console.log(`active: ${r.active}`);
      console.log(`createdAt: ${r.createdAt}`);
    }
  } catch (err) {
    console.error('Error querying reservations:', err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
