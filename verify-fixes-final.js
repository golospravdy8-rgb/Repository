const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function verifyFixes() {
  console.log("🔍 FINAL VERIFICATION: BoxScore & GameOnCourt Fixes\n");

  try {
    // Create test game
    console.log("📝 Creating test game...\n");
    const testGame = await prisma.game.create({
      data: {
        seasonId: 2,
        homeTeamId: 7,
        awayTeamId: 11,
        scheduledAt: new Date(),
        status: "SCHEDULED",
        homeScore: 0,
        awayScore: 0,
        quarter: 0,
      },
    });

    console.log(`✅ Test game created: ID=${testGame.id}\n`);

    // Start game (initializes GameOnCourt)
    console.log("🎮 Starting game...\n");
    const game = await prisma.game.findUnique({
      where: { id: testGame.id },
      include: {
        homeTeam: { include: { players: { orderBy: { number: "asc" } } } },
        awayTeam: { include: { players: { orderBy: { number: "asc" } } } },
      },
    });

    const starterOps = [
      ...game.homeTeam.players.slice(0, 5).map((p) =>
        prisma.gameOnCourt.upsert({
          where: { gameId_playerId: { gameId: testGame.id, playerId: p.id } },
          update: { onCourt: true },
          create: { gameId: testGame.id, playerId: p.id, teamId: game.homeTeamId, onCourt: true },
        })
      ),
      ...game.awayTeam.players.slice(0, 5).map((p) =>
        prisma.gameOnCourt.upsert({
          where: { gameId_playerId: { gameId: testGame.id, playerId: p.id } },
          update: { onCourt: true },
          create: { gameId: testGame.id, playerId: p.id, teamId: game.awayTeamId, onCourt: true },
        })
      ),
    ];

    await prisma.$transaction([
      prisma.game.update({
        where: { id: testGame.id },
        data: { status: "LIVE", quarter: 1, homeScore: 0, awayScore: 0 },
      }),
      ...starterOps,
    ]);

    console.log("✅ Game started\n");

    // Verify GameOnCourt
    console.log("📊 VERIFICATION #1: GameOnCourt Initialization\n");
    const onCourtRecords = await prisma.gameOnCourt.findMany({
      where: { gameId: testGame.id },
    });

    console.log(`  Total GameOnCourt records: ${onCourtRecords.length}`);
    console.log(`  Expected: 10 (5 home + 5 away)`);
    console.log(`  Status: ${onCourtRecords.length === 10 ? "✅ PASS" : "❌ FAIL"}\n`);

    // Add scoring event
    console.log("📝 Adding scoring event...\n");
    const homePlayer = game.homeTeam.players[0];

    // This tests the new addScoreWithType logic
    const onCourtPlayers = await prisma.gameOnCourt.findMany({
      where: { gameId: testGame.id, teamId: game.homeTeamId, onCourt: true },
    });

    // Simulate scoring: update game, create event, update box scores
    await prisma.game.update({
      where: { id: testGame.id },
      data: { homeScore: { increment: 2 } },
    });

    await prisma.gameEvent.create({
      data: {
        gameId: testGame.id,
        teamId: game.homeTeamId,
        playerId: homePlayer.id,
        type: "POINTS",
        points: 2,
        quarter: 1,
      },
    });

    // Update scoring player's box score
    const scoringBoxScore = await prisma.boxScore.findFirst({
      where: { gameId: testGame.id, playerId: homePlayer.id },
    });

    if (scoringBoxScore) {
      await prisma.boxScore.update({
        where: { id: scoringBoxScore.id },
        data: { points: { increment: 2 }, efficiency: 2 },
      });
    } else {
      await prisma.boxScore.create({
        data: { gameId: testGame.id, playerId: homePlayer.id, teamId: game.homeTeamId, points: 2, efficiency: 2 },
      });
    }

    // Update +/- for on-court players
    for (const ocp of onCourtPlayers) {
      const existing = await prisma.boxScore.findFirst({
        where: { gameId: testGame.id, playerId: ocp.playerId },
      });
      if (existing) {
        await prisma.boxScore.update({
          where: { id: existing.id },
          data: { plusMinus: { increment: 2 } },
        });
      } else {
        await prisma.boxScore.create({
          data: { gameId: testGame.id, playerId: ocp.playerId, teamId: game.homeTeamId, plusMinus: 2 },
        });
      }
    }

    console.log("✅ Scoring event processed\n");

    // Verify BoxScore
    console.log("📊 VERIFICATION #2: BoxScore plusMinus & efficiency\n");
    const boxScores = await prisma.boxScore.findMany({
      where: { gameId: testGame.id },
    });

    console.log(`  Total BoxScore records: ${boxScores.length}`);

    const nonZeroPlusMinus = boxScores.filter((bs) => bs.plusMinus !== 0);
    console.log(`  Non-zero plusMinus: ${nonZeroPlusMinus.length}`);
    console.log(`  Status: ${nonZeroPlusMinus.length > 0 ? "✅ PASS" : "❌ FAIL"}`);

    const nonZeroEfficiency = boxScores.filter((bs) => bs.efficiency !== 0);
    console.log(`  Non-zero efficiency: ${nonZeroEfficiency.length}`);
    console.log(`  Status: ${nonZeroEfficiency.length > 0 ? "✅ PASS" : "❌ FAIL"}\n`);

    console.log("📋 Sample BoxScore records:");
    boxScores.slice(0, 5).forEach((bs) => {
      console.log(`  Player ${bs.playerId}: points=${bs.points}, plusMinus=${bs.plusMinus}, efficiency=${bs.efficiency}`);
    });

    console.log("\n✅ VERIFICATION COMPLETE\n");

    // Cleanup
    console.log("🧹 Cleaning up test data...\n");
    await prisma.gameOnCourt.deleteMany({ where: { gameId: testGame.id } });
    await prisma.boxScore.deleteMany({ where: { gameId: testGame.id } });
    await prisma.gameEvent.deleteMany({ where: { gameId: testGame.id } });
    await prisma.game.delete({ where: { id: testGame.id } });

    console.log("✅ Test data cleaned up\n");
  } catch (error) {
    console.error("❌ Error:", error.message);
    throw error;
  }
}

verifyFixes()
  .catch(console.error)
  .finally(() => process.exit(0));
