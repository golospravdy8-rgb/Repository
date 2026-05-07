const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Show what we're about to change
  const games = await prisma.game.findMany({ where: { seasonId: 2, stage: null } });
  console.log('Games with null stage:');
  games.forEach(g => console.log(`  id=${g.id} status=${g.status} homeScore=${g.homeScore}:${g.awayScore}`));

  // These are group stage games — set stage properly
  const result = await prisma.game.updateMany({
    where: { seasonId: 2, stage: null },
    data: { stage: 'group' }
  });
  console.log('\nUpdated:', result.count, 'games');

  // Verify
  const after = await prisma.game.findMany({ where: { seasonId: 2 } });
  console.log('\nAfter update:');
  after.forEach(g => console.log(`  id=${g.id} stage=${g.stage}`));
}

main().catch(console.error).finally(() => prisma.$disconnect());
