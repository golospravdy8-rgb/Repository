const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function recalcStandingsForSeason(seasonId) {
  const games = await prisma.game.findMany({
    where: { seasonId, status: 'FINAL' }
  });

  const teamStats = {};
  for (const game of games) {
    if (!teamStats[game.homeTeamId]) teamStats[game.homeTeamId] = { wins: 0, losses: 0, gamesPlayed: 0, pointsFor: 0, pointsAgainst: 0 };
    if (!teamStats[game.awayTeamId]) teamStats[game.awayTeamId] = { wins: 0, losses: 0, gamesPlayed: 0, pointsFor: 0, pointsAgainst: 0 };

    teamStats[game.homeTeamId].gamesPlayed++;
    teamStats[game.awayTeamId].gamesPlayed++;
    teamStats[game.homeTeamId].pointsFor += game.homeScore;
    teamStats[game.homeTeamId].pointsAgainst += game.awayScore;
    teamStats[game.awayTeamId].pointsFor += game.awayScore;
    teamStats[game.awayTeamId].pointsAgainst += game.homeScore;

    if (game.homeScore > game.awayScore) {
      teamStats[game.homeTeamId].wins++;
      teamStats[game.awayTeamId].losses++;
    } else {
      teamStats[game.awayTeamId].wins++;
      teamStats[game.homeTeamId].losses++;
    }
  }

  for (const [teamId, stats] of Object.entries(teamStats)) {
    const existing = await prisma.standing.findFirst({
      where: { teamId: Number(teamId), seasonId }
    });

    if (existing) {
      await prisma.standing.update({
        where: { id: existing.id },
        data: stats
      });
    } else {
      await prisma.standing.create({
        data: { teamId: Number(teamId), seasonId, ...stats }
      });
    }
  }

  console.log('Recalculated standings for season', seasonId);
}

async function main() {
  const season = await prisma.season.findFirst({ where: { ageGroup: 'older', isActive: true } });
  await recalcStandingsForSeason(season.id);

  // Verify
  const standings = await prisma.standing.findMany({
    where: { seasonId: season.id },
    include: { team: true },
    orderBy: { wins: 'desc' }
  });

  console.log('\nAfter recalc:');
  standings.forEach(s => {
    console.log(`  ${s.team.name}: ${s.wins}W-${s.losses}L`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
