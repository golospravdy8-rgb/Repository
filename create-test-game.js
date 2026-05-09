const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    console.log('=== CREATING TEST GAME 240 WITH FULL DATA ===\n');

    // Game 240 already exists, let's check it and add missing data
    const game = await prisma.game.findUnique({
      where: { id: 240 },
      include: { homeTeam: { include: { players: true } }, awayTeam: { include: { players: true } }, boxScores: true, onCourt: true }
    });

    if (!game) {
      console.log('Game 240 not found!');
      process.exit(1);
    }

    console.log('Game 240 found:');
    console.log(`  Teams: ${game.homeTeam?.name} (${game.homeTeam?.id}) vs ${game.awayTeam?.name} (${game.awayTeam?.id})`);
    console.log(`  Home players: ${game.homeTeam?.players?.length || 0}`);
    console.log(`  Away players: ${game.awayTeam?.players?.length || 0}`);
    console.log(`  BoxScores: ${game.boxScores?.length || 0}`);
    console.log(`  OnCourt records: ${game.onCourt?.length || 0}`);

    // If no BoxScores exist, create them for all players
    if (!game.boxScores || game.boxScores.length === 0) {
      console.log('\nCreating BoxScore records for all players...');

      const boxScoresToCreate = [
        ...game.homeTeam.players.map(p => ({
          gameId: 240,
          playerId: p.id,
          teamId: game.homeTeamId,
        })),
        ...game.awayTeam.players.map(p => ({
          gameId: 240,
          playerId: p.id,
          teamId: game.awayTeamId,
        })),
      ];

      for (const bs of boxScoresToCreate) {
        try {
          await prisma.boxScore.upsert({
            where: { gameId_playerId: { gameId: bs.gameId, playerId: bs.playerId } },
            create: bs,
            update: {},
          });
        } catch (err) {
          console.log(`  Skipped player ${bs.playerId} (already exists)`);
        }
      }

      console.log(`✓ Created ${boxScoresToCreate.length} BoxScore records`);
    }

    // Create OnCourt records for first 5 players of each team (starting lineup)
    if (!game.onCourt || game.onCourt.length === 0) {
      console.log('\nCreating OnCourt records for starting lineup...');

      const starters = [
        ...game.homeTeam.players.slice(0, 5).map(p => ({
          gameId: 240,
          playerId: p.id,
          teamId: game.homeTeamId,
          onCourt: true,
          enteredAt: 600, // Start of game
        })),
        ...game.awayTeam.players.slice(0, 5).map(p => ({
          gameId: 240,
          playerId: p.id,
          teamId: game.awayTeamId,
          onCourt: true,
          enteredAt: 600,
        })),
      ];

      for (const oc of starters) {
        try {
          await prisma.gameOnCourt.upsert({
            where: { gameId_playerId: { gameId: oc.gameId, playerId: oc.playerId } },
            create: oc,
            update: { onCourt: true, enteredAt: 600 },
          });
        } catch (err) {
          console.log(`  Skipped player ${oc.playerId}`);
        }
      }

      console.log(`✓ Created ${starters.length} OnCourt records`);
    }

    // Update game status to LIVE
    await prisma.game.update({
      where: { id: 240 },
      data: { status: 'LIVE' },
    });
    console.log('\n✓ Game 240 status set to LIVE');

    // Final check
    const updatedGame = await prisma.game.findUnique({
      where: { id: 240 },
      include: {
        homeTeam: { include: { players: { take: 1 } } },
        awayTeam: { include: { players: { take: 1 } } },
        boxScores: { take: 1 },
        onCourt: { take: 1 }
      }
    });

    console.log('\n=== FINAL STATE ===');
    console.log('Game 240:');
    console.log(`  Status: ${updatedGame.status}`);
    console.log(`  Teams: ${updatedGame.homeTeam?.name} vs ${updatedGame.awayTeam?.name}`);
    console.log(`  BoxScores count: ${await prisma.boxScore.count({ where: { gameId: 240 } })}`);
    console.log(`  OnCourt records: ${await prisma.gameOnCourt.count({ where: { gameId: 240 } })}`);
    console.log('\n✅ Test game ready for LiveScoreTracker testing!');

    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
