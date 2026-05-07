const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function runtimeVerification() {
  console.log("🔍 RUNTIME VERIFICATION: game/159 REAL DATA\n");

  try {
    // Get game data
    const game = await prisma.game.findUnique({
      where: { id: 159 },
      include: {
        homeTeam: true,
        awayTeam: true,
        season: true,
      },
    });

    console.log("📊 VERIFICATION #1: Game/159 Real Data\n");
    console.log("Game Record:");
    console.log(`  ID: ${game?.id}`);
    console.log(`  Status: ${game?.status}`);
    console.log(`  Stage: ${game?.stage || "NULL"}`);
    console.log(`  Home Score: ${game?.homeScore}`);
    console.log(`  Away Score: ${game?.awayScore}`);
    console.log(`  Home Team: ${game?.homeTeam?.name} (ID: ${game?.homeTeamId})`);
    console.log(`  Away Team: ${game?.awayTeam?.name} (ID: ${game?.awayTeamId})`);
    console.log(`  Season: ${game?.season?.ageGroup} (ID: ${game?.seasonId})`);
    console.log(`  Quarter: ${game?.quarter}\n`);

    // BoxScore analysis
    console.log("BoxScore Analysis:");
    const boxScores = await prisma.boxScore.findMany({
      where: { gameId: 159 },
      include: { player: true, team: true },
    });

    console.log(`  Total BoxScore records: ${boxScores.length}`);

    if (boxScores.length === 0) {
      console.log("  ⚠️ NO BoxScore records found for game/159!");
    } else {
      // Check for duplicates
      const playerMap = new Map();
      for (const bs of boxScores) {
        playerMap.set(bs.playerId, (playerMap.get(bs.playerId) || 0) + 1);
      }

      const duplicates = [];
      for (const [playerId, count] of playerMap) {
        if (count > 1) {
          duplicates.push([playerId, count]);
        }
      }

      if (duplicates.length > 0) {
        console.log(`  🔴 DUPLICATES FOUND: ${duplicates.length} players have multiple rows`);
        duplicates.forEach(([playerId, count]) => {
          console.log(`    Player ${playerId}: ${count} rows`);
        });
      } else {
        console.log("  ✅ No duplicates");
      }

      // Check zero points
      const zeroPoints = boxScores.filter((bs) => bs.points === 0);
      console.log(`  Points=0: ${zeroPoints.length} players`);

      // Team totals
      const homeTeamBoxScores = boxScores.filter((bs) => bs.teamId === game?.homeTeamId);
      const awayTeamBoxScores = boxScores.filter((bs) => bs.teamId === game?.awayTeamId);

      const homeTotal = homeTeamBoxScores.reduce((sum, bs) => sum + bs.points, 0);
      const awayTotal = awayTeamBoxScores.reduce((sum, bs) => sum + bs.points, 0);

      console.log(`\n  Home Team (${game?.homeTeam?.name}): ${homeTeamBoxScores.length} players`);
      console.log(`    Total points from BoxScore: ${homeTotal}`);
      console.log(`    Game.homeScore: ${game?.homeScore}`);
      console.log(`    Match: ${homeTotal === game?.homeScore ? "✅ YES" : "❌ NO"}`);

      console.log(`\n  Away Team (${game?.awayTeam?.name}): ${awayTeamBoxScores.length} players`);
      console.log(`    Total points from BoxScore: ${awayTotal}`);
      console.log(`    Game.awayScore: ${game?.awayScore}`);
      console.log(`    Match: ${awayTotal === game?.awayScore ? "✅ YES" : "❌ NO"}`);
    }

    // GameEvent analysis
    console.log("\n\nGameEvent Analysis:");
    const gameEvents = await prisma.gameEvent.findMany({
      where: { gameId: 159 },
    });

    console.log(`  Total GameEvent records: ${gameEvents.length}`);

    const eventsByType = new Map();
    for (const event of gameEvents) {
      eventsByType.set(event.type, (eventsByType.get(event.type) || 0) + 1);
    }

    for (const [type, count] of eventsByType) {
      console.log(`    ${type}: ${count}`);
    }

    // Points from GameEvent
    const pointsEvents = gameEvents.filter((e) => e.type === "POINTS");
    const homePointsTotal = pointsEvents
      .filter((e) => e.teamId === game?.homeTeamId)
      .reduce((sum, e) => sum + (e.points || 0), 0);

    const awayPointsTotal = pointsEvents
      .filter((e) => e.teamId === game?.awayTeamId)
      .reduce((sum, e) => sum + (e.points || 0), 0);

    console.log(`\n  Points from GameEvent:`);
    console.log(`    Home: ${homePointsTotal} (Game.homeScore: ${game?.homeScore})`);
    console.log(`    Away: ${awayPointsTotal} (Game.awayScore: ${game?.awayScore})`);

    // GameOnCourt analysis
    console.log("\n\nGameOnCourt Analysis:");
    const onCourtRecords = await prisma.gameOnCourt.findMany({
      where: { gameId: 159 },
    });

    console.log(`  Total GameOnCourt records: ${onCourtRecords.length}`);
    if (onCourtRecords.length === 0) {
      console.log("  🔴 EMPTY! Plus/minus cannot be calculated.");
    } else {
      const onCourt = onCourtRecords.filter((r) => r.onCourt).length;
      console.log(`  On court: ${onCourt}`);
      console.log(`  On bench: ${onCourtRecords.length - onCourt}`);
    }

    // ═══════════════════════════════════════════════════════════════
    // VERIFICATION #2: Reconciliation
    // ═══════════════════════════════════════════════════════════════

    console.log("\n\n📋 VERIFICATION #2: Reconciliation Audit\n");

    const homeTotal = boxScores.filter((bs) => bs.teamId === game?.homeTeamId).reduce((sum, bs) => sum + bs.points, 0);
    const awayTotal = boxScores.filter((bs) => bs.teamId === game?.awayTeamId).reduce((sum, bs) => sum + bs.points, 0);

    console.log("Reconciliation Map:");
    console.log(`  Game.homeScore: ${game?.homeScore}`);
    console.log(`  SUM(BoxScore.points) for home: ${homeTotal}`);
    console.log(`  SUM(GameEvent.points) for home: ${homePointsTotal}`);

    console.log(`\n  Game.awayScore: ${game?.awayScore}`);
    console.log(`  SUM(BoxScore.points) for away: ${awayTotal}`);
    console.log(`  SUM(GameEvent.points) for away: ${awayPointsTotal}`);

    // Fouls check
    const foulEvents = gameEvents.filter((e) =>
      ["FOUL", "FOUL_UNSPORTSMANLIKE", "FOUL_TECHNICAL", "FOUL_DISQUALIFYING"].includes(e.type)
    );

    const totalBoxScoreFouls = boxScores.reduce((sum, bs) => sum + bs.fouls, 0);

    console.log(`\n  Fouls:`);
    console.log(`    GameEvent FOUL events: ${foulEvents.length}`);
    console.log(`    SUM(BoxScore.fouls): ${totalBoxScoreFouls}`);
    console.log(`    Match: ${foulEvents.length === totalBoxScoreFouls ? "✅ YES" : "❌ NO"}`);

    // ═══════════════════════════════════════════════════════════════
    // VERIFICATION #3: Bug Proof/Disproof
    // ═══════════════════════════════════════════════════════════════

    console.log("\n\n🔬 VERIFICATION #3: Bug Proof/Disproof\n");

    // БАГ-001: id??0 duplicates
    console.log("БАГ-001 (id??0 duplicates):");
    const playerMap = new Map();
    for (const bs of boxScores) {
      playerMap.set(bs.playerId, (playerMap.get(bs.playerId) || 0) + 1);
    }

    const duplicateCheck = [];
    for (const [playerId, count] of playerMap) {
      if (count > 1) {
        duplicateCheck.push([playerId, count]);
      }
    }

    if (duplicateCheck.length > 0) {
      console.log(`  🔴 CONFIRMED: ${duplicateCheck.length} players have duplicate BoxScore rows`);
      duplicateCheck.forEach(([playerId, count]) => {
        console.log(`    Player ${playerId}: ${count} rows`);
      });
    } else {
      console.log(`  ✅ DISPROVEN: No duplicate BoxScore rows`);
    }

    // БАГ-002: GameOnCourt empty
    console.log("\nБАГ-002 (GameOnCourt empty):");
    if (onCourtRecords.length === 0) {
      console.log(`  🔴 CONFIRMED: GameOnCourt is empty (0 records)`);
    } else {
      console.log(`  ✅ DISPROVEN: GameOnCourt has ${onCourtRecords.length} records`);
    }

    // БАГ-003: plusMinus all zeros
    console.log("\nБАГ-003 (plusMinus all zeros):");
    const nonZeroPlusMinus = boxScores.filter((bs) => bs.plusMinus !== 0);
    if (nonZeroPlusMinus.length === 0) {
      console.log(`  🔴 CONFIRMED: All plusMinus values are 0`);
    } else {
      console.log(`  ✅ DISPROVEN: ${nonZeroPlusMinus.length} players have non-zero plusMinus`);
      nonZeroPlusMinus.slice(0, 5).forEach((bs) => {
        console.log(`    Player ${bs.playerId}: ${bs.plusMinus}`);
      });
    }

    // БАГ-007: fouls mismatch
    console.log("\nБАГ-007 (fouls mismatch):");
    console.log(`  GameEvent FOUL count: ${foulEvents.length}`);
    console.log(`  SUM(BoxScore.fouls): ${totalBoxScoreFouls}`);
    if (foulEvents.length !== totalBoxScoreFouls) {
      console.log(`  🔴 CONFIRMED: Fouls mismatch (${foulEvents.length} vs ${totalBoxScoreFouls})`);
    } else {
      console.log(`  ✅ DISPROVEN: Fouls match`);
    }

    // ═══════════════════════════════════════════════════════════════
    // VERIFICATION #4: Season & AgeGroup
    // ═══════════════════════════════════════════════════════════════

    console.log("\n\n🎯 VERIFICATION #4: Season & AgeGroup\n");

    console.log(`Game 159 Season Info:`);
    console.log(`  Season ID: ${game?.seasonId}`);
    console.log(`  Age Group: ${game?.season?.ageGroup}`);
    console.log(`  Stage: ${game?.stage || "NULL"}`);
    console.log(`  Status: ${game?.status}`);

    // Leaders query
    console.log(`\nLeaders Query Check:`);
    const leadersBoxScores = await prisma.boxScore.findMany({
      where: {
        game: {
          seasonId: game?.seasonId,
          status: { in: ["FINAL", "LIVE"] },
        },
      },
    });

    console.log(`  BoxScore records for leaders (${game?.season?.ageGroup}, FINAL+LIVE): ${leadersBoxScores.length}`);

    // Schedule query
    console.log(`\nSchedule Query Check:`);
    const scheduleGames = await prisma.game.findMany({
      where: { seasonId: game?.seasonId },
      orderBy: { scheduledAt: "asc" },
    });

    console.log(`  Total games in season: ${scheduleGames.length}`);
    const game159InSchedule = scheduleGames.find((g) => g.id === 159);
    if (game159InSchedule) {
      console.log(`  Game 159 found: status=${game159InSchedule.status}, stage=${game159InSchedule.stage || "NULL"}`);

      // Check filters
      const passesStageFilter =
        !game159InSchedule.stage ||
        game159InSchedule.stage === "group" ||
        game159InSchedule.stage === "groupA" ||
        game159InSchedule.stage === "groupB";

      const passesStatusFilter = game159InSchedule.status === "FINAL";

      console.log(`  Passes stage filter: ${passesStageFilter ? "✅ YES" : "❌ NO"}`);
      console.log(`  Passes status filter (tab=older): ${passesStatusFilter ? "✅ YES" : "❌ NO"}`);
      console.log(`  Would appear in schedule: ${passesStageFilter && passesStatusFilter ? "✅ YES" : "❌ NO"}`);
    } else {
      console.log(`  ❌ Game 159 NOT found in season games`);
    }

    console.log("\n\n✅ RUNTIME VERIFICATION COMPLETE");
  } catch (error) {
    console.error("❌ Error during verification:", error);
    throw error;
  }
}

runtimeVerification()
  .catch(console.error)
  .finally(() => process.exit(0));
