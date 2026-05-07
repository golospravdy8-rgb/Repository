const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== E2E TEST: Creating and testing new game ===\n');

  // Create test game
  const testGame = await prisma.game.create({
    data: {
      seasonId: 2,
      homeTeamId: 7,
      awayTeamId: 11,
      scheduledAt: new Date(),
      status: 'LIVE',
      quarter: 1,
      homeScore: 0,
      awayScore: 0
    }
  });

  console.log(`Created game/${testGame.id}\n`);

  // Initialize GameOnCourt
  const game = await prisma.game.findUnique({
    where: { id: testGame.id },
    include: {
      homeTeam: { include: { players: { orderBy: { number: 'asc' } } } },
      awayTeam: { include: { players: { orderBy: { number: 'asc' } } } }
    }
  });

  const starterOps = [
    ...game.homeTeam.players.slice(0, 5).map((p) =>
      prisma.gameOnCourt.upsert({
        where: { gameId_playerId: { gameId: testGame.id, playerId: p.id } },
        update: { onCourt: true },
        create: { gameId: testGame.id, playerId: p.id, teamId: game.homeTeamId, onCourt: true }
      })
    ),
    ...game.awayTeam.players.slice(0, 5).map((p) =>
      prisma.gameOnCourt.upsert({
        where: { gameId_playerId: { gameId: testGame.id, playerId: p.id } },
        update: { onCourt: true },
        create: { gameId: testGame.id, playerId: p.id, teamId: game.awayTeamId, onCourt: true }
      })
    )
  ];

  await Promise.all(starterOps);
  console.log('Initialized GameOnCourt (10 records)\n');

  // Get first home player
  const homePlayer = game.homeTeam.players[0];
  console.log(`Adding 2 points for ${homePlayer.firstName} ${homePlayer.lastName}...\n`);

  // Add scoring event
  await prisma.gameEvent.create({
    data: {
      gameId: testGame.id,
      teamId: game.homeTeamId,
      playerId: homePlayer.id,
      type: 'POINTS',
      points: 2,
      quarter: 1
    }
  });

  // Update game score
  await prisma.game.update({
    where: { id: testGame.id },
    data: { homeScore: { increment: 2 } }
  });

  // Update +/- for on-court players
  const onCourtPlayers = await prisma.gameOnCourt.findMany({
    where: { gameId: testGame.id, teamId: game.homeTeamId, onCourt: true }
  });

  for (const ocp of onCourtPlayers) {
    const existing = await prisma.boxScore.findFirst({
      where: { gameId: testGame.id, playerId: ocp.playerId }
    });
    if (existing) {
      await prisma.boxScore.update({
        where: { id: existing.id },
        data: { plusMinus: { increment: 2 } }
      });
    } else {
      await prisma.boxScore.create({
        data: { gameId: testGame.id, playerId: ocp.playerId, teamId: game.homeTeamId, plusMinus: 2 }
      });
    }
  }

  // Check BoxScore for scoring player
  const bs = await prisma.boxScore.findFirst({
    where: { gameId: testGame.id, playerId: homePlayer.id }
  });

  console.log('=== BOXSCORE RESULT ===');
  console.log('points:', bs?.points);
  console.log('plusMinus:', bs?.plusMinus);
  console.log('efficiency:', bs?.efficiency);

  // Check other on-court players
  const otherOnCourt = await prisma.boxScore.findMany({
    where: { gameId: testGame.id, playerId: { not: homePlayer.id } }
  });

  console.log('\n=== OTHER ON-COURT PLAYERS ===');
  console.log('Count:', otherOnCourt.length);
  if (otherOnCourt.length > 0) {
    console.log('Sample:', otherOnCourt[0]);
  }

  // Verdict
  console.log('\n=== E2E TEST VERDICT ===');
  if (bs?.points === 2 && bs?.plusMinus === 2 && otherOnCourt.length > 0 && otherOnCourt[0].plusMinus === 2) {
    console.log('✅ E2E TEST PASSED: All stats calculated correctly');
  } else {
    console.log('❌ E2E TEST FAILED');
    if (bs?.points !== 2) console.log('  - scoring player points should be 2, got', bs?.points);
    if (bs?.plusMinus !== 2) console.log('  - scoring player plusMinus should be 2, got', bs?.plusMinus);
    if (otherOnCourt.length === 0) console.log('  - no other on-court players found');
    else if (otherOnCourt[0].plusMinus !== 2) console.log('  - other players plusMinus should be 2, got', otherOnCourt[0].plusMinus);
  }

  // Cleanup
  await prisma.gameOnCourt.deleteMany({ where: { gameId: testGame.id } });
  await prisma.boxScore.deleteMany({ where: { gameId: testGame.id } });
  await prisma.gameEvent.deleteMany({ where: { gameId: testGame.id } });
  await prisma.game.delete({ where: { id: testGame.id } });
  console.log('\n✅ Cleanup complete');
}

main().catch(console.error).finally(() => prisma.$disconnect());
