const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testStatsBug() {
  console.log('=== TESTING STATS BUG ===\n');

  try {
    // 1. Find game 232
    const game = await prisma.game.findUnique({
      where: { id: 232 },
      include: {
        homeTeam: { include: { players: { orderBy: { number: 'asc' } } } },
        awayTeam: { include: { players: { orderBy: { number: 'asc' } } } }
      }
    });

    if (!game) {
      console.error('Game not found');
      process.exit(1);
    }

    console.log('Game:', game.homeTeam.name, 'vs', game.awayTeam.name);
    console.log('Home players:', game.homeTeam.players.map(p => `#${p.number}`).join(', '));
    console.log('Away players:', game.awayTeam.players.map(p => `#${p.number}`).join(', '));
    console.log('Status:', game.status);
    console.log('');

    // 2. Start the game (simulate what startGame() does)
    console.log('STEP 1: Starting game...');

    const allPlayers = [...game.homeTeam.players, ...game.awayTeam.players];
    const homeStarterIds = new Set(game.homeTeam.players.slice(0, 5).map(p => p.id));
    const awayStarterIds = new Set(game.awayTeam.players.slice(0, 5).map(p => p.id));

    // Create gameOnCourt records
    for (const player of game.homeTeam.players) {
      await prisma.gameOnCourt.upsert({
        where: { gameId_playerId: { gameId: game.id, playerId: player.id } },
        update: { onCourt: homeStarterIds.has(player.id) },
        create: {
          gameId: game.id,
          playerId: player.id,
          teamId: game.homeTeamId,
          onCourt: homeStarterIds.has(player.id)
        }
      });
    }

    for (const player of game.awayTeam.players) {
      await prisma.gameOnCourt.upsert({
        where: { gameId_playerId: { gameId: game.id, playerId: player.id } },
        update: { onCourt: awayStarterIds.has(player.id) },
        create: {
          gameId: game.id,
          playerId: player.id,
          teamId: game.awayTeamId,
          onCourt: awayStarterIds.has(player.id)
        }
      });
    }

    // Create boxScore records for all players
    for (const player of allPlayers) {
      await prisma.boxScore.upsert({
        where: { gameId_playerId: { gameId: game.id, playerId: player.id } },
        update: {},
        create: {
          gameId: game.id,
          playerId: player.id,
          teamId: player.teamId,
          points: 0,
          rebounds: 0,
          assists: 0,
          steals: 0,
          blocks: 0,
          fouls: 0,
          turnovers: 0
        }
      });
    }

    // Update game status
    await prisma.game.update({
      where: { id: game.id },
      data: { status: 'LIVE', quarter: 1 }
    });

    console.log('✓ Game started. Created:');
    console.log('  - gameOnCourt records for all', allPlayers.length, 'players');
    console.log('  - boxScore records for all', allPlayers.length, 'players');
    console.log('');

    // 3. Verify before adding stats
    const beforeBoxScores = await prisma.boxScore.findMany({
      where: { gameId: game.id }
    });
    console.log('BEFORE adding stats: BoxScores count =', beforeBoxScores.length);
    console.log('');

    // 4. Simulate adding stats for players 1-13
    console.log('STEP 2: Adding stats for all', allPlayers.length, 'players...');
    for (let i = 0; i < allPlayers.length; i++) {
      const player = allPlayers[i];
      const points = 1; // Add 1 point to each

      // Simulate what addScoreWithType does
      await prisma.$transaction(async (tx) => {
        // Update game score
        const isHome = player.teamId === game.homeTeamId;
        await tx.game.update({
          where: { id: game.id },
          data: isHome
            ? { homeScore: { increment: points } }
            : { awayScore: { increment: points } }
        });

        // Update boxScore for scoring player
        const existing = await tx.boxScore.findFirst({
          where: { gameId: game.id, playerId: player.id }
        });

        if (existing) {
          await tx.boxScore.update({
            where: { id: existing.id },
            data: { points: { increment: points } }
          });
        } else {
          await tx.boxScore.create({
            data: {
              gameId: game.id,
              playerId: player.id,
              teamId: player.teamId,
              points
            }
          });
        }

        // Update onCourt players' +/-
        const onCourtPlayers = await tx.gameOnCourt.findMany({
          where: { gameId: game.id, teamId: player.teamId, onCourt: true }
        });

        for (const ocp of onCourtPlayers) {
          if (ocp.playerId === player.id) continue; // Skip scorer

          const existing2 = await tx.boxScore.findFirst({
            where: { gameId: game.id, playerId: ocp.playerId }
          });

          if (existing2) {
            await tx.boxScore.update({
              where: { id: existing2.id },
              data: { plusMinus: { increment: points } }
            });
          }
        }
      });

      console.log(`  Player ${i+1}/${allPlayers.length}: #${player.number} ${player.firstName} ${player.lastName} → +${points}pt`);
    }

    console.log('');

    // 5. Check final state
    console.log('STEP 3: Verifying final state...');
    const afterBoxScores = await prisma.boxScore.findMany({
      where: { gameId: game.id },
      orderBy: { playerId: 'asc' }
    });

    console.log('AFTER adding stats: BoxScores count =', afterBoxScores.length);
    console.log('Expected:', allPlayers.length);

    if (afterBoxScores.length === allPlayers.length) {
      console.log('✓ ALL PLAYERS HAVE BOXSCORES');
    } else {
      console.log('✗ MISSING', allPlayers.length - afterBoxScores.length, 'BOXSCORES');
    }

    console.log('');
    console.log('BoxScore breakdown:');
    const byTeam = {
      [game.homeTeamId]: [],
      [game.awayTeamId]: []
    };
    afterBoxScores.forEach(bs => {
      byTeam[bs.teamId].push(bs);
    });

    console.log(`\n${game.homeTeam.name} (${game.homeTeamId}):`);
    byTeam[game.homeTeamId].forEach(bs => {
      const player = allPlayers.find(p => p.id === bs.playerId);
      console.log(`  playerId=${bs.playerId} (#${player?.number}): points=${bs.points}, plusMinus=${bs.plusMinus}`);
    });

    console.log(`\n${game.awayTeam.name} (${game.awayTeamId}):`);
    byTeam[game.awayTeamId].forEach(bs => {
      const player = allPlayers.find(p => p.id === bs.playerId);
      console.log(`  playerId=${bs.playerId} (#${player?.number}): points=${bs.points}, plusMinus=${bs.plusMinus}`);
    });

  } catch (e) {
    console.error('ERROR:', e.message);
    console.error(e.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testStatsBug();
