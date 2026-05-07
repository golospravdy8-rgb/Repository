const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const season = await prisma.season.findFirst({ where: { ageGroup: 'older', isActive: true } });
  console.log('Season:', season?.id);

  // Raw BoxScore data — no aggregation
  const boxScores = await prisma.boxScore.findMany({
    where: { game: { seasonId: season?.id } },
    include: { player: true, game: true },
    orderBy: { playerId: 'asc' }
  });

  console.log('\nRAW BoxScore (first 10):');
  boxScores.slice(0, 10).forEach(bs => {
    console.log(`  player=${bs.playerId} game=${bs.gameId} pts=${bs.points} reb=${bs.rebounds} ast=${bs.assists}`);
  });

  // Check: are ALL BoxScore rows identical?
  const unique = new Set(boxScores.map(bs => `${bs.points}-${bs.rebounds}-${bs.assists}`));
  console.log('\nUnique stat combinations:', unique.size);
  console.log('Values:', [...unique]);

  // If only 1 unique combination — data is corrupted or was bulk-set
  if (unique.size === 1) {
    console.log('❌ ALL BOXSCORE ROWS HAVE IDENTICAL STATS — data was bulk-inserted with same values');
    console.log('Root cause: All players got same stats (6-2-1) — likely from backup restore or test data');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
