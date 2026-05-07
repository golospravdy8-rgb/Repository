const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const season = await prisma.season.findFirst({ where: { ageGroup: 'older', isActive: true } });
  const games = await prisma.game.findMany({
    where: { seasonId: season.id, status: 'FINAL' },
    include: { homeTeam: true, awayTeam: true }
  });

  console.log('=== CONSISTENCY CHECK: Game scores vs BoxScore totals ===\n');

  let allOk = true;
  for (const game of games) {
    const boxScores = await prisma.boxScore.findMany({ where: { gameId: game.id } });
    const homeTotal = boxScores.filter(bs => bs.teamId === game.homeTeamId).reduce((s, bs) => s + bs.points, 0);
    const awayTotal = boxScores.filter(bs => bs.teamId === game.awayTeamId).reduce((s, bs) => s + bs.points, 0);

    const homeOk = homeTotal === game.homeScore;
    const awayOk = awayTotal === game.awayScore;

    if (!homeOk || !awayOk) allOk = false;

    console.log(`Game ${game.id}: ${game.homeTeam.name} vs ${game.awayTeam.name}`);
    console.log(`  Game score: ${game.homeScore}:${game.awayScore}`);
    console.log(`  BoxScore totals: ${homeTotal}:${awayTotal}`);
    console.log(`  Match: ${homeOk && awayOk ? '✅' : '❌ MISMATCH'}`);
  }

  console.log('\nOverall consistency:', allOk ? '✅ ALL MATCH' : '❌ MISMATCHES FOUND');
}

main().catch(console.error).finally(() => prisma.$disconnect());
