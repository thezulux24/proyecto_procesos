const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  try {
    const reservations = await prisma.reservation.findMany({
      include: { device: true, operator: true },
      orderBy: { id: 'asc' },
    });

    console.log(JSON.stringify(reservations, null, 2));
  } catch (err) {
    console.error('Error querying reservations:', err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
