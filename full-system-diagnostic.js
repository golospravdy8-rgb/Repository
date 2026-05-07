const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function fullSystemDiagnostic() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("🔍 FULL SYSTEM DATA FLOW DIAGNOSTIC — Game/159");
  console.log("═══════════════════════════════════════════════════════════════\n");

  try {
    // ═══════════════════════════════════════════════════════════════
    // PART 1: GAME/159 REAL DATA
    // ═══════════════════════════════════════════════════════════════
    console.log("📊 PART 1: Game/159 Raw Database State\n");

    const game = await prisma.game.findUnique({
      where: { id: 159 },
      include: {
        homeTeam: { include: { players: true } },
        awayTeam: { include: { players: true } },
        season: true,
        events: true,
        boxScores: { include: { player: true } },
        substitutions: true,
        onCourt: true,
      },
    });

    if (!game) {
      console.log("❌ Game/159 NOT FOUND in database\n");
      process.exit(1);
    }

    console.log(`Game ID: ${game.id}`);
    console.log(`Status: ${game.status}`);
    console.log(`Stage: ${game.stage || "NULL"}`);
    console.log(`Season ID: ${game.seasonId}`);
    console.log(`Home Team: ${game.homeTeam.name} (ID: ${game.homeTeamId})`);
    console.log(`Away Team: ${game.awayTeam.name} (ID: ${game.awayTeamId})`);
    console.log(`Home Score: ${game.homeScore}`);
    console.log(`Away Score: ${game.awayScore}`);
    console.log(`Quarter: ${game.quarter}\n`);

    // ═══════════════════════════════════════════════════════════════
    // PART 2: BOXSCORE ANALYSIS
    // ═══════════════════════════════════════════════════════════════
    console.log("📋 PART 2: BoxScore Analysis\n");

    console.log(`Total BoxScore records: ${game.boxScores.length}`);

    if (game.boxScores.length === 0) {
      console.log("🔴 CRITICAL: NO BoxScore records for game/159\n");
    } else {
      // Check for duplicates
      const playerMap = new Map();
      for (const bs of game.boxScores) {
        playerMap.set(bs.playerId, (playerMap.get(bs.playerId) || 0) + 1);
      }

      const duplicates = Array.from(playerMap.entries()).filter(([_, count]) => count > 1);
      if (duplicates.length > 0) {
        console.log(`🔴 DUPLICATES: ${duplicates.length} players have multiple BoxScore rows`);
        duplicates.forEach(([playerId, count]) => {
          console.log(`   Player ${playerId}: ${count} rows`);
        });
      } else {
        console.log("✅ No duplicate BoxScore rows");
      }

      // Check stats
      const nonZeroPoints = game.boxScores.filter(bs => bs.points !== 0);
      const nonZeroPlusMinus = game.boxScores.filter(bs => bs.plusMinus !== 0);
      const nonZeroEfficiency = game.boxScores.filter(bs => bs.efficiency !== 0);

      console.log(`\nPoints > 0: ${nonZeroPoints.length}/${game.boxScores.length}`);
      console.log(`PlusMinus ≠ 0: ${nonZeroPlusMinus.length}/${game.boxScores.length}`);
      console.log(`Efficiency ≠ 0: ${nonZeroEfficiency.length}/${game.boxScores.length}`);

      // Team totals
      const homeBoxScores = game.boxScores.filter(bs => bs.teamId === game.homeTeamId);
      const awayBoxScores = game.boxScores.filter(bs => bs.teamId === game.awayTeamId);

      const homeTotal = homeBoxScores.reduce((sum, bs) => sum + bs.points, 0);
      const awayTotal = awayBoxScores.reduce((sum, bs) => sum + bs.points, 0);

      console.log(`\nHome team BoxScore total: ${homeTotal} (Game.homeScore: ${game.homeScore})`);
      console.log(`Away team BoxScore total: ${awayTotal} (Game.awayScore: ${game.awayScore})`);
      console.log(`Match: ${homeTotal === game.homeScore && awayTotal === game.awayScore ? "✅ YES" : "❌ NO"}`);

      console.log(`\nSample BoxScore records (first 3):`);
      game.boxScores.slice(0, 3).forEach(bs => {
        console.log(`  Player ${bs.playerId}: pts=${bs.points}, +/-=${bs.plusMinus}, eff=${bs.efficiency}`);
      });
    }

    console.log();

    // ═══════════════════════════════════════════════════════════════
    // PART 3: GAMEEVENT ANALYSIS
    // ═══════════════════════════════════════════════════════════════
    console.log("📋 PART 3: GameEvent Analysis\n");

    console.log(`Total GameEvent records: ${game.events.length}`);

    const eventsByType = new Map();
    for (const event of game.events) {
      eventsByType.set(event.type, (eventsByType.get(event.type) || 0) + 1);
    }

    console.log("Event types:");
    for (const [type, count] of eventsByType) {
      console.log(`  ${type}: ${count}`);
    }

    const pointsEvents = game.events.filter(e => e.type === "POINTS");
    const homePointsTotal = pointsEvents
      .filter(e => e.teamId === game.homeTeamId)
      .reduce((sum, e) => sum + (e.points || 0), 0);
    const awayPointsTotal = pointsEvents
      .filter(e => e.teamId === game.awayTeamId)
      .reduce((sum, e) => sum + (e.points || 0), 0);

    console.log(`\nPoints from GameEvent:`);
    console.log(`  Home: ${homePointsTotal} (Game.homeScore: ${game.homeScore})`);
    console.log(`  Away: ${awayPointsTotal} (Game.awayScore: ${game.awayScore})`);
    console.log(`  Match: ${homePointsTotal === game.homeScore && awayPointsTotal === game.awayScore ? "✅ YES" : "❌ NO"}`);

    const foulEvents = game.events.filter(e =>
      ["FOUL", "FOUL_UNSPORTSMANLIKE", "FOUL_TECHNICAL", "FOUL_DISQUALIFYING"].includes(e.type)
    );
    const totalBoxScoreFouls = game.boxScores.reduce((sum, bs) => sum + bs.fouls, 0);

    console.log(`\nFouls:`);
    console.log(`  GameEvent FOUL events: ${foulEvents.length}`);
    console.log(`  SUM(BoxScore.fouls): ${totalBoxScoreFouls}`);
    console.log(`  Match: ${foulEvents.length === totalBoxScoreFouls ? "✅ YES" : "❌ NO"}`);

    console.log();

    // ═══════════════════════════════════════════════════════════════
    // PART 4: GAMEONCOURT ANALYSIS
    // ═══════════════════════════════════════════════════════════════
    console.log("📋 PART 4: GameOnCourt Analysis\n");

    console.log(`Total GameOnCourt records: ${game.onCourt.length}`);

    if (game.onCourt.length === 0) {
      console.log("🔴 CRITICAL: GameOnCourt is EMPTY (cannot calculate +/-)");
    } else {
      const onCourt = game.onCourt.filter(r => r.onCourt).length;
      const onBench = game.onCourt.length - onCourt;
      console.log(`  On court: ${onCourt}`);
      console.log(`  On bench: ${onBench}`);
    }

    console.log();

    // ═══════════════════════════════════════════════════════════════
    // PART 5: SCHEDULE PAGE QUERY
    // ═══════════════════════════════════════════════════════════════
    console.log("📋 PART 5: Schedule Page Query (/schedule?ag=older)\n");

    const season = await prisma.season.findFirst({
      where: { isActive: true, ageGroup: "older" },
    });

    if (!season) {
      console.log("❌ No active season for ageGroup='older'");
    } else {
      console.log(`Season ID: ${season.id}, ageGroup: ${season.ageGroup}`);

      const scheduleGames = await prisma.game.findMany({
        where: { seasonId: season.id },
        orderBy: { scheduledAt: "asc" },
      });

      console.log(`Total games in season: ${scheduleGames.length}`);

      const game159InSchedule = scheduleGames.find(g => g.id === 159);
      if (game159InSchedule) {
        console.log(`\nGame/159 found in schedule:`);
        console.log(`  Status: ${game159InSchedule.status}`);
        console.log(`  Stage: ${game159InSchedule.stage || "NULL"}`);

        const passesStageFilter =
          !game159InSchedule.stage ||
          game159InSchedule.stage === "group" ||
          game159InSchedule.stage === "groupA" ||
          game159InSchedule.stage === "groupB";

        const passesStatusFilter = game159InSchedule.status === "FINAL";

        console.log(`  Passes stage filter: ${passesStageFilter ? "✅ YES" : "❌ NO"}`);
        console.log(`  Passes status filter (FINAL): ${passesStatusFilter ? "✅ YES" : "❌ NO"}`);
        console.log(`  Would appear in /schedule: ${passesStageFilter && passesStatusFilter ? "✅ YES" : "❌ NO"}`);
      } else {
        console.log(`❌ Game/159 NOT found in season games`);
      }
    }

    console.log();

    // ═══════════════════════════════════════════════════════════════
    // PART 6: LEADERS PAGE QUERY
    // ═══════════════════════════════════════════════════════════════
    console.log("📋 PART 6: Leaders Page Query (/leaders?ag=older)\n");

    const olderSeason = await prisma.season.findFirst({
      where: { isActive: true, ageGroup: "older" },
    });

    if (!olderSeason) {
      console.log("❌ No active season for ageGroup='older'");
    } else {
      const leadersBoxScores = await prisma.boxScore.findMany({
        where: {
          game: {
            seasonId: olderSeason.id,
            status: { in: ["FINAL", "LIVE"] },
          },
        },
        include: {
          player: { select: { firstName: true, lastName: true } },
          team: { select: { name: true } },
        },
      });

      console.log(`BoxScore records for leaders (FINAL+LIVE): ${leadersBoxScores.length}`);

      if (leadersBoxScores.length > 0) {
        // Check if game/159 is included
        const game159BoxScores = leadersBoxScores.filter(bs => bs.gameId === 159);
        console.log(`  Game/159 BoxScores in leaders: ${game159BoxScores.length}`);

        // Check for rating calculation
        const playerStats = new Map();
        for (const bs of leadersBoxScores) {
          if (!playerStats.has(bs.playerId)) {
            playerStats.set(bs.playerId, {
              points: 0,
              rebounds: 0,
              assists: 0,
              steals: 0,
              blocks: 0,
              fouls: 0,
              games: 0,
            });
          }
          const stats = playerStats.get(bs.playerId);
          stats.points += bs.points;
          stats.rebounds += bs.rebounds;
          stats.assists += bs.assists;
          stats.steals += bs.steals;
          stats.blocks += bs.blocks;
          stats.fouls += bs.fouls;
          stats.games += 1;
        }

        console.log(`\nUnique players: ${playerStats.size}`);

        // Check if all players have same rating
        const ratings = [];
        for (const [playerId, stats] of playerStats) {
          const g = stats.games || 1;
          const ppg = stats.points / g;
          const rpg = stats.rebounds / g;
          const apg = stats.assists / g;
          const spg = stats.steals / g;
          const bpg = stats.blocks / g;
          const rating = Math.min(99, Math.round(50 + ppg * 1.8 + rpg * 1.2 + apg * 1.5 + spg * 2.0 + bpg * 1.8));
          ratings.push(rating);
        }

        const uniqueRatings = new Set(ratings);
        console.log(`Unique ratings: ${uniqueRatings.size}`);
        if (uniqueRatings.size === 1) {
          console.log(`🔴 WARNING: All players have same rating (${Array.from(uniqueRatings)[0]})`);
        } else {
          console.log(`✅ Ratings vary: ${Array.from(uniqueRatings).sort((a, b) => b - a).slice(0, 5).join(", ")}...`);
        }
      }
    }

    console.log();

    // ═══════════════════════════════════════════════════════════════
    // PART 7: FIBA PROTOCOL ANALYSIS
    // ═══════════════════════════════════════════════════════════════
    console.log("📋 PART 7: FIBA Protocol Fields\n");

    console.log(`Commissioner: "${game.commissioner || ""}"`);
    console.log(`Referee: "${game.referee || ""}"`);
    console.log(`Umpire1: "${game.umpire1 || ""}"`);
    console.log(`Umpire2: "${game.umpire2 || ""}"`);
    console.log(`Scorer: "${game.scorer || ""}"`);
    console.log(`AssistantScorer: "${game.assistantScorer || ""}"`);
    console.log(`Timer: "${game.timer || ""}"`);
    console.log(`ShotClockOperator: "${game.shotClockOperator || ""}"`);

    console.log(`\nHome Team Coach: "${game.homeTeam.coachName || ""}"`);
    console.log(`Away Team Coach: "${game.awayTeam.coachName || ""}"`);

    console.log();

    // ═══════════════════════════════════════════════════════════════
    // SUMMARY
    // ═══════════════════════════════════════════════════════════════
    console.log("═══════════════════════════════════════════════════════════════");
    console.log("📊 DIAGNOSTIC SUMMARY\n");

    const issues = [];

    if (game.boxScores.length === 0) issues.push("❌ BoxScore empty");
    if (game.onCourt.length === 0) issues.push("❌ GameOnCourt empty");
    if (homeBoxScores.length > 0 && homeTotal !== game.homeScore) issues.push("❌ Home points mismatch");
    if (awayBoxScores.length > 0 && awayTotal !== game.awayScore) issues.push("❌ Away points mismatch");
    if (foulEvents.length !== totalBoxScoreFouls) issues.push("❌ Fouls mismatch");

    if (issues.length === 0) {
      console.log("✅ All data flows appear correct");
    } else {
      console.log("Issues found:");
      issues.forEach(issue => console.log(`  ${issue}`));
    }

    console.log("\n═══════════════════════════════════════════════════════════════\n");

  } catch (error) {
    console.error("❌ Error:", error.message);
    throw error;
  }
}

fullSystemDiagnostic()
  .catch(console.error)
  .finally(() => process.exit(0));
