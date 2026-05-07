const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const events = await prisma.gameEvent.findMany({
    where: { gameId: 159 },
    orderBy: { createdAt: 'asc' }
  });

  console.log('Total events:', events.length);
  console.log('By player (first 5):');
  const byPlayer = {};
  events.forEach(e => {
    if (!byPlayer[e.playerId]) byPlayer[e.playerId] = 0;
    byPlayer[e.playerId]++;
  });
  Object.entries(byPlayer).slice(0, 5).forEach(([pid, count]) => {
    console.log(`  player ${pid}: ${count} events`);
  });

  // Show all unique player event counts
  console.log('\nAll players event distribution:');
  const sorted = Object.entries(byPlayer).sort((a, b) => b[1] - a[1]);
  sorted.forEach(([pid, count]) => {
    console.log(`  player ${pid}: ${count} events`);
  });

  // Check if all players have same event count
  const counts = Object.values(byPlayer);
  const allSame = counts.every(c => c === counts[0]);
  console.log('\nAll players have same event count:', allSame ? '❌ YES (suspicious)' : '✅ NO (varied)');
}

main().catch(console.error).finally(() => prisma.$disconnect());
