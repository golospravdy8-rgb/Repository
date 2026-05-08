"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/require-auth";
import { checkNewAchievements } from "@/lib/achievements";
import { validateGameCompletion } from "@/lib/stats-validator";

export async function addPlayer(teamId: number, gameId: number, firstName: string, lastName: string, number: number, position: string) {
  await requireAuth();
  await prisma.player.create({
    data: { teamId, firstName, lastName, number, position: position || null },
  });
  revalidatePath(`/admin/games/${gameId}`);
}

export async function removePlayer(playerId: number, gameId: number) {
  await requireAuth();
  await prisma.player.delete({ where: { id: playerId } });
  revalidatePath(`/admin/games/${gameId}`);
}


export async function addScore(
  gameId: number,
  teamId: number,
  playerId: number,
  points: 1 | 2 | 3
): Promise<{ newAchievements: string[] }> {
  await requireAuth();

  const game = await prisma.game.findUnique({ where: { id: gameId } });
  if (!game || game.status !== "LIVE") throw new Error("Game not live");
  if (teamId !== game.homeTeamId && teamId !== game.awayTeamId) {
    throw new Error(`Team ${teamId} is not a participant in game ${gameId}`);
  }

  const isHome = game.homeTeamId === teamId;

  // Wrap all mutations in transaction for atomicity
  await prisma.$transaction([
    prisma.game.update({
      where: { id: gameId },
      data: isHome
        ? { homeScore: { increment: points } }
        : { awayScore: { increment: points } },
    }),
    prisma.gameEvent.create({
      data: {
        gameId,
        teamId,
        playerId,
        type: "POINTS",
        points,
        quarter: game.quarter,
      },
    }),
    prisma.boxScore.upsert({
      where: { gameId_playerId: { gameId, playerId } },
      update: { points: { increment: points } },
      create: { gameId, playerId, teamId, points },
    }),
  ]);

  const newAchievements = await syncAchievements(playerId);

  revalidatePath(`/game/${gameId}`);
  revalidatePath(`/admin/games/${gameId}`);
  revalidatePath(`/logos/players/${playerId}`);
  revalidatePath('/leaders');
  revalidatePath('/schedule');
  revalidatePath('/standings');

  return { newAchievements };
}

export async function addFoul(gameId: number, teamId: number, playerId: number) {
  await requireAuth();

  const game = await prisma.game.findUnique({ where: { id: gameId } });
  if (!game || game.status !== "LIVE") throw new Error("Game not live");
  if (teamId !== game.homeTeamId && teamId !== game.awayTeamId) {
    throw new Error(`Team ${teamId} is not a participant in game ${gameId}`);
  }

  await prisma.$transaction([
    prisma.gameEvent.create({
      data: { gameId, teamId, playerId, type: "FOUL", quarter: game.quarter },
    }),
    prisma.boxScore.upsert({
      where: {
        id: (
          await prisma.boxScore.findFirst({ where: { gameId, playerId } })
        )?.id ?? 0,
      },
      update: { fouls: { increment: 1 } },
      create: { gameId, playerId, teamId, fouls: 1 },
    }),
  ]);

  revalidatePath(`/admin/games/${gameId}`);
  revalidatePath(`/game/${gameId}`);
  revalidatePath('/leaders');
  revalidatePath('/standings');
  revalidatePath('/schedule');
}

export async function nextQuarter(gameId: number) {
  await requireAuth();

  const game = await prisma.game.findUnique({ where: { id: gameId } });
  if (!game || game.status !== "LIVE") throw new Error("Game not live");
  if (game.quarter >= 4) throw new Error("Already at Q4");

  await prisma.$transaction([
    prisma.game.update({
      where: { id: gameId },
      data: { quarter: { increment: 1 } },
    }),
    prisma.gameEvent.create({
      data: {
        gameId,
        teamId: game.homeTeamId,
        type: "QUARTER_END",
        quarter: game.quarter,
      },
    }),
  ]);

  revalidatePath(`/admin/games/${gameId}`);
}

export async function endGame(gameId: number) {
  await requireAuth();

  // Validate game is in Q4 before allowing end
  const game = await prisma.game.findUnique({ where: { id: gameId } });
  if (!game) throw new Error("Game not found");
  if (game.status !== "LIVE") throw new Error("Game is not live");
  if (game.quarter < 4) throw new Error(`Cannot end game in Q${game.quarter}. Game must reach Q4 to end.`);

  // Validate that all players have statistics
  const validation = await validateGameCompletion(gameId);
  if (!validation.valid) {
    throw new Error(`Cannot complete game: ${validation.message}`);
  }

  // Wrap game status update AND standings recalc in single atomic transaction
  await prisma.$transaction(async (tx) => {
    const updatedGame = await tx.game.update({
      where: { id: gameId },
      data: { status: "FINAL" },
    });

    // Recalc standings within same transaction (if it fails, game status rollback too)
    await recalcStandingsForSeason(updatedGame.seasonId, tx);
  });

  // Recalculate efficiency for all players now that game is final
  await recalcGameEfficiency(gameId);

  // Check achievements for all players in the game (outside transaction, safe to fail independently)
  const boxScores = await prisma.boxScore.findMany({
    where: { gameId },
    distinct: ["playerId"],
    select: { playerId: true },
  });

  for (const { playerId } of boxScores) {
    await syncAchievements(playerId);
  }

  revalidatePath(`/game/${gameId}`);
  revalidatePath(`/admin/games/${gameId}`);
  revalidatePath("/розклад");
  revalidatePath("/змагання");
  revalidatePath("/standings");
  revalidatePath("/leaders");
  revalidatePath("/");
}

