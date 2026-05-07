const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const seasons = await prisma.season.findMany({
    include: { _count: { select: { games: true } } }
  });

  console.log('=== ALL SEASONS ===');
  seasons.forEach(s => {
    console.log(`  ID=${s.id} ageGroup=${s.ageGroup} isActive=${s.isActive} games=${s._count.games}`);
  });

  // U-14 season
  const u14season = await prisma.season.findFirst({ where: { ageGroup: 'younger', isActive: true } });
  console.log('\n=== U-14 SEASON ===');
  console.log('Found:', u14season ? `ID=${u14season.id}` : '❌ NOT FOUND');

  if (u14season) {
    const u14games = await prisma.game.count({ where: { seasonId: u14season.id } });
    const u14boxscores = await prisma.boxScore.count({ where: { game: { seasonId: u14season.id } } });
    console.log('Games:', u14games);
    console.log('BoxScore rows:', u14boxscores);
  }

  // U-16 season
  const u16season = await prisma.season.findFirst({ where: { ageGroup: 'older', isActive: true } });
  console.log('\n=== U-16 SEASON ===');
  console.log('Found:', u16season ? `ID=${u16season.id}` : '❌ NOT FOUND');

  if (u16season) {
    const u16games = await prisma.game.count({ where: { seasonId: u16season.id } });
    const u16boxscores = await prisma.boxScore.count({ where: { game: { seasonId: u16season.id } } });
    console.log('Games:', u16games);
    console.log('BoxScore rows:', u16boxscores);
  }

  // Check cross-contamination
  console.log('\n=== CROSS-CONTAMINATION CHECK ===');
  const allBoxScores = await prisma.boxScore.findMany({
    include: { game: { include: { season: true } } }
  });

  const u14inU16 = allBoxScores.filter(bs => bs.game.season.ageGroup === 'younger' && bs.game.seasonId === u16season?.id);
  const u16inU14 = allBoxScores.filter(bs => bs.game.season.ageGroup === 'older' && bs.game.seasonId === u14season?.id);

  console.log('U-14 data in U-16 season:', u14inU16.length === 0 ? '✅ CLEAN' : `❌ ${u14inU16.length} rows contaminated`);
  console.log('U-16 data in U-14 season:', u16inU14.length === 0 ? '✅ CLEAN' : `❌ ${u16inU14.length} rows contaminated`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
