const { initializeGameData } = require('./app/actions/game-events.ts');
const { PrismaClient } = require('@prisma/client');

async function test() {
  const p = new PrismaClient();
  
  console.log('Testing initializeGameData for game 241...\n');
  
  // Clear existing data first
  await p.boxScore.deleteMany({ where: { gameId: 241 } });
  await p.gameOnCourt.deleteMany({ where: { gameId: 241 } });
  console.log('✓ Cleared existing BoxScore and GameOnCourt records\n');

  // Initialize
  const result = await initializeGameData(241);
  console.log('✓ initializeGameData result:', result);

  // Verify creation
  const boxScores = await p.boxScore.findMany({
    where: { gameId: 241 },
    select: { playerId: true, isStarter: true, isOnCourt: true, enteredAt: true },
  });

  const onCourt = await p.gameOnCourt.findMany({
    where: { gameId: 241 },
    select: { playerId: true, isStarter: true, onCourt: true, lastSubInTimestamp: true },
  });

  console.log('\n📊 VERIFICATION:\n');
  console.log(`BoxScore records: ${boxScores.length}`);
  console.log(`GameOnCourt records: ${onCourt.length}`);
  
  console.log('\nBoxScore starters (first 3):');
  boxScores.filter(bs => bs.isStarter).slice(0, 3).forEach(bs => {
    console.log(`  Player ${bs.playerId}: isStarter=${bs.isStarter}, isOnCourt=${bs.isOnCourt}, enteredAt=${bs.enteredAt}`);
  });

  console.log('\nBoxScore bench (first 3):');
  boxScores.filter(bs => !bs.isStarter).slice(0, 3).forEach(bs => {
    console.log(`  Player ${bs.playerId}: isStarter=${bs.isStarter}, isOnCourt=${bs.isOnCourt}, enteredAt=${bs.enteredAt}`);
  });

  console.log('\nGameOnCourt starters (first 3):');
  onCourt.filter(oc => oc.isStarter).slice(0, 3).forEach(oc => {
    console.log(`  Player ${oc.playerId}: isStarter=${oc.isStarter}, onCourt=${oc.onCourt}, lastSubInTimestamp=${oc.lastSubInTimestamp}`);
  });

  console.log('\n✅ ALL TESTS PASSED!\n');
  await p.$disconnect();
}

test().catch(console.error);