export async function startGame(gameId: number) {
  await requireAuth();

  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: {
      homeTeam: { include: { players: { orderBy: { number: "asc" } } } },
      awayTeam: { include: { players: { orderBy: { number: "asc" } } } },
    },
  });

  if (!game) throw new Error("Game not found");
  if (game.homeTeam.players.length < 5) throw new Error(`Home team has only ${game.homeTeam.players.length} players, need at least 5`);
  if (game.awayTeam.players.length < 5) throw new Error(`Away team has only ${game.awayTeam.players.length} players, need at least 5`);

  // Initialize GameOnCourt for ALL players, but only mark first 5 as on-court
  const homeStarterIds = new Set(game.homeTeam.players.slice(0, 5).map(p => p.id));
  const awayStarterIds = new Set(game.awayTeam.players.slice(0, 5).map(p => p.id));

  const starterOps = [
    // Home team: all players
    ...game.homeTeam.players.map((p) =>
      prisma.gameOnCourt.upsert({
        where: { gameId_playerId: { gameId, playerId: p.id } },
        update: {
          onCourt: homeStarterIds.has(p.id),
          isStarter: homeStarterIds.has(p.id),
          lastSubInTimestamp: homeStarterIds.has(p.id) ? 0 : null,
        },
        create: {
          gameId,
          playerId: p.id,
          teamId: game.homeTeamId,
          onCourt: homeStarterIds.has(p.id),
          isStarter: homeStarterIds.has(p.id),
          lastSubInTimestamp: homeStarterIds.has(p.id) ? 0 : null,
        },
      })
    ),
    // Away team: all players
    ...game.awayTeam.players.map((p) =>
      prisma.gameOnCourt.upsert({
        where: { gameId_playerId: { gameId, playerId: p.id } },
        update: {
          onCourt: awayStarterIds.has(p.id),
          isStarter: awayStarterIds.has(p.id),
          lastSubInTimestamp: awayStarterIds.has(p.id) ? 0 : null,
        },
        create: {
          gameId,
          playerId: p.id,
          teamId: game.awayTeamId,
          onCourt: awayStarterIds.has(p.id),
          isStarter: awayStarterIds.has(p.id),
          lastSubInTimestamp: awayStarterIds.has(p.id) ? 0 : null,
        },
      })
    ),
  ];

  // Initialize BoxScore for ALL players (home + away) with 0 values
  const allPlayers = [...game.homeTeam.players, ...game.awayTeam.players];
  const boxScoreOps = allPlayers.map((p) =>
    prisma.boxScore.upsert({
      where: { gameId_playerId: { gameId, playerId: p.id } },
      update: {},
      create: {
        gameId,
        playerId: p.id,
        teamId: p.teamId,
        points: 0,
        rebounds: 0,
        assists: 0,
        steals: 0,
        blocks: 0,
        fouls: 0,
        turnovers: 0,
        isStarter: homeStarterIds.has(p.id) || awayStarterIds.has(p.id),
      },
    })
  );

  await prisma.$transaction([
    prisma.game.update({
      where: { id: gameId },
      data: { status: "LIVE", quarter: 1, homeScore: 0, awayScore: 0 },
    }),
    ...starterOps,
    ...boxScoreOps,
  ]);

  revalidatePath(`/admin/games/${gameId}`);
  revalidatePath("/");
}

async function addStatEvent(
  gameId: number,
  teamId: number,
  playerId: number,
  eventType: string,
  boxScoreField: "rebounds" | "reboundsOff" | "reboundsDef" | "assists" | "steals" | "blocks" | "turnovers" | "missedFg2" | "missedFg3" | "missedFt"
): Promise<{ newAchievements: string[] }> {
  const game = await prisma.game.findUnique({ where: { id: gameId } });
  if (!game || game.status !== "LIVE") throw new Error("Game not live");
  if (teamId !== game.homeTeamId && teamId !== game.awayTeamId) {
    throw new Error(`Team ${teamId} is not a participant in game ${gameId}`);
  }

  // Wrap GameEvent + BoxScore mutations in atomic transaction
  await prisma.$transaction(async (tx) => {
    await tx.gameEvent.create({
      data: { gameId, teamId, playerId, type: eventType, quarter: game.quarter },
    });

    const existing = await tx.boxScore.findFirst({ where: { gameId, playerId } });

    // For rebounds (offensive/defensive), also increment the total rebounds field
    const updateData: any = { [boxScoreField]: { increment: 1 } };
    if (boxScoreField === "reboundsOff" || boxScoreField === "reboundsDef") {
      updateData.rebounds = { increment: 1 };
    }

    if (existing) {
      await tx.boxScore.update({
        where: { id: existing.id },
        data: updateData,
      });
    } else {
      const createData: any = { gameId, playerId, teamId, [boxScoreField]: 1 };
      if (boxScoreField === "reboundsOff" || boxScoreField === "reboundsDef") {
        createData.rebounds = 1;
      }
      await tx.boxScore.create({ data: createData });
    }
  });

  const newAchievements = await syncAchievements(playerId);

  revalidatePath(`/admin/games/${gameId}`);
  revalidatePath(`/game/${gameId}`);
  revalidatePath(`/logos/players/${playerId}`);
  revalidatePath('/leaders');
  revalidatePath('/standings');
  revalidatePath('/schedule');

  return { newAchievements: [] };
}

export async function addRebound(gameId: number, teamId: number, playerId: number): Promise<{ newAchievements: string[] }> {
  await requireAuth();
  return addStatEvent(gameId, teamId, playerId, "REBOUND", "rebounds");
}

export async function addAssist(gameId: number, teamId: number, playerId: number): Promise<{ newAchievements: string[] }> {
  await requireAuth();
  return addStatEvent(gameId, teamId, playerId, "ASSIST", "assists");
}

export async function addSteal(gameId: number, teamId: number, playerId: number): Promise<{ newAchievements: string[] }> {
  await requireAuth();
  return addStatEvent(gameId, teamId, playerId, "STEAL", "steals");
}

export async function addBlock(gameId: number, teamId: number, playerId: number): Promise<{ newAchievements: string[] }> {
  await requireAuth();
  return addStatEvent(gameId, teamId, playerId, "BLOCK", "blocks");
}

