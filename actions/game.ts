"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/require-auth";
import { checkNewAchievements } from "@/lib/achievements";

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
        type: "POINTS",
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

  // TODO: playerAchievement model not in schema yet
  // const newAchievements = await syncAchievements(playerId);

  revalidatePath(`/game/${gameId}`);
  revalidatePath(`/admin/games/${gameId}`);
  revalidatePath(`/logos/players/${playerId}`);

  return { newAchievements: [] };
}

export async function addFoul(gameId: number, teamId: number, playerId: number) {
  await requireAuth();

  const game = await prisma.game.findUnique({ where: { id: gameId } });
  if (!game || game.status !== "LIVE") throw new Error("Game not live");

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

  const game = await prisma.game.update({
    where: { id: gameId },
    data: { status: "FINAL" },
  });

  await recalcStandingsForSeason(game.seasonId);

  revalidatePath(`/game/${gameId}`);
  revalidatePath(`/admin/games/${gameId}`);
  revalidatePath("/розклад");
  revalidatePath("/змагання");
  revalidatePath("/standings");
  revalidatePath("/");
}

export async function startGame(gameId: number) {
  await requireAuth();

  await prisma.game.update({
    where: { id: gameId },
    data: { status: "LIVE", quarter: 1, homeScore: 0, awayScore: 0 },
  });

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

  await prisma.gameEvent.create({
    data: { gameId, teamId, playerId, type: eventType, quarter: game.quarter },
  });

  const existing = await prisma.boxScore.findFirst({ where: { gameId, playerId } });
  if (existing) {
    await prisma.boxScore.update({
      where: { id: existing.id },
      data: { [boxScoreField]: { increment: 1 } },
    });
  } else {
    await prisma.boxScore.create({
      data: { gameId, playerId, teamId, [boxScoreField]: 1 },
    });
  }

  // TODO: playerAchievement model not in schema yet
  // const newAchievements = await syncAchievements(playerId);

  revalidatePath(`/admin/games/${gameId}`);
  revalidatePath(`/game/${gameId}`);
  revalidatePath(`/logos/players/${playerId}`);

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
  await prisma.gameEvent.create({
    data: { gameId, teamId, playerId, type: "FOUL_TECHNICAL", quarter: game.quarter },
  });
  const existing = await prisma.boxScore.findFirst({ where: { gameId, playerId } });
  if (existing) {
    await prisma.boxScore.update({ where: { id: existing.id }, data: { fouls: { increment: 1 } } });
  } else {
    await prisma.boxScore.create({ data: { gameId, playerId, teamId, fouls: 1 } });
  }
  revalidatePath(`/admin/games/${gameId}`);
}

export async function addFoulUnsportsmanlike(gameId: number, teamId: number, playerId: number) {
  await requireAuth();
  const game = await prisma.game.findUnique({ where: { id: gameId } });
  if (!game || game.status !== "LIVE") throw new Error("Game not live");
  await prisma.gameEvent.create({
    data: { gameId, teamId, playerId, type: "FOUL_UNSPORTSMANLIKE", quarter: game.quarter },
  });
  const existing = await prisma.boxScore.findFirst({ where: { gameId, playerId } });
  if (existing) {
    await prisma.boxScore.update({ where: { id: existing.id }, data: { fouls: { increment: 1 } } });
  } else {
    await prisma.boxScore.create({ data: { gameId, playerId, teamId, fouls: 1 } });
  }
  revalidatePath(`/admin/games/${gameId}`);
}

