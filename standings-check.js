const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== STANDINGS DEEP CHECK ===\n');

  // What's in standings table?
  const standings = await prisma.standing.findMany({
    include: { team: true, season: true },
    orderBy: { wins: 'desc' }
  });

  console.log('Total standing records:', standings.length);
  standings.forEach(s => {
    console.log(`  ${s.team.name}: W=${s.wins} L=${s.losses} GP=${s.gamesPlayed} PF=${s.pointsFor} PA=${s.pointsAgainst}`);
  });

  // Verify standings match actual game results
  const season = await prisma.season.findFirst({ where: { ageGroup: 'older', isActive: true } });
  const finalGames = await prisma.game.findMany({
    where: { seasonId: season?.id, status: 'FINAL' },
    include: { homeTeam: true, awayTeam: true }
  });

  console.log('\n=== ACTUAL GAME RESULTS ===');
  finalGames.forEach(g => {
    const winner = g.homeScore > g.awayScore ? g.homeTeam.name : g.awayTeam.name;
    console.log(`  ${g.homeTeam.name} ${g.homeScore}:${g.awayScore} ${g.awayTeam.name} → winner: ${winner}`);
  });

  // Check if standings match games
  console.log('\n=== STANDINGS vs GAMES RECONCILIATION ===');
  for (const standing of standings) {
    const homeWins = finalGames.filter(g => g.homeTeamId === standing.teamId && g.homeScore > g.awayScore).length;
    const awayWins = finalGames.filter(g => g.awayTeamId === standing.teamId && g.awayScore > g.homeScore).length;
    const actualWins = homeWins + awayWins;
    const actualLosses = finalGames.filter(g =>
      (g.homeTeamId === standing.teamId || g.awayTeamId === standing.teamId) && actualWins !== (homeWins + awayWins)
    ).length;

    const winsMatch = standing.wins === actualWins;
    console.log(`  ${standing.team.name}: DB wins=${standing.wins} actual wins=${actualWins} ${winsMatch ? '✅' : '❌ MISMATCH'}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
