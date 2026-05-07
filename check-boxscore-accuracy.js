const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Take ONE player and show their events vs their boxscore
  const events = await prisma.gameEvent.findMany({
    where: { gameId: 159 },
    orderBy: { createdAt: 'asc' }
  });

  // Group by player
  const byPlayer = {};
  events.forEach(e => {
    if (!byPlayer[e.playerId]) byPlayer[e.playerId] = [];
    byPlayer[e.playerId].push(e);
  });

  // Pick first player
  const firstPlayerId = Object.keys(byPlayer)[0];
  const playerEvents = byPlayer[firstPlayerId];

  console.log(`Player ${firstPlayerId} events (${playerEvents.length} total):`);
  const typeCounts = {};
  playerEvents.forEach(e => {
    typeCounts[e.type] = (typeCounts[e.type] || 0) + 1;
  });
  console.log('By type:', typeCounts);

  // Expected stats from events
  const pointsEvents = playerEvents.filter(e => e.type === 'POINTS');
  const totalPoints = pointsEvents.reduce((s, e) => s + (e.points || 0), 0);
  const rebounds = playerEvents.filter(e => e.type === 'REBOUND' || e.type === 'REBOUND_DEF' || e.type === 'REBOUND_OFF').length;
  const assists = playerEvents.filter(e => e.type === 'ASSIST').length;

  console.log('\nExpected from events:');
  console.log('  points:', totalPoints);
  console.log('  rebounds:', rebounds);
  console.log('  assists:', assists);

  // Actual boxscore
  const bs = await prisma.boxScore.findFirst({ where: { gameId: 159, playerId: Number(firstPlayerId) } });
  console.log('\nActual BoxScore:');
  console.log('  points:', bs?.points);
  console.log('  rebounds:', bs?.rebounds);
  console.log('  assists:', bs?.assists);

  console.log('\nMatch:',
    bs?.points === totalPoints && bs?.rebounds === rebounds && bs?.assists === assists ? '✅ CORRECT' : '❌ MISMATCH'
  );
}

main().catch(console.error).finally(() => prisma.$disconnect());
