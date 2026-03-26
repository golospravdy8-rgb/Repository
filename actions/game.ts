"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";

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

async function requireAuth() {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");
}

export async function addScore(
  gameId: number,
  teamId: number,
  playerId: number,
  points: 1 | 2 | 3
) {
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

  revalidatePath(`/game/${gameId}`);
  revalidatePath(`/admin/games/${gameId}`);
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

  await prisma.game.update({
    where: { id: gameId },
    data: { status: "FINAL" },
  });

  revalidatePath(`/game/${gameId}`);
  revalidatePath(`/admin/games/${gameId}`);
  revalidatePath("/розклад");
  revalidatePath("/змагання");
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
  boxScoreField: "rebounds" | "assists" | "steals" | "blocks"
) {
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

  revalidatePath(`/admin/games/${gameId}`);
  revalidatePath(`/game/${gameId}`);
}

export async function addRebound(gameId: number, teamId: number, playerId: number) {
  await requireAuth();
  await addStatEvent(gameId, teamId, playerId, "REBOUND", "rebounds");
}

export async function addAssist(gameId: number, teamId: number, playerId: number) {
  await requireAuth();
  await addStatEvent(gameId, teamId, playerId, "ASSIST", "assists");
}

export async function addSteal(gameId: number, teamId: number, playerId: number) {
  await requireAuth();
  await addStatEvent(gameId, teamId, playerId, "STEAL", "steals");
}

export async function addBlock(gameId: number, teamId: number, playerId: number) {
  await requireAuth();
  await addStatEvent(gameId, teamId, playerId, "BLOCK", "blocks");
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
  const statMap: Record<string, "rebounds" | "assists" | "steals" | "blocks" | "fouls"> = {
    REBOUND: "rebounds",
    ASSIST: "assists",
    STEAL: "steals",
    BLOCK: "blocks",
    FOUL: "fouls",
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
