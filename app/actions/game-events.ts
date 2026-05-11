"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import type { GameEvent, BoxScore } from "@prisma/client";
import { checkNewAchievements } from "@/lib/achievements";

async function initializeGameDataInternal(
  gameId: number,
  tx: any,
  homePlayerOrder?: number[],
  awayPlayerOrder?: number[]
): Promise<void> {
  const game = await tx.game.findUnique({
    where: { id: gameId },
    include: {
      homeTeam: { include: { players: true } },
      awayTeam: { include: { players: true } },
    },
  });

  if (!game) throw new Error("Game not found");

  const rawHomePlayers = game.homeTeam.players;
  const rawAwayPlayers = game.awayTeam.players;

  const homePlayers = homePlayerOrder
    ? homePlayerOrder.map((id: number) => rawHomePlayers.find((p: any) => p.id === id)!).filter(Boolean)
    : rawHomePlayers.sort((a: any, b: any) => a.number - b.number);
  const awayPlayers = awayPlayerOrder
    ? awayPlayerOrder.map((id: number) => rawAwayPlayers.find((p: any) => p.id === id)!).filter(Boolean)
    : rawAwayPlayers.sort((a: any, b: any) => a.number - b.number);

  for (const player of [...homePlayers, ...awayPlayers]) {
    const isHomeTeam = player.teamId === game.homeTeamId;
    const teamPlayers = isHomeTeam ? homePlayers : awayPlayers;
    const playerIndex = teamPlayers.indexOf(player);
    const isStarter = playerIndex < 5;
    const lineupPosition = isStarter ? (playerIndex + 1) : 0;

    await tx.boxScore.upsert({
      where: { gameId_playerId: { gameId, playerId: player.id } },
      create: {
        gameId,
        playerId: player.id,
        teamId: player.teamId,
        isStarter,
        enteredAt: isStarter ? 600 : null,
        isOnCourt: isStarter,
        lineupPosition,
        shiftStartHomeScore: 0,
        shiftStartAwayScore: 0,
        points: 0,
        rebounds: 0,
        assists: 0,
        steals: 0,
        blocks: 0,
        turnovers: 0,
        minutes: 0,
        fg2Made: 0,
        fg2Attempted: 0,
        fg3Made: 0,
        fg3Attempted: 0,
        ftMade: 0,
        ftAttempted: 0,
        reboundsOff: 0,
        reboundsDef: 0,
        foulsPersonal: 0,
        foulsTechnical: 0,
        foulsUnsports: 0,
        foulsDisq: 0,
        timeOnCourtSeconds: 0,
      },
      update: {
        isStarter,
      },
    });
  }
}

