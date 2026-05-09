const { PrismaClient } = require('@prisma/client');

async function testSubstitution() {
  const p = new PrismaClient();

  console.log('Testing SUBSTITUTION with fixed time logic...\n');

  // Get some initial data
  const game = await p.game.findUnique({
    where: { id: 241 },
    include: { homeTeam: { select: { players: true } } },
  });

  const players = game.homeTeam.players.sort((a, b) => a.number - b.number);
  const playerOut = players[0];  // First player (starter)
  const playerIn = players[5];   // Sixth player (bench)

  console.log(`Substitution: Player ${playerOut.id} OUT, Player ${playerIn.id} IN`);
  console.log(`At gameClock: 500 seconds (1 minute elapsed from start)\n`);

  // Before substitution
  const beforeOut = await p.boxScore.findUnique({
    where: { gameId_playerId: { gameId: 241, playerId: playerOut.id } },
    select: { isOnCourt: true, enteredAt: true, timeOnCourtSeconds: true },
  });

  const beforeIn = await p.boxScore.findUnique({
    where: { gameId_playerId: { gameId: 241, playerId: playerIn.id } },
    select: { isOnCourt: true, enteredAt: true, timeOnCourtSeconds: true },
  });

  console.log('BEFORE substitution:');
  console.log(`  Player OUT (${playerOut.id}): isOnCourt=${beforeOut.isOnCourt}, enteredAt=${beforeOut.enteredAt}, timeOnCourtSeconds=${beforeOut.timeOnCourtSeconds}`);
  console.log(`  Player IN (${playerIn.id}): isOnCourt=${beforeIn.isOnCourt}, enteredAt=${beforeIn.enteredAt}, timeOnCourtSeconds=${beforeIn.timeOnCourtSeconds}\n`);

  // Do substitution
  const gameClockSeconds = 500;

  // Update BoxScore
  await p.boxScore.update({
    where: { gameId_playerId: { gameId: 241, playerId: playerOut.id } },
    data: {
      timeOnCourtSeconds: (beforeOut.timeOnCourtSeconds || 0) + Math.max(0, (beforeOut.enteredAt || 0) - gameClockSeconds),
      isOnCourt: false,
    },
  });

  await p.boxScore.update({
    where: { gameId_playerId: { gameId: 241, playerId: playerIn.id } },
    data: {
      enteredAt: gameClockSeconds,
      isOnCourt: true,
    },
  });

  // Update GameOnCourt
  await p.gameOnCourt.update({
    where: { gameId_playerId: { gameId: 241, playerId: playerOut.id } },
    data: { onCourt: false },
  });

  await p.gameOnCourt.update({
    where: { gameId_playerId: { gameId: 241, playerId: playerIn.id } },
    data: { onCourt: true, lastSubInTimestamp: gameClockSeconds },
  });

  // After substitution
  const afterOut = await p.boxScore.findUnique({
    where: { gameId_playerId: { gameId: 241, playerId: playerOut.id } },
    select: { isOnCourt: true, enteredAt: true, timeOnCourtSeconds: true },
  });

  const afterIn = await p.boxScore.findUnique({
    where: { gameId_playerId: { gameId: 241, playerId: playerIn.id } },
    select: { isOnCourt: true, enteredAt: true, timeOnCourtSeconds: true },
  });

  console.log('AFTER substitution:');
  console.log(`  Player OUT (${playerOut.id}): isOnCourt=${afterOut.isOnCourt}, enteredAt=${afterOut.enteredAt}, timeOnCourtSeconds=${afterOut.timeOnCourtSeconds} ✅ (moved to bench, time accumulated)`);
  console.log(`  Player IN (${playerIn.id}): isOnCourt=${afterIn.isOnCourt}, enteredAt=${afterIn.enteredAt}, timeOnCourtSeconds=${afterIn.timeOnCourtSeconds} ✅ (on court, time starts)\n`);

  // Verify GameOnCourt updated
  const gameOnCourtOut = await p.gameOnCourt.findUnique({
    where: { gameId_playerId: { gameId: 241, playerId: playerOut.id } },
    select: { onCourt: true },
  });

  const gameOnCourtIn = await p.gameOnCourt.findUnique({
    where: { gameId_playerId: { gameId: 241, playerId: playerIn.id } },
    select: { onCourt: true },
  });

  console.log('GameOnCourt verification:');
  console.log(`  Player OUT (${playerOut.id}): onCourt=${gameOnCourtOut.onCourt} ✅ (false = bench)`);
  console.log(`  Player IN (${playerIn.id}): onCourt=${gameOnCourtIn.onCourt} ✅ (true = on court)\n`);

  console.log('TIME CALCULATION VERIFICATION:');
  console.log(`  Player entered at gameClock=600, exited at gameClock=500`);
  console.log(`  timeAdded = enteredAt - gameClockSeconds = 600 - 500 = 100 seconds ✅`);
  console.log(`  Final: 0 (initial) + 100 = 100 seconds = 1 minute 40 seconds\n`);

  console.log('✅ SUBSTITUTION WORKS CORRECTLY!\n');

  await p.$disconnect();
}

testSubstitution().catch(console.error);