/** After updating boxScore, check if player has new achievements and persist them. Returns new badge IDs. */
// TODO: playerAchievement model not in schema — function disabled
// async function syncAchievements(playerId: number): Promise<string[]> {
//   const [allBoxScores, existingAchievements] = await Promise.all([
//     prisma.boxScore.findMany({
//       where: { playerId },
//       select: { points: true, rebounds: true, assists: true, steals: true, blocks: true },
//     }),
//     prisma.playerAchievement.findMany({
//       where: { playerId },
//       select: { badgeId: true },
//     }),
//   ]);
//
//   const alreadyUnlocked = new Set(existingAchievements.map((a) => a.badgeId));
//   const newBadgeIds = checkNewAchievements(allBoxScores, Array.from(alreadyUnlocked));
//
//   if (newBadgeIds.length > 0) {
//     await prisma.playerAchievement.createMany({
//       data: newBadgeIds.map((badgeId) => ({ playerId, badgeId })),
//       skipDuplicates: true,
//     });
//   }
//
//   return newBadgeIds;
// }

export async function undoLastEvent(gameId: number) {
  await requireAuth();

  const game = await prisma.game.findUnique({ where: { id: gameId } });
  if (!game || game.status !== "LIVE") throw new Error("Game not live");

  const lastEvent = await prisma.gameEvent.findFirst({
    where: { gameId },
    orderBy: { createdAt: "desc" },
  });

  if (!lastEvent) return;

  // Reverse score change
  if (lastEvent.type === "POINTS" && lastEvent.points && lastEvent.playerId) {
    const isHome = game.homeTeamId === lastEvent.teamId;
    await prisma.game.update({
      where: { id: gameId },
      data: isHome
        ? { homeScore: { decrement: lastEvent.points } }
        : { awayScore: { decrement: lastEvent.points } },
    });
    // Reverse boxScore points
    const bs = await prisma.boxScore.findFirst({ where: { gameId, playerId: lastEvent.playerId } });
    if (bs) {
      await prisma.boxScore.update({
        where: { id: bs.id },
        data: { points: { decrement: lastEvent.points } },
      });
    }
  }

  // Reverse stat events
  const statMap: Record<string, "rebounds" | "reboundsOff" | "reboundsDef" | "assists" | "steals" | "blocks" | "fouls" | "turnovers" | "missedFg2" | "missedFg3" | "missedFt"> = {
    REBOUND: "rebounds",
    REBOUND_OFF: "reboundsOff",
    REBOUND_DEF: "reboundsDef",
    ASSIST: "assists",
    STEAL: "steals",
    BLOCK: "blocks",
    FOUL: "fouls",
    FOUL_TECHNICAL: "fouls",
    FOUL_UNSPORTSMANLIKE: "fouls",
    TURNOVER: "turnovers",
    MISS_2P: "missedFg2",
    MISS_3P: "missedFg3",
    MISS_FT: "missedFt",
  };
  const field = statMap[lastEvent.type];
  if (field && lastEvent.playerId) {
    const bs = await prisma.boxScore.findFirst({ where: { gameId, playerId: lastEvent.playerId } });
    if (bs) {
      await prisma.boxScore.update({
        where: { id: bs.id },
        data: { [field]: { decrement: 1 } },
      });
    }
  }

  await prisma.gameEvent.delete({ where: { id: lastEvent.id } });

  revalidatePath(`/admin/games/${gameId}`);
  revalidatePath(`/game/${gameId}`);
}

export async function recalcStandingsForSeason(seasonId: number) {
  const games = await prisma.game.findMany({
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

  const sorted = Object.entries(statsMap).sort(([, a], [, b]) =>
    b.wins !== a.wins ? b.wins - a.wins : (b.pf - b.pa) - (a.pf - a.pa)
  );

  for (let i = 0; i < sorted.length; i++) {
    const [teamIdStr, s] = sorted[i];
    const teamId = Number(teamIdStr);
    await prisma.standing.upsert({
      where: { teamId },
      update: { wins: s.wins, losses: s.losses, pointsFor: s.pf, pointsAgainst: s.pa, gamesPlayed: s.gp, rank: i + 1 },
      create: { teamId, seasonId, wins: s.wins, losses: s.losses, pointsFor: s.pf, pointsAgainst: s.pa, gamesPlayed: s.gp, rank: i + 1 },
    });
  }
}