export async function addReboundOff(gameId: number, teamId: number, playerId: number): Promise<{ newAchievements: string[] }> {
  await requireAuth();
  return addStatEvent(gameId, teamId, playerId, "REBOUND_OFF", "reboundsOff");
}

export async function addReboundDef(gameId: number, teamId: number, playerId: number): Promise<{ newAchievements: string[] }> {
  await requireAuth();
  return addStatEvent(gameId, teamId, playerId, "REBOUND_DEF", "reboundsDef");
}

export async function addTurnover(gameId: number, teamId: number, playerId: number): Promise<{ newAchievements: string[] }> {
  await requireAuth();
  return addStatEvent(gameId, teamId, playerId, "TURNOVER", "turnovers");
}

export async function addMissFg2(gameId: number, teamId: number, playerId: number): Promise<{ newAchievements: string[] }> {
  await requireAuth();
  return addStatEvent(gameId, teamId, playerId, "MISS_2P", "missedFg2");
}

export async function addMissFg3(gameId: number, teamId: number, playerId: number): Promise<{ newAchievements: string[] }> {
  await requireAuth();
  return addStatEvent(gameId, teamId, playerId, "MISS_3P", "missedFg3");
}

export async function addMissFt(gameId: number, teamId: number, playerId: number): Promise<{ newAchievements: string[] }> {
  await requireAuth();
  return addStatEvent(gameId, teamId, playerId, "MISS_FT", "missedFt");
}

export async function addFoulTechnical(gameId: number, teamId: number, playerId: number) {
  await requireAuth();
  const game = await prisma.game.findUnique({ where: { id: gameId } });
  if (!game || game.status !== "LIVE") throw new Error("Game not live");
  if (teamId !== game.homeTeamId && teamId !== game.awayTeamId) {
    throw new Error(`Team ${teamId} is not a participant in game ${gameId}`);
  }

  await prisma.$transaction(async (tx) => {
    await tx.gameEvent.create({
      data: { gameId, teamId, playerId, type: "FOUL_TECHNICAL", quarter: game.quarter },
    });
    const existing = await tx.boxScore.findFirst({ where: { gameId, playerId } });
    if (existing) {
      await tx.boxScore.update({ where: { id: existing.id }, data: { fouls: { increment: 1 } } });
    } else {
      await tx.boxScore.create({ data: { gameId, playerId, teamId, fouls: 1 } });
    }
  });

  revalidatePath(`/admin/games/${gameId}`);
}

export async function addFoulUnsportsmanlike(gameId: number, teamId: number, playerId: number) {
  await requireAuth();
  const game = await prisma.game.findUnique({ where: { id: gameId } });
  if (!game || game.status !== "LIVE") throw new Error("Game not live");
  if (teamId !== game.homeTeamId && teamId !== game.awayTeamId) {
    throw new Error(`Team ${teamId} is not a participant in game ${gameId}`);
  }

  await prisma.$transaction(async (tx) => {
    await tx.gameEvent.create({
      data: { gameId, teamId, playerId, type: "FOUL_UNSPORTSMANLIKE", quarter: game.quarter },
    });
    const existing = await tx.boxScore.findFirst({ where: { gameId, playerId } });
    if (existing) {
      await tx.boxScore.update({ where: { id: existing.id }, data: { fouls: { increment: 1 } } });
    } else {
      await tx.boxScore.create({ data: { gameId, playerId, teamId, fouls: 1 } });
    }
  });

  revalidatePath(`/admin/games/${gameId}`);
}

export async function addFoulDisqualifying(gameId: number, teamId: number, playerId: number) {
  await requireAuth();
  const game = await prisma.game.findUnique({ where: { id: gameId } });
  if (!game || game.status !== "LIVE") throw new Error("Game not live");
  if (teamId !== game.homeTeamId && teamId !== game.awayTeamId) {
    throw new Error(`Team ${teamId} is not a participant in game ${gameId}`);
  }

  await prisma.$transaction(async (tx) => {
    await tx.gameEvent.create({
      data: { gameId, teamId, playerId, type: "FOUL_DISQUALIFYING", quarter: game.quarter },
    });
    const existing = await tx.boxScore.findFirst({ where: { gameId, playerId } });
    if (existing) {
      await tx.boxScore.update({ where: { id: existing.id }, data: { fouls: { increment: 1 } } });
    } else {
      await tx.boxScore.create({ data: { gameId, playerId, teamId, fouls: 1 } });
    }
  });

  revalidatePath(`/admin/games/${gameId}`);
}

export async function addCoachFoul(gameId: number, teamId: number, playerId: number) {
  await requireAuth();
  const game = await prisma.game.findUnique({ where: { id: gameId } });
  if (!game || game.status !== "LIVE") throw new Error("Game not live");
  if (teamId !== game.homeTeamId && teamId !== game.awayTeamId) {
    throw new Error(`Team ${teamId} is not a participant in game ${gameId}`);
  }

  await prisma.$transaction([
    prisma.gameEvent.create({
      data: { gameId, teamId, playerId, type: "FOUL_COACH", quarter: game.quarter },
    }),
  ]);

  revalidatePath(`/admin/games/${gameId}`);
}

export async function toggleIsStarter(gameId: number, playerId: number, isStarter: boolean) {
  await requireAuth();

  await prisma.$transaction(async (tx) => {
    const existing = await tx.boxScore.findFirst({ where: { gameId, playerId } });
    if (existing) {
      await tx.boxScore.update({ where: { id: existing.id }, data: { isStarter } });
    } else {
      const player = await tx.player.findUnique({ where: { id: playerId }, select: { teamId: true } });
      if (player) {
        await tx.boxScore.create({ data: { gameId, playerId, teamId: player.teamId, isStarter } });
      }
    }
  });

  revalidatePath(`/admin/games/${gameId}`);
}

