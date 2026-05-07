const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Recalculating BoxScore for game/159...\n');

  // Get all events for game 159
  const events = await prisma.gameEvent.findMany({
    where: { gameId: 159 },
  });

  // Group by player
  const playerStats = {};
  events.forEach(e => {
    if (!e.playerId) return;
    if (!playerStats[e.playerId]) {
      playerStats[e.playerId] = { points: 0, rebounds: 0, assists: 0, steals: 0, blocks: 0, turnovers: 0, missedFg2: 0, missedFg3: 0, missedFt: 0 };
    }

    if (e.type === 'POINTS') playerStats[e.playerId].points += (e.points || 0);
    if (e.type === 'REBOUND' || e.type === 'REBOUND_DEF' || e.type === 'REBOUND_OFF') playerStats[e.playerId].rebounds += 1;
    if (e.type === 'ASSIST') playerStats[e.playerId].assists += 1;
    if (e.type === 'STEAL') playerStats[e.playerId].steals += 1;
    if (e.type === 'BLOCK') playerStats[e.playerId].blocks += 1;
    if (e.type === 'TURNOVER') playerStats[e.playerId].turnovers += 1;
    if (e.type === 'MISSED_FG2') playerStats[e.playerId].missedFg2 += 1;
    if (e.type === 'MISSED_FG3') playerStats[e.playerId].missedFg3 += 1;
    if (e.type === 'MISSED_FT') playerStats[e.playerId].missedFt += 1;
  });

  // Calculate efficiency for each player
  const calculateEfficiency = (stats) => {
    const positive = stats.points + stats.rebounds + stats.assists + stats.steals + stats.blocks;
    const negative = stats.missedFg2 + stats.missedFg3 + stats.missedFt + stats.turnovers;
    return positive - negative;
  };

  // Update BoxScore for each player
  let updated = 0;
  for (const [playerId, stats] of Object.entries(playerStats)) {
    const efficiency = calculateEfficiency(stats);
    const pid = parseInt(playerId);

    const existing = await prisma.boxScore.findFirst({
      where: { gameId: 159, playerId: pid }
    });

    if (existing) {
      await prisma.boxScore.update({
        where: { id: existing.id },
        data: {
          points: stats.points,
          rebounds: stats.rebounds,
          assists: stats.assists,
          steals: stats.steals,
          blocks: stats.blocks,
          turnovers: stats.turnovers,
          missedFg2: stats.missedFg2,
          missedFg3: stats.missedFg3,
          missedFt: stats.missedFt,
          efficiency
        }
      });
      updated++;
    }
  }

  console.log(`Updated ${updated} BoxScore records\n`);

  // Show new stats
  const newBoxScores = await prisma.boxScore.findMany({
    where: { gameId: 159 },
    orderBy: { playerId: 'asc' }
  });

  console.log('New BoxScore stats (first 5):');
  newBoxScores.slice(0, 5).forEach(bs => {
    console.log(`  player ${bs.playerId}: pts=${bs.points} reb=${bs.rebounds} ast=${bs.assists} eff=${bs.efficiency}`);
  });

  // Check uniqueness
  const unique = new Set(newBoxScores.map(bs => `${bs.points}-${bs.rebounds}-${bs.assists}`));
  console.log(`\nUnique stat combinations: ${unique.size}`);
  console.log('Values:', [...unique].slice(0, 5));
}

main().catch(console.error).finally(() => prisma.$disconnect());
