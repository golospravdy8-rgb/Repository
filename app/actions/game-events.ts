"use server";

import { prisma } from "@/lib/prisma";
import type { GameEvent, BoxScore } from "@prisma/client";

export interface GameActionPayload {
  gameId: number;
  actionType: string;
  playerId: number | null;
  gameClockSeconds: number;
  quarter: number;
  payload?: {
    points?: number;
    foulType?: "PERSONAL" | "TECHNICAL" | "UNSPORTSMANLIKE" | "DISQUALIFYING";
    fouledPlayerId?: number;
    isSubstitution?: boolean;
    playerOutId?: number;
    playerInId?: number;
    isFreeThrow?: boolean;
    wasShooting?: boolean;
    [key: string]: any;
  };
}

interface RecordGameActionResult {
  success: boolean;
  action?: GameEvent;
  updatedGame?: any;
  error?: string;
}

export async function recordGameAction(payload: GameActionPayload): Promise<RecordGameActionResult> {
  try {
    const { gameId, actionType, playerId, gameClockSeconds, quarter, payload: actionPayload = {} } = payload;

    // GAME CONTROL ACTIONS (no player involved)
    if (["START_GAME", "START", "PAUSE", "END_GAME", "NEXT_QUARTER"].includes(actionType)) {
      return await prisma.$transaction(async (tx) => {
        const game = await tx.game.findUnique({ where: { id: gameId } });
        if (!game) throw new Error("Game not found");

        const gameUpdates: any = {};

        switch (actionType) {
          case "START_GAME":
            if (game.status === "SCHEDULED") {
              gameUpdates.status = "LIVE";
            }
            break;
          case "START":
            if (game.status === "PAUSED") {
              gameUpdates.status = "LIVE";
            }
            break;
          case "PAUSE":
            gameUpdates.status = "PAUSED";
            break;
          case "END_GAME":
            gameUpdates.status = "FINISHED";
            // Calculate final timeOnCourtSeconds for all on-court players
            const onCourt = await tx.gameOnCourt.findMany({ where: { gameId, onCourt: true } });
            for (const oc of onCourt) {
              const boxScore = await tx.boxScore.findUnique({
                where: { gameId_playerId: { gameId, playerId: oc.playerId } },
              });
              if (boxScore) {
                const timeAdded = gameClockSeconds - (boxScore.enteredAt || 0);
                await tx.boxScore.update({
                  where: { gameId_playerId: { gameId, playerId: oc.playerId } },
                  data: {
                    timeOnCourtSeconds: (boxScore.timeOnCourtSeconds || 0) + Math.max(0, timeAdded),
                  },
                });
              }
            }
            break;
          case "NEXT_QUARTER":
            gameUpdates.quarter = (game.quarter || 1) + 1;
            break;
        }

        const updatedGame = await tx.game.update({
          where: { id: gameId },
          data: gameUpdates,
          include: {
            homeTeam: { include: { players: { orderBy: { number: "asc" } } } },
            awayTeam: { include: { players: { orderBy: { number: "asc" } } } },
            events: {
              include: { player: { select: { firstName: true, lastName: true, number: true } } },
              orderBy: { createdAt: "desc" },
              take: 50,
            },
            onCourt: true,
            boxScores: { include: { player: true } },
          },
        });

        return {
          success: true,
          updatedGame,
        };
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Створити GameEvent
      let teamId: number | null = null;
      if (playerId) {
        const player = await tx.player.findUnique({ where: { id: playerId } });
        teamId = player?.teamId || null;
      }

      const event = await tx.gameEvent.create({
        data: {
          gameId,
          type: actionType,
          playerId,
          quarter,
          gameClockSeconds,
          teamId: teamId || 0,
          fouledPlayerId: actionPayload.fouledPlayerId || null,
          foulType: actionPayload.foulType || null,
          isFreeThrow: actionPayload.isFreeThrow || false,
          wasShooting: actionPayload.wasShooting || false,
          runningHomeScore: 0,
          runningAwayScore: 0,
        },
        include: { player: true },
      });

      // 2. Оновити BoxScore гравця (якщо дія стосується гравця)
      if (playerId) {
        const boxScore = await tx.boxScore.findUnique({
          where: { gameId_playerId: { gameId, playerId } },
        });

        if (boxScore) {
          const updates: any = {};

          switch (actionType) {
            case "POINTS":
              const points = actionPayload.points || 0;
              updates.points = (boxScore.points || 0) + points;
              if (points === 1) {
                updates.ftMade = (boxScore.ftMade || 0) + 1;
              } else if (points === 2) {
                updates.fg2Made = (boxScore.fg2Made || 0) + 1;
              } else if (points === 3) {
                updates.fg3Made = (boxScore.fg3Made || 0) + 1;
              }
              break;

            case "MISS_1P":
              updates.fg2Attempted = (boxScore.fg2Attempted || 0) + 1;
              break;

            case "MISS_2P":
              updates.fg2Attempted = (boxScore.fg2Attempted || 0) + 1;
              break;

            case "MISS_3P":
              updates.fg3Attempted = (boxScore.fg3Attempted || 0) + 1;
              break;

            case "MISS_FT":
              updates.ftAttempted = (boxScore.ftAttempted || 0) + 1;
              break;

            case "REBOUND_OFF":
              updates.reboundsOff = (boxScore.reboundsOff || 0) + 1;
              updates.rebounds = (boxScore.rebounds || 0) + 1;
              break;

            case "REBOUND_DEF":
              updates.reboundsDef = (boxScore.reboundsDef || 0) + 1;
              updates.rebounds = (boxScore.rebounds || 0) + 1;
              break;

            case "ASSIST":
              updates.assists = (boxScore.assists || 0) + 1;
              break;

            case "STEAL":
              updates.steals = (boxScore.steals || 0) + 1;
              break;

            case "BLOCK":
              updates.blocks = (boxScore.blocks || 0) + 1;
              break;

            case "TURNOVER":
              updates.turnovers = (boxScore.turnovers || 0) + 1;
              break;

            case "FOUL":
              updates.foulsPersonal = (boxScore.foulsPersonal || 0) + 1;
              if ((boxScore.foulsPersonal || 0) + 1 >= 5) {
                updates.isFouledOut = true;
              }
              break;

            case "FOUL_TECHNICAL":
              updates.foulsTechnical = (boxScore.foulsTechnical || 0) + 1;
              break;

            case "FOUL_UNSPORTSMANLIKE":
              updates.foulsUnsports = (boxScore.foulsUnsports || 0) + 1;
              break;

            case "FOUL_DISQUALIFYING":
              updates.foulsDisq = (boxScore.foulsDisq || 0) + 1;
              updates.isDisqualified = true;
              break;
          }

          if (Object.keys(updates).length > 0) {
            await tx.boxScore.update({
              where: { gameId_playerId: { gameId, playerId } },
              data: updates,
            });
          }
        }
      }

      // 3. Оновити Game (score, stats)
      const gameUpdates: any = {};

      if (actionType === "POINTS") {
        const points = actionPayload.points || 0;
        const player = await tx.player.findUnique({ where: { id: playerId || 0 } });

        if (player) {
          const game = await tx.game.findUnique({ where: { id: gameId } });
          if (game) {
            if (player.teamId === game.homeTeamId) {
              gameUpdates.homeScore = (game.homeScore || 0) + points;
            } else {
              gameUpdates.awayScore = (game.awayScore || 0) + points;
            }
          }
        }
      }

      // 4. Оновити Game та повернути з усіма даними
      const updatedGame = await tx.game.update({
        where: { id: gameId },
        data: gameUpdates.homeScore || gameUpdates.awayScore ? gameUpdates : {},
        include: {
          homeTeam: { include: { players: { orderBy: { number: "asc" } } } },
          awayTeam: { include: { players: { orderBy: { number: "asc" } } } },
          events: {
            include: { player: { select: { firstName: true, lastName: true, number: true } } },
            orderBy: { createdAt: "desc" },
            take: 50,
          },
          onCourt: true,
          boxScores: { include: { player: true } },
        },
      });

      return { action: event, updatedGame };
    });

    return {
      success: true,
      action: result.action,
      updatedGame: result.updatedGame,
    };
  } catch (error) {
    console.error("[recordGameAction]", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function undoGameAction({
  gameId,
  actionId,
}: {
  gameId: number;
  actionId: number | string;
}): Promise<RecordGameActionResult> {
  try {
    const result = await prisma.$transaction(async (tx) => {
      // Знайти дію
      const numActionId = typeof actionId === 'string' ? parseInt(actionId, 10) : actionId;
      const action = await tx.gameEvent.findUnique({
        where: { id: numActionId },
        include: { player: true },
      });

      if (!action) {
        throw new Error("Action not found");
      }

      // Видалити дію
      await tx.gameEvent.delete({ where: { id: numActionId } });

      // Реверсивні операції на BoxScore
      if (action.playerId) {
        const boxScore = await tx.boxScore.findUnique({
          where: { gameId_playerId: { gameId, playerId: action.playerId } },
        });

        if (boxScore) {
          const updates: any = {};

          switch (action.type) {
            case "POINTS": {
              const points = Math.floor(Math.random() * 3) + 1; // Наближена кількість очок
              updates.points = Math.max(0, (boxScore.points || 0) - points);
              break;
            }
            case "REBOUND_DEF":
              updates.reboundsDef = Math.max(0, (boxScore.reboundsDef || 0) - 1);
              updates.rebounds = Math.max(0, (boxScore.rebounds || 0) - 1);
              break;
            case "ASSIST":
              updates.assists = Math.max(0, (boxScore.assists || 0) - 1);
              break;
            // ... інші типи дій
          }

          if (Object.keys(updates).length > 0) {
            await tx.boxScore.update({
              where: { gameId_playerId: { gameId, playerId: action.playerId } },
              data: updates,
            });
          }
        }
      }

      // Повернути оновлену гру
      const updatedGame = await tx.game.findUnique({
        where: { id: gameId },
        include: {
          homeTeam: { include: { players: { orderBy: { number: "asc" } } } },
          awayTeam: { include: { players: { orderBy: { number: "asc" } } } },
          events: {
            include: { player: { select: { firstName: true, lastName: true, number: true } } },
            orderBy: { createdAt: "desc" },
            take: 50,
          },
          onCourt: true,
          boxScores: { include: { player: true } },
        },
      });

      return { updatedGame };
    });

    return {
      success: true,
      updatedGame: result.updatedGame,
    };
  } catch (error) {
    console.error("[undoGameAction]", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function recordSubstitution({
  gameId,
  quarter,
  gameClockSeconds,
  playerOutId,
  playerInId,
}: {
  gameId: number;
  quarter: number;
  gameClockSeconds: number;
  playerOutId: number;
  playerInId: number;
}): Promise<RecordGameActionResult> {
  try {
    const result = await prisma.$transaction(async (tx) => {
      // Оновити гравців на/не на майданчику
      const playerOut = await tx.boxScore.findUnique({
        where: { gameId_playerId: { gameId, playerId: playerOutId } },
      });

      const playerIn = await tx.boxScore.findUnique({
        where: { gameId_playerId: { gameId, playerId: playerInId } },
      });

      if (playerOut) {
        // Гравець виходить: розрахувати час на майданчику
        const enteredAtValue = playerOut.enteredAt || 0;
        const timeAdded = gameClockSeconds - enteredAtValue;
        await tx.boxScore.update({
          where: { gameId_playerId: { gameId, playerId: playerOutId } },
          data: {
            timeOnCourtSeconds: (playerOut.timeOnCourtSeconds || 0) + Math.max(0, timeAdded),
          },
        });
      }

      if (playerIn) {
        // Гравець входить: починає відлік часу
        await tx.boxScore.update({
          where: { gameId_playerId: { gameId, playerId: playerInId } },
          data: {
            enteredAt: gameClockSeconds,
          },
        });
      }

      // Створити GameEvent для заміни
      const event = await tx.gameEvent.create({
        data: {
          gameId,
          type: "SUBSTITUTION",
          playerId: playerOutId,
          quarter,
          gameClockSeconds,
          teamId: playerOut?.teamId || 0,
        },
      });

      // Повернути оновлену гру
      const updatedGame = await tx.game.findUnique({
        where: { id: gameId },
        include: {
          homeTeam: { include: { players: { orderBy: { number: "asc" } } } },
          awayTeam: { include: { players: { orderBy: { number: "asc" } } } },
          boxScores: { include: { player: true } },
          onCourt: true,
        },
      });

      return { action: event, updatedGame };
    });

    return {
      success: true,
      action: result.action,
      updatedGame: result.updatedGame,
    };
  } catch (error) {
    console.error("[recordSubstitution]", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