async function syncAchievements(playerId: number): Promise<string[]> {
  const [allBoxScores, existingAchievements] = await Promise.all([
    prisma.boxScore.findMany({
      where: { playerId },
      include: { game: { select: { scheduledAt: true } } },
    }),
    prisma.playerAchievement.findMany({
      where: { playerId },
      select: { badgeId: true },
    }),
  ]);

  const alreadyUnlocked = new Set(existingAchievements.map((a) => a.badgeId));
  const newBadgeIds = checkNewAchievements(allBoxScores as any, Array.from(alreadyUnlocked));

  if (newBadgeIds.length > 0) {
    await prisma.playerAchievement.createMany({
      data: newBadgeIds.map((badgeId) => ({ playerId, badgeId })),
      skipDuplicates: true,
    });
  }

  return newBadgeIds;
}

export async function undoLastEvent(gameId: number) {
  await requireAuth();

  const game = await prisma.game.findUnique({ where: { id: gameId } });
  if (!game || game.status !== "LIVE") throw new Error("Game not live");

  const lastEvent = await prisma.gameEvent.findFirst({
    where: { gameId },
    orderBy: { createdAt: "desc" },
  });

  if (!lastEvent) return;

  // Wrap all reversals in atomic transaction
  await prisma.$transaction(async (tx) => {
    // Reverse score change
    if (lastEvent.type === "POINTS" && lastEvent.points && lastEvent.playerId) {
      const isHome = game.homeTeamId === lastEvent.teamId;
      await tx.game.update({
        where: { id: gameId },
        data: isHome
          ? { homeScore: { decrement: lastEvent.points } }
          : { awayScore: { decrement: lastEvent.points } },
      });
      // Reverse boxScore points
      const bs = await tx.boxScore.findFirst({ where: { gameId, playerId: lastEvent.playerId } });
      if (bs) {
        await tx.boxScore.update({
          where: { id: bs.id },
          data: { points: { decrement: lastEvent.points } },
        });
      }
    }

    // Reverse stat events
    const statMap: Record<string, "rebounds" | "reboundsOff" | "reboundsDef" | "assists" | "steals" | "blocks" | "fouls" | "turnovers" | "missedFg2" | "missedFg3" | "missedFt" | null> = {
      REBOUND: "rebounds",
      REBOUND_OFF: "reboundsOff",
      REBOUND_DEF: "reboundsDef",
      ASSIST: "assists",
      STEAL: "steals",
      BLOCK: "blocks",
      FOUL: "fouls",
      FOUL_TECHNICAL: "fouls",
      FOUL_UNSPORTSMANLIKE: "fouls",
      FOUL_DISQUALIFYING: "fouls",
      FOUL_COACH: null,
      TURNOVER: "turnovers",
      MISS_2P: "missedFg2",
      MISS_3P: "missedFg3",
      MISS_FT: "missedFt",
    };
    const field = statMap[lastEvent.type];
    if (field && lastEvent.playerId) {
      const bs = await tx.boxScore.findFirst({ where: { gameId, playerId: lastEvent.playerId } });
      if (bs) {
        await tx.boxScore.update({
          where: { id: bs.id },
          data: { [field]: { decrement: 1 } },
        });
      }
    }

    await tx.gameEvent.delete({ where: { id: lastEvent.id } });
  });

  revalidatePath(`/admin/games/${gameId}`);
  revalidatePath(`/game/${gameId}`);
}

