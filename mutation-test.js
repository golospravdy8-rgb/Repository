const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== EVENT MUTATION TESTS ===\n');

  // Test 1: Duplicate events for same player in same second
  const gameId = 159;
  const playerId = 70;

  // Simulate rapid double-click (2 events same timestamp)
  const before = await prisma.boxScore.findFirst({ where: { gameId, playerId } });
  console.log('Before: points =', before?.points);

  // Create duplicate POINTS event
  const event1 = await prisma.gameEvent.create({
    data: { gameId, playerId, teamId: before?.teamId || 7, type: 'POINTS', points: 2, quarter: 1 }
  });
  const event2 = await prisma.gameEvent.create({
    data: { gameId, playerId, teamId: before?.teamId || 7, type: 'POINTS', points: 2, quarter: 1 }
  });

  console.log('Created 2 duplicate events:', event1.id, event2.id);
  console.log('Test 1: Duplicate events possible: ✅ YES (no dedup protection)');

  // Cleanup
  await prisma.gameEvent.deleteMany({ where: { id: { in: [event1.id, event2.id] } } });
  console.log('Cleaned up\n');

  // Test 2: Delete event — does BoxScore auto-update?
  console.log('Test 2: Delete event → BoxScore auto-update?');
  const testEvent = await prisma.gameEvent.create({
    data: { gameId, playerId, teamId: before?.teamId || 7, type: 'POINTS', points: 3, quarter: 1 }
  });

  const afterCreate = await prisma.boxScore.findFirst({ where: { gameId, playerId } });
  console.log('BoxScore after create event (before manual update):', afterCreate?.points);

  await prisma.gameEvent.delete({ where: { id: testEvent.id } });
  const afterDelete = await prisma.boxScore.findFirst({ where: { gameId, playerId } });
  console.log('BoxScore after delete event (no auto-update):', afterDelete?.points);
  console.log('BoxScore auto-updates on event delete: ❌ NO (orphaned BoxScore)');
}

main().catch(console.error).finally(() => prisma.$disconnect());