export async function initializeGameData(
  gameId: number,
  homePlayerOrder?: number[],
  awayPlayerOrder?: number[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await prisma.$transaction(async (tx) => {
      await initializeGameDataInternal(gameId, tx, homePlayerOrder, awayPlayerOrder);
      return { success: true };
    });

    return result;
  } catch (error) {
    console.error("[initializeGameData]", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export interface GameActionPayload {
  gameId: number;
  actionType: string;
  playerId: number | null;
  gameClockSeconds: number;
  quarter: number;
  idempotencyKey?: string; // UUID from client to prevent duplicate actions
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
    const { gameId, actionType, playerId, gameClockSeconds, quarter, idempotencyKey, payload: actionPayload = {} } = payload;

    // GAME CONTROL ACTIONS (no player involved)
    if (["START_GAME", "START", "PAUSE", "END_GAME", "NEXT_QUARTER"].includes(actionType)) {
      return await prisma.$transaction(async (tx) => {
        const game = await tx.game.findUnique({ where: { id: gameId } });
        if (!game) throw new Error("Game not found");

        const gameUpdates: any = {};

        switch (actionType) {
          case "START_GAME":
            // Initialize game data only if not already done (idempotent)
            const existingBoxScores = await tx.boxScore.count({
              where: { gameId },
            });
            if (existingBoxScores === 0) {
              const homePlayerOrder = actionPayload?.homePlayerOrder as number[] | undefined;
              const awayPlayerOrder = actionPayload?.awayPlayerOrder as number[] | undefined;
              await initializeGameDataInternal(gameId, tx, homePlayerOrder, awayPlayerOrder);
            }
            if (game.status === "SCHEDULED") {
              gameUpdates.status = "LIVE";
              gameUpdates.currentTimeLeft = 600; // Скидаємо таймер на 10:00 для нової гри
              gameUpdates.quarter = 1; // Першу чверть
            }
            break;
          case "START":
            if (game.status === "PAUSED" || game.status === "SCHEDULED") {
              gameUpdates.status = "LIVE";
              // Thaw all active players' timers: restore enteredAt to current gameClockSeconds
              const activePlayersToThaw = await tx.boxScore.findMany({
                where: { gameId, isOnCourt: true },
              });
              for (const bs of activePlayersToThaw) {
                await tx.boxScore.update({
                  where: { id: bs.id },
                  data: { enteredAt: gameClockSeconds },
                });
              }
            }
            break;
          case "PAUSE":
            gameUpdates.status = "PAUSED";
            // Freeze all active players' timers: accumulate time + clear enteredAt
            const activePlayersToFreeze = await tx.boxScore.findMany({
              where: { gameId, isOnCourt: true },
              include: { player: true },
            });
            for (const bs of activePlayersToFreeze) {
              if (bs.enteredAt !== null) {
                // Calculate session time: (when entered) - (now)
                const sessionTimeSeconds = Math.max(0, bs.enteredAt - gameClockSeconds);
                const newAccumulatedTime = (bs.timeOnCourtSeconds || 0) + sessionTimeSeconds;
                await tx.boxScore.update({
                  where: { id: bs.id },
                  data: {
                    timeOnCourtSeconds: newAccumulatedTime,
                    enteredAt: null, // Clear enteredAt to freeze timer
                  },
                });
              }
            }
            break;
          case "END_GAME":
            gameUpdates.status = "FINISHED";
            // Закрити шифти для гравців що залишились на майданчику
            const boxScores = await tx.boxScore.findMany({
              where: { gameId, isOnCourt: true },
              include: { player: true },
            });
            for (const bs of boxScores) {
              const isHomePlayer = bs.teamId === game.homeTeamId;
              const scoreDiffNow = game.homeScore - game.awayScore;
              const scoreDiffAtEntry = (bs.shiftStartHomeScore || 0) - (bs.shiftStartAwayScore || 0);
              const shiftPlusMinus = isHomePlayer
                ? scoreDiffNow - scoreDiffAtEntry
                : scoreDiffAtEntry - scoreDiffNow;
              await tx.boxScore.update({
                where: { id: bs.id },
                data: {
                  plusMinus: (bs.plusMinus || 0) + shiftPlusMinus,
                  isOnCourt: false,
                  enteredAt: null,
                },
              });
            }
            // Verify score consistency
            const allBoxScores = await tx.boxScore.findMany({
              where: { gameId },
            });
            const homePoints = allBoxScores
              .filter(bs => bs.teamId === game.homeTeamId)
              .reduce((sum, bs) => sum + (bs.points || 0), 0);
            const awayPoints = allBoxScores
              .filter(bs => bs.teamId === game.awayTeamId)
              .reduce((sum, bs) => sum + (bs.points || 0), 0);
            if (homePoints !== game.homeScore || awayPoints !== game.awayScore) {
              console.error(
                `[END_GAME] Score consistency check failed: ` +
                `homeScore=${game.homeScore} but sum=${homePoints}, ` +
                `awayScore=${game.awayScore} but sum=${awayPoints}`
              );
            }

            // Process achievements for all players in this game
            try {
              // Batch load all data outside the loop (avoids N+1 queries)
              const playerIds = allBoxScores.map((bs) => bs.playerId);

              // Single query for all season box scores
              const allSeasonBoxScores = await tx.boxScore.findMany({
                where: {
                  playerId: { in: playerIds },
                  game: {
                    seasonId: game.seasonId,
                    status: "FINISHED",
                  },
                },
                include: {
                  game: { select: { scheduledAt: true } },
                },
                orderBy: { game: { scheduledAt: "asc" } },
              });

              // Single query for all unlocked achievements
              const allUnlockedAchievements = await tx.playerAchievement.findMany({
                where: { playerId: { in: playerIds } },
                select: { playerId: true, badgeId: true },
              });

              // Group by playerId for O(1) lookup
              const seasonBoxScoresMap = new Map<number, typeof allSeasonBoxScores>();
              for (const bs of allSeasonBoxScores) {
                const pid = bs.playerId;
                if (!seasonBoxScoresMap.has(pid)) {
                  seasonBoxScoresMap.set(pid, []);
                }
                seasonBoxScoresMap.get(pid)!.push(bs);
              }

              const unlockedBadgesMap = new Map<number, string[]>();
              for (const ua of allUnlockedAchievements) {
                const pid = ua.playerId;
                if (!unlockedBadgesMap.has(pid)) {
                  unlockedBadgesMap.set(pid, []);
                }
                unlockedBadgesMap.get(pid)!.push(ua.badgeId);
              }

              // Process each player without DB queries
              for (const bs of allBoxScores) {
                const seasonBoxScores = seasonBoxScoresMap.get(bs.playerId) || [];
                const unlockedBadges = unlockedBadgesMap.get(bs.playerId) || [];

                // Check for new achievements
                const newBadgeIds = checkNewAchievements(
                  seasonBoxScores as any,
                  unlockedBadges
                );

                // Create new achievements
                for (const badgeId of newBadgeIds) {
                  await tx.playerAchievement.upsert({
                    where: {
                      playerId_badgeId: {
                        playerId: bs.playerId,
                        badgeId,
                      },
                    },
                    create: {
                      playerId: bs.playerId,
                      badgeId,
                      unlockedAt: new Date(),
                    },
                    update: {},
                  });
                  console.info(
                    `[END_GAME] Player ${bs.playerId} unlocked achievement: ${badgeId}`
                  );
                }
              }
            } catch (err) {
              console.error("[END_GAME] Achievement processing error:", err);
              // Don't fail the game end if achievements fail
              // NOTE: Achievements are permanent once unlocked (idempotent operation)
            }
            break;
          case "NEXT_QUARTER":
            gameUpdates.quarter = (game.quarter || 1) + 1;
            gameUpdates.currentTimeLeft = 600; // Reset timer for new quarter
            gameUpdates.status = "LIVE"; // Resume play after quarter break
            // All active players restart timing at 600 seconds
            const activePlayersNextQuarter = await tx.boxScore.findMany({
              where: { gameId, isOnCourt: true },
            });
            for (const bs of activePlayersNextQuarter) {
              await tx.boxScore.update({
                where: { id: bs.id },
                data: { enteredAt: 600 }, // Restart at beginning of new quarter
              });
            }
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
      // Prevent duplicate actions via idempotency key
      if (idempotencyKey) {
        const existingEvent = await tx.gameEvent.findFirst({
          where: { idempotencyKey },
        });
        if (existingEvent) {
          // Idempotent: action already recorded, return existing state
          const game = await tx.game.findUnique({
            where: { id: gameId },
            include: {
              homeTeam: { include: { players: { orderBy: { number: "asc" } } } },
              awayTeam: { include: { players: { orderBy: { number: "asc" } } } },
              events: {
                include: { player: { select: { firstName: true, lastName: true, number: true } } },
                orderBy: { createdAt: "desc" },
                take: 50,
              },
              boxScores: { include: { player: true } },
            },
          });
          console.info(`[IDEMPOTENCY] Action ${idempotencyKey} already recorded (Event #${existingEvent.id})`);
          return { action: existingEvent, updatedGame: game };
        }
      }

      // 1. Створити GameEvent
      let teamId: number | null = null;
      if (playerId) {
        const player = await tx.player.findUnique({ where: { id: playerId } });
        teamId = player?.teamId || null;
      }

      // Validate points field for POINTS action type
      if (actionType === "POINTS") {
        const points = actionPayload.points;
        if (points === null || points === undefined || typeof points !== "number" || ![1, 2, 3].includes(points)) {
          throw new Error(`Invalid points value for POINTS action: ${points}. Must be 1, 2, or 3.`);
        }
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
          points: actionType === "POINTS" ? actionPayload.points : null,
          runningHomeScore: 0,
          runningAwayScore: 0,
          idempotencyKey: idempotencyKey ?? null,
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
              updates.ftAttempted = (boxScore.ftAttempted || 0) + 1;
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
              const newFouls = (boxScore.foulsPersonal || 0) + 1;
              updates.foulsPersonal = newFouls;
              if (newFouls >= 5) {
                updates.isFouledOut = true;
                // Remove from court and record final +/-
                if (boxScore.isOnCourt) {
                  const game = await tx.game.findUnique({ where: { id: gameId } });
                  if (game) {
                    const timeAdded = boxScore.enteredAt
                      ? Math.max(0, (boxScore.enteredAt || 0) - gameClockSeconds)
                      : 0;
                    updates.timeOnCourtSeconds = (boxScore.timeOnCourtSeconds || 0) + timeAdded;
                    updates.isOnCourt = false;
                    updates.lineupPosition = 0;
                    updates.enteredAt = null;

                    // Calculate +/- for final shift
                    const isHomePlayer = boxScore.teamId === game.homeTeamId;
                    const scoreDiffNow = game.homeScore - game.awayScore;
                    const scoreDiffEntry = (boxScore.shiftStartHomeScore || 0) - (boxScore.shiftStartAwayScore || 0);
                    const shiftPlusMinus = isHomePlayer
                      ? scoreDiffNow - scoreDiffEntry
                      : scoreDiffEntry - scoreDiffNow;
                    updates.plusMinus = (boxScore.plusMinus || 0) + shiftPlusMinus;
                  }
                }
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

      if (actionType === "TIMEOUT") {
        const game = await tx.game.findUnique({ where: { id: gameId } });
        if (game) {
          // TIMEOUT is a team action, use teamId from payload or action
          const isHomeTeam = teamId === game.homeTeamId;
          if (isHomeTeam) {
            gameUpdates.homeTimeouts = Math.min(5, (game.homeTimeouts || 0) + 1);
          } else {
            gameUpdates.awayTimeouts = Math.min(5, (game.awayTimeouts || 0) + 1);
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
          boxScores: { include: { player: true } },
        },
      });

      return { action: event, updatedGame };
    });

    // Invalidate leaders cache on any game action (real-time leaderboard updates)
    revalidatePath("/leaders");

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
      // NOTE: Achievements are NOT revoked on undo.
      // Once a player earns a badge, it stays permanently.
      // This matches FIBA tracking standards and game design principles.
      // Re-evaluation of new achievements happens only at END_GAME for subsequent games.

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
              // Видалення очок: якщо нема інформації про тип шоту, то видалимо весь рядок
              // Спочатку спробуємо знайти який тип шоту (найновіший)
              let lastShotPoints = 0;
              if ((boxScore.ftMade || 0) > (boxScore.ftAttempted || 0) - (boxScore.ftMade || 0)) {
                lastShotPoints = 1;
                updates.ftMade = Math.max(0, (boxScore.ftMade || 0) - 1);
              } else if ((boxScore.fg3Made || 0) > 0) {
                lastShotPoints = 3;
                updates.fg3Made = Math.max(0, (boxScore.fg3Made || 0) - 1);
                updates.fg3Attempted = Math.max(0, (boxScore.fg3Attempted || 0) - 1);
              } else if ((boxScore.fg2Made || 0) > 0) {
                lastShotPoints = 2;
                updates.fg2Made = Math.max(0, (boxScore.fg2Made || 0) - 1);
                updates.fg2Attempted = Math.max(0, (boxScore.fg2Attempted || 0) - 1);
              } else {
                lastShotPoints = 1; // Fallback
              }
              updates.points = Math.max(0, (boxScore.points || 0) - lastShotPoints);
              break;
            }
            case "MISS_1P":
              updates.ftAttempted = Math.max(0, (boxScore.ftAttempted || 0) - 1);
              break;
            case "MISS_2P":
              updates.fg2Attempted = Math.max(0, (boxScore.fg2Attempted || 0) - 1);
              break;
            case "MISS_3P":
              updates.fg3Attempted = Math.max(0, (boxScore.fg3Attempted || 0) - 1);
              break;
            case "MISS_FT":
              updates.ftAttempted = Math.max(0, (boxScore.ftAttempted || 0) - 1);
              break;
            case "REBOUND_DEF":
              updates.reboundsDef = Math.max(0, (boxScore.reboundsDef || 0) - 1);
              updates.rebounds = Math.max(0, (boxScore.rebounds || 0) - 1);
              break;
            case "REBOUND_OFF":
              updates.reboundsOff = Math.max(0, (boxScore.reboundsOff || 0) - 1);
              updates.rebounds = Math.max(0, (boxScore.rebounds || 0) - 1);
              break;
            case "ASSIST":
              updates.assists = Math.max(0, (boxScore.assists || 0) - 1);
              break;
            case "STEAL":
              updates.steals = Math.max(0, (boxScore.steals || 0) - 1);
              break;
            case "BLOCK":
              updates.blocks = Math.max(0, (boxScore.blocks || 0) - 1);
              break;
            case "TURNOVER":
              updates.turnovers = Math.max(0, (boxScore.turnovers || 0) - 1);
              break;
            case "FOUL":
              updates.foulsPersonal = Math.max(0, (boxScore.foulsPersonal || 0) - 1);
              break;
            case "FOUL_TECHNICAL":
              updates.foulsTechnical = Math.max(0, (boxScore.foulsTechnical || 0) - 1);
              break;
            case "FOUL_UNSPORTSMANLIKE":
              updates.foulsUnsports = Math.max(0, (boxScore.foulsUnsports || 0) - 1);
              break;
            case "FOUL_DISQUALIFYING":
              updates.foulsDisq = Math.max(0, (boxScore.foulsDisq || 0) - 1);
              break;
          }

          if (Object.keys(updates).length > 0) {
            await tx.boxScore.update({
              where: { gameId_playerId: { gameId, playerId: action.playerId } },
              data: updates,
            });
          }
        }
      }

      // Undo game-level actions (TIMEOUT, etc.)
      if (action.type === "TIMEOUT") {
        const game = await tx.game.findUnique({ where: { id: gameId } });
        if (game) {
          const gameUpdates: any = {};
          const isHomeTeam = action.teamId === game.homeTeamId;
          if (isHomeTeam) {
            gameUpdates.homeTimeouts = Math.max(0, (game.homeTimeouts || 0) - 1);
          } else {
            gameUpdates.awayTimeouts = Math.max(0, (game.awayTimeouts || 0) - 1);
          }
          await tx.game.update({
            where: { id: gameId },
            data: gameUpdates,
          });
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
          boxScores: { include: { player: true } },
        },
      });

      return { updatedGame };
    });

    // Invalidate leaders cache after undo (stats have changed)
    revalidatePath("/leaders");

    console.info('[UNDO] Action reverted, achievements unchanged (permanent, not revoked)');
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
    const result = await prisma.$transaction(
      async (tx) => {
        const playerOut = await tx.boxScore.findUnique({
          where: { gameId_playerId: { gameId, playerId: playerOutId } },
        });

        const playerIn = await tx.boxScore.findUnique({
          where: { gameId_playerId: { gameId, playerId: playerInId } },
        });

        if (!playerOut || !playerIn) {
          throw new Error(`Players not found: out=${playerOut?.playerId}, in=${playerIn?.playerId}`);
        }

        // Calculate accumulated time for player LEAVING the court
        const enteredAtValue = playerOut.enteredAt || 0;
        const timeAdded = enteredAtValue - gameClockSeconds;
        const newTimeOnCourtSeconds = (playerOut.timeOnCourtSeconds || 0) + Math.max(0, timeAdded);

        // Swap lineup positions
        const outPosition = playerOut.lineupPosition;

        // Get current game state
        const game = await tx.game.findUnique({ where: { id: gameId } });
        if (!game) throw new Error("Game not found");

        // Calculate +/- for player OUT
        const isHomePlayer = playerOut.teamId === game.homeTeamId;
        const scoreDiffNow = game.homeScore - game.awayScore;
        const scoreDiffAtEntry = (playerOut.shiftStartHomeScore || 0) - (playerOut.shiftStartAwayScore || 0);
        const shiftPlusMinus = isHomePlayer
          ? scoreDiffNow - scoreDiffAtEntry
          : scoreDiffAtEntry - scoreDiffNow;

        // Update player OUT: save accumulated time, mark bench, clear entry timestamp, move to bench (position 0)
        await tx.boxScore.update({
          where: { gameId_playerId: { gameId, playerId: playerOutId } },
          data: {
            timeOnCourtSeconds: newTimeOnCourtSeconds,
            isOnCourt: false,
            enteredAt: null,
            lineupPosition: 0,
            plusMinus: (playerOut.plusMinus || 0) + shiftPlusMinus,
          },
        });

        // Update player IN: set court entry timestamp, mark on court, take OUT player's position
        // timeOnCourtSeconds stays unchanged — keeps any prior accumulated time from previous sessions
        // Set shift start scores to current game scores
        await tx.boxScore.update({
          where: { gameId_playerId: { gameId, playerId: playerInId } },
          data: {
            enteredAt: gameClockSeconds,
            isOnCourt: true,
            lineupPosition: outPosition,
            shiftStartHomeScore: game.homeScore,
            shiftStartAwayScore: game.awayScore,
          },
        });

        // Create substitution event: log both players
        // playerId: player coming IN
        // secondaryPlayerId: player going OUT
        await tx.gameEvent.create({
          data: {
            gameId,
            type: "SUBSTITUTION",
            playerId: playerInId,
            quarter,
            gameClockSeconds,
            teamId: playerOut.teamId || 0,
            secondaryPlayerId: playerOutId, // Proper field for secondary player
          },
        });

        const updatedGame = await tx.game.findUnique({
          where: { id: gameId },
          include: {
            homeTeam: { include: { players: { orderBy: { number: "asc" } } } },
            awayTeam: { include: { players: { orderBy: { number: "asc" } } } },
            boxScores: { include: { player: true } },
            events: {
              include: { player: { select: { firstName: true, lastName: true, number: true } } },
              orderBy: { createdAt: "desc" },
              take: 50,
            },
            },
        });

        if (!updatedGame) throw new Error("Game not found after substitution");

        return { action: null, updatedGame };
      },
      { maxWait: 5000, timeout: 10000 }
    );

    return {
      success: true,
      updatedGame: result.updatedGame,
    };
  } catch (error) {
    console.error("[recordSubstitution]", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Substitution failed",
    };
  }
}

export async function updateGameTime({
  gameId,
  currentTimeLeft,
}: {
  gameId: number;
  currentTimeLeft: number;
}): Promise<{ success: boolean; error?: string }> {
  try {
    // Only update if game is LIVE (protect from stale/concurrent writes)
    const result = await prisma.game.update({
      where: {
        id: gameId,
        status: "LIVE", // Guard: don't write if game not active
      },
      data: {
        currentTimeLeft: Math.max(0, currentTimeLeft),
      },
    });

    if (!result) {
      return {
        success: false,
        error: "Game is not in LIVE status",
      };
    }

    return { success: true };
  } catch (error) {
    console.error("[updateGameTime]", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
