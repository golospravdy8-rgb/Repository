const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const games = await prisma.game.findMany({ where: { seasonId: 2 } });
  const byStage = {};
  games.forEach(g => {
    const s = g.stage || 'NULL';
    byStage[s] = (byStage[s] || 0) + 1;
  });
  console.log('Games by stage:', byStage);
}

main().catch(console.error).finally(() => prisma.$disconnect());
