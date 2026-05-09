const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const games = await prisma.game.findMany({
      select: { id: true, homeTeamId: true, awayTeamId: true, status: true, quarter: true },
      take: 10,
    });
    console.log('Games in DB:', games);
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