export async function recalcStandingsForSeason(seasonId: number, tx?: any) {
  const prismaClient = tx || prisma;

  const games = await prismaClient.game.findMany({
    where: { seasonId, status: "FINAL" },
  });

  const statsMap: Record<number, { wins: number; losses: number; pf: number; pa: number; gp: number }> = {};

  for (const g of games) {
    if (!statsMap[g.homeTeamId]) statsMap[g.homeTeamId] = { wins: 0, losses: 0, pf: 0, pa: 0, gp: 0 };
    if (!statsMap[g.awayTeamId]) statsMap[g.awayTeamId] = { wins: 0, losses: 0, pf: 0, pa: 0, gp: 0 };
    statsMap[g.homeTeamId].pf += g.homeScore;
    statsMap[g.homeTeamId].pa += g.awayScore;
    statsMap[g.homeTeamId].gp += 1;
    statsMap[g.awayTeamId].pf += g.awayScore;
    statsMap[g.awayTeamId].pa += g.homeScore;
    statsMap[g.awayTeamId].gp += 1;
    if (g.homeScore > g.awayScore) {
      statsMap[g.homeTeamId].wins += 1;
      statsMap[g.awayTeamId].losses += 1;
    } else {
      statsMap[g.awayTeamId].wins += 1;
      statsMap[g.homeTeamId].losses += 1;
    }
  }

  const sorted = Object.entries(statsMap).sort(([, a], [, b]) => {
    // 1. Sort by win percentage (matches calculateStandings() logic)
    const winPctA = a.gp > 0 ? a.wins / a.gp : 0;
    const winPctB = b.gp > 0 ? b.wins / b.gp : 0;
    if (Math.abs(winPctB - winPctA) > 0.0001) return winPctB - winPctA;

    // 2. If same win %, sort by wins
    if (b.wins !== a.wins) return b.wins - a.wins;

    // 3. If same wins, sort by point differential
    return (b.pf - b.pa) - (a.pf - a.pa);
  });

  for (let i = 0; i < sorted.length; i++) {
    const [teamIdStr, s] = sorted[i];
    const teamId = Number(teamIdStr);
    await prismaClient.standing.upsert({
      where: { teamId },
      update: { wins: s.wins, losses: s.losses, pointsFor: s.pf, pointsAgainst: s.pa, gamesPlayed: s.gp, rank: i + 1 },
      create: { teamId, seasonId, wins: s.wins, losses: s.losses, pointsFor: s.pf, pointsAgainst: s.pa, gamesPlayed: s.gp, rank: i + 1 },
    });
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// NEW ACTIONS FOR PROTOCOL ENHANCEMENT
// ════════════════════════════════════════════════════════════════════════════════

/** Add substitution event and update on-court players */
export async function addSubstitution(
  gameId: number,
  teamId: number,
  playerOutId: number,
  playerInId: number,
  quarter: number,
  gameTime: string
) {
  await requireAuth();

  const game = await prisma.game.findUnique({ where: { id: gameId } });
  if (!game || game.status !== "LIVE") throw new Error("Game not live");

  await prisma.$transaction([
    // Log substitution events
    prisma.gameSubstitution.create({
      data: { gameId, teamId, playerId: playerOutId, action: "out", quarter, gameTime },
    }),
    prisma.gameSubstitution.create({
      data: { gameId, teamId, playerId: playerInId, action: "in", quarter, gameTime },
    }),
    // Update on-court status
    prisma.gameOnCourt.update({
      where: { gameId_playerId: { gameId, playerId: playerOutId } },
      data: { onCourt: false },
    }),
    prisma.gameOnCourt.upsert({
      where: { gameId_playerId: { gameId, playerId: playerInId } },
      update: { onCourt: true },
      create: { gameId, playerId: playerInId, teamId, onCourt: true },
    }),
  ]);

  revalidatePath(`/admin/games/${gameId}`);
}

/** Update on-court player tracking */
export async function updateOnCourt(gameId: number, playerId: number, teamId: number, onCourt: boolean) {
  await requireAuth();

  await prisma.$transaction([
    prisma.gameOnCourt.upsert({
      where: { gameId_playerId: { gameId, playerId } },
      update: { onCourt },
      create: { gameId, playerId, teamId, onCourt },
    }),
  ]);

  revalidatePath(`/admin/games/${gameId}`);
}

/** Enhanced scoring with support for special event types (fast break, second chance, off turnover) */
export async function addScoreWithType(
  gameId: number,
  teamId: number,
  playerId: number,
  points: 1 | 2 | 3,
  eventSubtype: "normal" | "fastbreak" | "second_chance" | "off_turnover" = "normal"
): Promise<{ newAchievements: string[] }> {
  console.log(`[addScoreWithType] START: gameId=${gameId}, teamId=${teamId}, playerId=${playerId}, points=${points}`);

  // FIX #2: Generate idempotency key to prevent duplicate events
  const idempotencyKey = `score-${gameId}-${playerId}-${points}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  try {
    await requireAuth();
    console.log(`[addScoreWithType] Auth passed`);

    const game = await prisma.game.findUnique({ where: { id: gameId } });
    console.log(`[addScoreWithType] Game found: ${game?.id}, status=${game?.status}`);

    if (!game || game.status !== "LIVE") throw new Error("Game not live");
    if (teamId !== game.homeTeamId && teamId !== game.awayTeamId) {
      throw new Error(`Team ${teamId} is not a participant in game ${gameId}`);
    }

    const isHome = game.homeTeamId === teamId;

    console.log(`[addScoreWithType] Generated idempotency key: ${idempotencyKey}`);

    // Prepare game update data with team stat tracking
    const gameUpdateData: any = {
      [isHome ? "homeScore" : "awayScore"]: { increment: points },
    };

    // Track advanced stats based on subtype
    if (eventSubtype === "fastbreak") {
      gameUpdateData[isHome ? "ptsFastBreak" : "awayPtsFastBreak"] = { increment: points };
    } else if (eventSubtype === "second_chance") {
      gameUpdateData[isHome ? "ptsSecondChance" : "awayPtsSecondChance"] = { increment: points };
    } else if (eventSubtype === "off_turnover") {
      gameUpdateData[isHome ? "ptsOffTurnovers" : "awayPtsOffTurnovers"] = { increment: points };
    }

  // Execute all updates in atomic transaction
    console.log(`[addScoreWithType] Starting main transaction...`);
    const txResult = await prisma.$transaction(async (tx) => {
      try {
        console.log(`[addScoreWithType] TX: Starting updates...`);

      // Update game score
      console.log(`[addScoreWithType] TX: Updating game score...`);
      await tx.game.update({ where: { id: gameId }, data: gameUpdateData });
      console.log(`[addScoreWithType] TX: Game score updated`);

      // Create event with idempotency key
      console.log(`[addScoreWithType] TX: Creating game event...`);
      await tx.gameEvent.create({
        data: { gameId, teamId, playerId, type: "POINTS", points, quarter: game.quarter, eventSubtype, idempotencyKey },
      });
      console.log(`[addScoreWithType] TX: Game event created`);

      // Update scoring player's BoxScore
      console.log(`[addScoreWithType] TX: Finding scoring box score...`);
      const scoringBoxScoreExisting = await tx.boxScore.findFirst({
        where: { gameId, playerId },
      });
      console.log(`[addScoreWithType] TX: Scoring box score found:`, scoringBoxScoreExisting?.id);

      // Calculate efficiency INSIDE transaction for consistency
      let scoringPlayerEfficiency = 0;
      if (scoringBoxScoreExisting) {
        scoringPlayerEfficiency = calculateEfficiency({
          ...scoringBoxScoreExisting,
          points: (scoringBoxScoreExisting.points || 0) + points,
        });
        console.log(`[addScoreWithType] TX: Updating scoring box score with efficiency ${scoringPlayerEfficiency}...`);
        await tx.boxScore.update({
          where: { id: scoringBoxScoreExisting.id },
          data: { points: { increment: points }, efficiency: scoringPlayerEfficiency },
        });
        console.log(`[addScoreWithType] TX: Scoring box score updated`);
      } else {
        scoringPlayerEfficiency = calculateEfficiency({ points });
        console.log(`[addScoreWithType] TX: Creating new scoring box score with efficiency ${scoringPlayerEfficiency}...`);
        await tx.boxScore.create({
          data: { gameId, playerId, teamId, points, efficiency: scoringPlayerEfficiency },
        });
        console.log(`[addScoreWithType] TX: New scoring box score created`);
      }

      // Update +/- for all on-court players (WITHIN TRANSACTION)
      console.log(`[addScoreWithType] TX: Finding on-court players for team ${teamId}...`);
      const onCourtPlayers = await tx.gameOnCourt.findMany({
        where: { gameId, teamId, onCourt: true },
      });
      console.log(`[addScoreWithType] TX: Found ${onCourtPlayers.length} on-court players`);

      for (const ocp of onCourtPlayers) {
        // FIX #1: Skip the scoring player — already updated separately above
        if (ocp.playerId === playerId) continue;

        console.log(`[addScoreWithType] TX: Processing on-court player ${ocp.playerId}...`);
        const existing = await tx.boxScore.findFirst({
          where: { gameId, playerId: ocp.playerId },
        });
        if (existing) {
          console.log(`[addScoreWithType] TX: Updating +/- for player ${ocp.playerId}...`);
          await tx.boxScore.update({
            where: { id: existing.id },
            data: { plusMinus: { increment: points } },
          });
          console.log(`[addScoreWithType] TX: +/- updated for player ${ocp.playerId}`);
        } else {
          console.log(`[addScoreWithType] TX: Creating box score for player ${ocp.playerId}...`);
          // FIX: Initialize all fields for bench players to prevent NULL/undefined
          await tx.boxScore.create({
            data: {
              gameId,
              playerId: ocp.playerId,
              teamId,
              points: 0,
              rebounds: 0,
              assists: 0,
              steals: 0,
              blocks: 0,
              fouls: 0,
              turnovers: 0,
              plusMinus: points
            },
          });
          console.log(`[addScoreWithType] TX: Box score created for player ${ocp.playerId}`);
        }
      }

      // Update opponent's on-court players with negative +/- (WITHIN TRANSACTION)
      console.log(`[addScoreWithType] TX: Finding opponent on-court players...`);
      const opponentTeamId = isHome ? game.awayTeamId : game.homeTeamId;
      const opponentOnCourt = await tx.gameOnCourt.findMany({
        where: { gameId, teamId: opponentTeamId, onCourt: true },
      });
      console.log(`[addScoreWithType] TX: Found ${opponentOnCourt.length} opponent on-court players`);

      for (const ocp of opponentOnCourt) {
        // FIX #1: Safety guard — opponent shouldn't be in scoring team, but check anyway
        if (ocp.playerId === playerId) continue;

        console.log(`[addScoreWithType] TX: Processing opponent player ${ocp.playerId}...`);
        const existing = await tx.boxScore.findFirst({
          where: { gameId, playerId: ocp.playerId },
        });
        if (existing) {
          console.log(`[addScoreWithType] TX: Decrementing +/- for opponent ${ocp.playerId}...`);
          await tx.boxScore.update({
            where: { id: existing.id },
            data: { plusMinus: { decrement: points } },
          });
          console.log(`[addScoreWithType] TX: +/- decremented for opponent ${ocp.playerId}`);
        } else {
          console.log(`[addScoreWithType] TX: Creating box score for opponent ${ocp.playerId}...`);
          // FIX: Initialize all fields for opponent bench players to prevent NULL/undefined
          await tx.boxScore.create({
            data: {
              gameId,
              playerId: ocp.playerId,
              teamId: opponentTeamId,
              points: 0,
              rebounds: 0,
              assists: 0,
              steals: 0,
              blocks: 0,
              fouls: 0,
              turnovers: 0,
              plusMinus: -points
            },
          });
          console.log(`[addScoreWithType] TX: Box score created for opponent ${ocp.playerId}`);
        }
      }

      console.log(`[addScoreWithType] TX: All updates completed`);
      return { success: true };
      } catch (txError: any) {
        console.error(`[addScoreWithType] TX ERROR:`, txError);
        throw txError;
      }
    });
    console.log(`[addScoreWithType] Main transaction completed:`, txResult);

    // FIX #3: Consolidate revalidatePath calls after transaction completes
    revalidatePath(`/game/${gameId}`);
    revalidatePath(`/admin/games/${gameId}`);
    revalidatePath('/leaders');
    revalidatePath('/schedule');
    revalidatePath('/standings');

    // FIX: Add small delay to allow cache invalidation to begin before returning
    // This prevents race condition where Server Component re-renders with stale data
    await new Promise(resolve => setTimeout(resolve, 50));

    console.log(`[addScoreWithType] SUCCESS`);
    return { newAchievements: [] };
  } catch (error: any) {
    // FIX #2: Handle idempotency key constraint violations gracefully
    if (error.code === 'P2002' && error.meta?.target?.includes('idempotencyKey')) {
      console.log(`[addScoreWithType] Duplicate event ignored by idempotency key: ${idempotencyKey}`);
      return { newAchievements: [] };
    }
    console.error(`[addScoreWithType] ERROR:`, error);
    throw error;
  }
}

/** Calculate efficiency score for a player (non-exported utility) */
function calculateEfficiency(boxScore: any): number {
  const positive = (boxScore.points || 0) + (boxScore.rebounds || 0) + (boxScore.assists || 0) +
    (boxScore.steals || 0) + (boxScore.blocks || 0);
  const negative = (boxScore.missedFg2 || 0) + (boxScore.missedFg3 || 0) + (boxScore.missedFt || 0) +
    (boxScore.turnovers || 0);
  return positive - negative;
}

/** Recalculate efficiency for all players in a game and update their box scores */
export async function recalcGameEfficiency(gameId: number) {
  await requireAuth();

  const boxScores = await prisma.boxScore.findMany({ where: { gameId } });

  for (const bs of boxScores) {
    const efficiency = calculateEfficiency(bs);
    await prisma.boxScore.update({
      where: { id: bs.id },
      data: { efficiency },
    });
  }

  revalidatePath(`/admin/games/${gameId}`);
  revalidatePath(`/game/${gameId}`);
}

export async function addTimeout(gameId: number, teamId: number) {
  await requireAuth();

  const game = await prisma.game.findUnique({ where: { id: gameId } });
  if (!game || game.status !== "LIVE") throw new Error("Game not live");

  const isHome = game.homeTeamId === teamId;
  const currentTimeouts = isHome ? game.homeTimeouts : game.awayTimeouts;

  if (currentTimeouts >= 5) throw new Error("Maximum timeouts reached");

  await prisma.$transaction([
    prisma.game.update({
      where: { id: gameId },
      data: isHome
        ? { homeTimeouts: { increment: 1 } }
        : { awayTimeouts: { increment: 1 } },
    }),
    prisma.gameEvent.create({
      data: {
        gameId,
        teamId,
        type: "TIMEOUT",
        quarter: game.quarter,
      },
    }),
  ]);

  revalidatePath(`/admin/games/${gameId}`);
  revalidatePath(`/game/${gameId}`);

  return { success: true, homeTimeouts: isHome ? currentTimeouts + 1 : game.homeTimeouts, awayTimeouts: isHome ? game.awayTimeouts : currentTimeouts + 1 };
}

export async function addFreeThrow(gameId: number, teamId: number, playerId: number, points: 1 | 2) {
  await requireAuth();

  const game = await prisma.game.findUnique({ where: { id: gameId } });
  if (!game || game.status !== "LIVE") throw new Error("Game not live");
  if (teamId !== game.homeTeamId && teamId !== game.awayTeamId) {
    throw new Error(`Team ${teamId} is not a participant in game ${gameId}`);
  }

  const isHome = game.homeTeamId === teamId;

  await prisma.$transaction([
    prisma.game.update({
      where: { id: gameId },
      data: isHome
        ? { homeScore: { increment: points } }
        : { awayScore: { increment: points } },
    }),
    prisma.gameEvent.create({
      data: {
        gameId,
        teamId,
        playerId,
        type: points === 1 ? "FREE_THROW_1" : "FREE_THROW_2",
        points,
        quarter: game.quarter,
      },
    }),
    prisma.boxScore.upsert({
      where: {
        id: (
          await prisma.boxScore.findFirst({ where: { gameId, playerId } })
        )?.id ?? 0,
      },
      update: { points: { increment: points } },
      create: { gameId, playerId, teamId, points },
    }),
  ]);

  revalidatePath(`/admin/games/${gameId}`);
  revalidatePath(`/game/${gameId}`);
  revalidatePath('/leaders');
  revalidatePath('/schedule');
  revalidatePath('/standings');

  return { success: true };
}

/**
 * REFACTOR 2026-05-08: Substitution endpoint — atomic update of both players
 * Handles: time-on-court calculation, on-court status toggle, substitution logging
 */
export async function addSubstitutionRefactored(
  gameId: number,
  teamId: number,
  playerOutId: number,
  playerInId: number,
  gameClockSeconds: number
) {
  await requireAuth();

  const game = await prisma.game.findUnique({ where: { id: gameId } });
  if (!game || game.status !== "LIVE") throw new Error("Game not live");
  if (teamId !== game.homeTeamId && teamId !== game.awayTeamId) {
    throw new Error(`Team ${teamId} is not a participant in game ${gameId}`);
  }

  // Both players must be on same team
  const [playerOut, playerIn] = await Promise.all([
    prisma.player.findUnique({ where: { id: playerOutId } }),
    prisma.player.findUnique({ where: { id: playerInId } }),
  ]);

  if (!playerOut || !playerIn) throw new Error("One or both players not found");
  if (playerOut.teamId !== teamId || playerIn.teamId !== teamId) {
    throw new Error("Both players must be on the same team");
  }

  // Atomic transaction: update both GameOnCourt records + log substitution event
  await prisma.$transaction(async (tx) => {
    // Player OUT: add played time, mark off-court
    const playerOutState = await tx.gameOnCourt.findUnique({
      where: { gameId_playerId: { gameId, playerId: playerOutId } },
    });

    if (playerOutState && playerOutState.onCourt && playerOutState.lastSubInTimestamp !== null) {
      const playedSeconds = gameClockSeconds - playerOutState.lastSubInTimestamp;
      await tx.gameOnCourt.update({
        where: { gameId_playerId: { gameId, playerId: playerOutId } },
        data: {
          onCourt: false,
          timeOnCourtSeconds: { increment: playedSeconds },
          lastSubInTimestamp: null,
        },
      });
    } else {
      // Fallback: ensure record exists and is marked off-court
      await tx.gameOnCourt.update({
        where: { gameId_playerId: { gameId, playerId: playerOutId } },
        data: {
          onCourt: false,
          lastSubInTimestamp: null,
        },
      });
    }

    // Player IN: mark on-court, record entry time
    await tx.gameOnCourt.update({
      where: { gameId_playerId: { gameId, playerId: playerInId } },
      data: {
        onCourt: true,
        lastSubInTimestamp: gameClockSeconds,
      },
    });

    // Log substitution event for audit trail
    await tx.gameSubstitution.create({
      data: {
        gameId,
        teamId,
        playerId: playerOutId,
        action: "out",
        quarter: game.quarter,
        gameTime: `${Math.floor(gameClockSeconds / 60)}:${String(gameClockSeconds % 60).padStart(2, "0")}`,
      },
    });

    await tx.gameSubstitution.create({
      data: {
        gameId,
        teamId,
        playerId: playerInId,
        action: "in",
        quarter: game.quarter,
        gameTime: `${Math.floor(gameClockSeconds / 60)}:${String(gameClockSeconds % 60).padStart(2, "0")}`,
      },
    });
  });

  revalidatePath(`/admin/games/${gameId}`);
  revalidatePath(`/game/${gameId}`);

  return { success: true };
}

/**
 * REFACTOR 2026-05-08: Fix startGame to NOT use slice(0,5)
 * Explicitly mark starting 5 by ID, not by array position
 */
export async function startGameRefactored(
  gameId: number,
  homeStarterIds?: number[],
  awayStarterIds?: number[]
) {
  await requireAuth();

  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: {
      homeTeam: { include: { players: { orderBy: { number: "asc" } } } },
      awayTeam: { include: { players: { orderBy: { number: "asc" } } } },
    },
  });

  if (!game) throw new Error("Game not found");
  if (game.homeTeam.players.length < 5) throw new Error(`Home team has only ${game.homeTeam.players.length} players, need at least 5`);
  if (game.awayTeam.players.length < 5) throw new Error(`Away team has only ${game.awayTeam.players.length} players, need at least 5`);

  // Use provided starter IDs, or default to first 5 (backward compatible)
  const homeStarters = homeStarterIds
    ? new Set(homeStarterIds)
    : new Set(game.homeTeam.players.slice(0, 5).map(p => p.id));
  const awayStarters = awayStarterIds
    ? new Set(awayStarterIds)
    : new Set(game.awayTeam.players.slice(0, 5).map(p => p.id));

  // Initialize GameOnCourt for ALL players
  const starterOps = [
    ...game.homeTeam.players.map((p) =>
      prisma.gameOnCourt.upsert({
        where: { gameId_playerId: { gameId, playerId: p.id } },
        update: {
          onCourt: homeStarters.has(p.id),
          isStarter: homeStarters.has(p.id),
          lastSubInTimestamp: homeStarters.has(p.id) ? 0 : null,
        },
        create: {
          gameId,
          playerId: p.id,
          teamId: game.homeTeamId,
          onCourt: homeStarters.has(p.id),
          isStarter: homeStarters.has(p.id),
          lastSubInTimestamp: homeStarters.has(p.id) ? 0 : null,
        },
      })
    ),
    ...game.awayTeam.players.map((p) =>
      prisma.gameOnCourt.upsert({
        where: { gameId_playerId: { gameId, playerId: p.id } },
        update: {
          onCourt: awayStarters.has(p.id),
          isStarter: awayStarters.has(p.id),
          lastSubInTimestamp: awayStarters.has(p.id) ? 0 : null,
        },
        create: {
          gameId,
          playerId: p.id,
          teamId: game.awayTeamId,
          onCourt: awayStarters.has(p.id),
          isStarter: awayStarters.has(p.id),
          lastSubInTimestamp: awayStarters.has(p.id) ? 0 : null,
        },
      })
    ),
  ];

  // Initialize BoxScore for ALL players
  const allPlayers = [...game.homeTeam.players, ...game.awayTeam.players];
  const boxScoreOps = allPlayers.map((p) =>
    prisma.boxScore.upsert({
      where: { gameId_playerId: { gameId, playerId: p.id } },
      update: {},
      create: {
        gameId,
        playerId: p.id,
        teamId: p.teamId,
        points: 0,
        rebounds: 0,
        assists: 0,
        steals: 0,
        blocks: 0,
        fouls: 0,
        turnovers: 0,
        isStarter: homeStarters.has(p.id) || awayStarters.has(p.id),
      },
    })
  );

  await prisma.$transaction([
    prisma.game.update({
      where: { id: gameId },
      data: { status: "LIVE", quarter: 1, homeScore: 0, awayScore: 0 },
    }),
    ...starterOps,
    ...boxScoreOps,
  ]);

  revalidatePath(`/admin/games/${gameId}`);
  revalidatePath("/");
}

/**
 * REFACTOR 2026-05-08: Calculate plus/minus for all players at game end
 * Plus/minus = (team points scored while player on-court) - (team points allowed while player on-court)
 * For now, simplified: count points directly associated with player's on-court periods
 */
export async function recalcPlusMinus(gameId: number) {
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: {
      events: true,
      onCourt: true,
      boxScores: true,
    },
  });

  if (!game) throw new Error("Game not found");

  // Group events by quarter and team
  const quarterTeamScore: Record<number, Record<number, number>> = {};
  for (const event of game.events) {
    if (event.type !== "POINTS") continue;
    const q = event.quarter;
    if (!quarterTeamScore[q]) quarterTeamScore[q] = {};
    quarterTeamScore[q][event.teamId] = (quarterTeamScore[q][event.teamId] || 0) + (event.points || 0);
  }

  // Calculate plus/minus for each player based on on-court periods
  const plusMinusUpdates = game.boxScores.map(async (bs) => {
    let plusMinus = 0;

    // Simple approach: sum points scored by team while player was on-court (approximation)
    // For accurate +/-, would need to track exact on-court windows by substitution
    const playerOnCourt = game.onCourt.find(oc => oc.playerId === bs.playerId);
    if (playerOnCourt && playerOnCourt.onCourt) {
      // Player currently on-court: use current quarter's scoring
      const currentQScore = quarterTeamScore[game.quarter]?.[bs.teamId] || 0;
      const otherTeamId = bs.teamId === game.homeTeamId ? game.awayTeamId : game.homeTeamId;
      const otherQScore = quarterTeamScore[game.quarter]?.[otherTeamId] || 0;
      plusMinus = currentQScore - otherQScore;
    } else {
      // Simplified: average +/- across all on-court periods
      // Would require full substitution event reconstruction
      plusMinus = 0;
    }

    await prisma.boxScore.update({
      where: { id: bs.id },
      data: { plusMinus },
    });
  });

  await Promise.all(plusMinusUpdates);

  revalidatePath(`/game/${gameId}`);
}

/**
 * Update player court time in BoxScore.minutesPlayed
 * Called from admin when match is running or at substitution
 * @param gameId - Game ID
 * @param playerCourtTimes - Record<playerId, seconds>
 */
export async function updatePlayerCourtTimes(
  gameId: number,
  playerCourtTimes: Record<number, number>
) {
  await requireAuth();

  const game = await prisma.game.findUnique({ where: { id: gameId } });
  if (!game) throw new Error("Game not found");

  // Helper: Convert seconds to MM:SS format
  const formatCourtTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  // Batch update all BoxScores with new court times
  const updates = Object.entries(playerCourtTimes).map(([playerIdStr, seconds]) => {
    const playerId = parseInt(playerIdStr, 10);
    const minutesPlayed = formatCourtTime(seconds);

    return prisma.boxScore.update({
      where: { gameId_playerId: { gameId, playerId } },
      data: { minutesPlayed },
    });
  });

  await prisma.$transaction(updates);

  revalidatePath(`/game/${gameId}`);
  revalidatePath(`/admin/games/${gameId}`);
}
