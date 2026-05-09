const { PrismaClient } = require('@prisma/client');

async function initializeGameData(gameId) {
  const prisma = new PrismaClient();
  try {
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: {
        homeTeam: { include: { players: true } },
        awayTeam: { include: { players: true } },
      },
    });

    if (!game) throw new Error("Game not found");

    const homePlayers = game.homeTeam.players.sort((a, b) => a.number - b.number);
    const awayPlayers = game.awayTeam.players.sort((a, b) => a.number - b.number);

    // Create BoxScore for each player
    for (const player of [...homePlayers, ...awayPlayers]) {
      const isStarter = player.teamId === game.homeTeamId
        ? homePlayers.indexOf(player) < 5
        : awayPlayers.indexOf(player) < 5;

      await prisma.boxScore.create({
        data: {
          gameId,
          playerId: player.id,
          teamId: player.teamId,
          isStarter,
          enteredAt: isStarter ? 600 : null,
          isOnCourt: isStarter,
          points: 0,
          rebounds: 0,
          assists: 0,
          steals: 0,
          blocks: 0,
          turnovers: 0,
          minutes: 0,
          fg2Made: 0,
          fg2Attempted: 0,
          fg3Made: 0,
          fg3Attempted: 0,
          ftMade: 0,
          ftAttempted: 0,
          reboundsOff: 0,
          reboundsDef: 0,
          foulsPersonal: 0,
          foulsTechnical: 0,
          foulsUnsports: 0,
          foulsDisq: 0,
        },
      });
    }

    // Create GameOnCourt for each player
    for (const player of [...homePlayers, ...awayPlayers]) {
      const isStarter = player.teamId === game.homeTeamId
        ? homePlayers.indexOf(player) < 5
        : awayPlayers.indexOf(player) < 5;

      await prisma.gameOnCourt.create({
        data: {
          gameId,
          playerId: player.id,
          teamId: player.teamId,
          onCourt: isStarter,
          isStarter,
          lastSubInTimestamp: isStarter ? 600 : null,
        },
      });
    }

    return { success: true };
  } finally {
    await prisma.$disconnect();
  }
}

async function test() {
  const p = new PrismaClient();
  
  console.log('Testing initializeGameData for game 241...\n');
  
  // Clear existing data first
  await p.boxScore.deleteMany({ where: { gameId: 241 } });
  await p.gameOnCourt.deleteMany({ where: { gameId: 241 } });
  console.log('✓ Cleared existing BoxScore and GameOnCourt records\n');
  await p.$disconnect();

  // Initialize
  const result = await initializeGameData(241);
  console.log('✓ initializeGameData result:', result);

  // Verify creation
  const p2 = new PrismaClient();
  const boxScores = await p2.boxScore.findMany({
    where: { gameId: 241 },
    select: { playerId: true, isStarter: true, isOnCourt: true, enteredAt: true },
  });

  const onCourt = await p2.gameOnCourt.findMany({
    where: { gameId: 241 },
    select: { playerId: true, isStarter: true, onCourt: true, lastSubInTimestamp: true },
  });

  console.log('\n📊 VERIFICATION:\n');
  console.log(`BoxScore records: ${boxScores.length} ✅`);
  console.log(`GameOnCourt records: ${onCourt.length} ✅`);
  
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

  console.log('\n✅ ALL DATA INITIALIZED SUCCESSFULLY!\n');
  await p2.$disconnect();
}

test().catch(console.error);
