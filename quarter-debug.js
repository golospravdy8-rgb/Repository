const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const events = await prisma.gameEvent.findMany({
    where: { gameId: 159, type: 'POINTS' },
    orderBy: { createdAt: 'asc' }
  });

  const byQuarter = { 1: 0, 2: 0, 3: 0, 4: 0 };
  events.forEach(e => {
    if (e.quarter >= 1 && e.quarter <= 4) byQuarter[e.quarter] += (e.points || 0);
  });

  console.log('Points by quarter:', byQuarter);
  console.log('Events with quarter=null:', events.filter(e => !e.quarter).length);
  console.log('Events with quarter=1:', events.filter(e => e.quarter === 1).length);
  console.log('Events with quarter=2:', events.filter(e => e.quarter === 2).length);
  console.log('Events with quarter=3:', events.filter(e => e.quarter === 3).length);
  console.log('Events with quarter=4:', events.filter(e => e.quarter === 4).length);

  // Root cause: were quarters tracked correctly?
  if (byQuarter[1] === 48 && byQuarter[2] === 0 && byQuarter[3] === 0 && byQuarter[4] === 0) {
    console.log('\n❌ ALL POINTS IN Q1 — quarter field was not updated during game (all events saved with quarter=1)');
    console.log('Root cause: game.quarter was never changed from 1 during live tracking');
  }

  // Show sample events
  console.log('\nSample events (first 5):');
  events.slice(0, 5).forEach(e => {
    console.log(`  quarter=${e.quarter} points=${e.points} type=${e.type}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
