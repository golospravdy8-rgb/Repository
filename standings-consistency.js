const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const standings = await prisma.standing.findMany({
    include: { team: true },
    orderBy: { wins: 'desc' }
  });

  const season = await prisma.season.findFirst({ where: { ageGroup: 'older', isActive: true } });
  const games = await prisma.game.findMany({
    where: { seasonId: season.id, status: 'FINAL' }
  });

  console.log('=== STANDINGS CONSISTENCY ===\n');
  let allOk = true;

  for (const s of standings) {
    const homeWins = games.filter(g => g.homeTeamId === s.teamId && g.homeScore > g.awayScore).length;
    const awayWins = games.filter(g => g.awayTeamId === s.teamId && g.awayScore > g.homeScore).length;
    const actualWins = homeWins + awayWins;
    const totalGames = games.filter(g => g.homeTeamId === s.teamId || g.awayTeamId === s.teamId).length;
    const actualLosses = totalGames - actualWins;

    const winsOk = s.wins === actualWins;
    const lossesOk = s.losses === actualLosses;

    if (!winsOk || !lossesOk) allOk = false;

    console.log(`${s.team.name}: DB(${s.wins}W-${s.losses}L) vs Actual(${actualWins}W-${actualLosses}L) ${winsOk && lossesOk ? '✅' : '❌'}`);
  }

  console.log('\nStandings consistent:', allOk ? '✅' : '❌ NEEDS RECALC');
}

main().catch(console.error).finally(() => prisma.$disconnect());
