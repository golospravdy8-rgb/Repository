/**
 * FIBA Event Engine
 *
 * Central hub for recording all basketball actions.
 * - Converts UI actions → FIBA events
 * - Manages Prisma transactions atomically
 * - Calculates running scores, efficiency, etc.
 * - Enforces FIBA rules validation
 */

import { prisma } from "@/lib/prisma";
import type { FibaAction, FibaEventResult } from "./types";
import { FIBA_RULES } from "./types";
import { calculateEfficiency, calculatePlusMinusContext } from "./stats-calculator";

// ═══════════════════════════════════════════════════════════════════════════
// MAIN ENTRY POINT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Record a FIBA-compliant basketball event
 *
 * This is the single source of truth for all action recording.
 * All legacy functions (addScore, addFoul, etc.) should call this.
 *
 * @param action - FibaAction union of all possible events
 * @returns FibaEventResult with IDs and validation info
 *
 * @example
 * ```typescript
 * const result = await recordFibaEvent({
 *   type: "FIELD_GOAL",
 *   subtype: "2PT",
 *   gameId: 237,
 *   teamId: 5,
 *   playerId: 42,
 *   points: 2,
 *   eventContext: "normal"
 * });
 * ```
 */
export async function recordFibaEvent(action: FibaAction): Promise<FibaEventResult> {
  try {
    // Validate game is in LIVE status
    const game = await prisma.game.findUnique({
      where: { id: action.gameId },
    });

    if (!game || game.status !== "LIVE") {
      return {
        success: false,
        error: `Game ${action.gameId} not in LIVE status`,
      };
    }

    // Route to appropriate handler based on action type
    switch (action.type) {
      case "FIELD_GOAL":
      case "FIELD_GOAL_MISS":
        return await handleFieldGoal(action as any, game);

      case "FREE_THROW":
        return await handleFreeThrow(action as any, game);

      case "REBOUND":
        return await handleRebound(action as any, game);

      case "ASSIST":
        return await handleAssist(action as any, game);

      case "STEAL":
        return await handleSteal(action as any, game);

      case "BLOCK":
        return await handleBlock(action as any, game);

      case "TURNOVER":
        return await handleTurnover(action as any, game);

      case "FOUL":
        return await handleFoul(action as any, game);

      case "SUBSTITUTION":
        return await handleSubstitution(action as any, game);

      case "TIMEOUT":
        return await handleTimeout(action as any, game);

      default:
        return {
          success: false,
          error: `Unknown action type`,
        };
    }
  } catch (error) {
    console.error("[recordFibaEvent] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// FIELD GOAL HANDLER (2PT, 3PT, MISS)
// ═══════════════════════════════════════════════════════════════════════════

async function handleFieldGoal(
  action: any,
  game: any
): Promise<FibaEventResult> {
  const { gameId, teamId, playerId, points, eventContext, subtype } = action;

  const isHome = teamId === game.homeTeamId;
  const isMiss = subtype.includes("MISS");

  // Get current game clock
  const gameClockSeconds = QUARTER_DURATION_SECONDS - game.currentTimeLeft;

  // Transaction for atomic update
  const [gameEvent, boxScore] = await prisma.$transaction(async (tx) => {
    // 1. Update game score
    const updatedGame = await tx.game.update({
      where: { id: gameId },
      data: isHome
        ? { homeScore: { increment: isMiss ? 0 : points } }
        : { awayScore: { increment: isMiss ? 0 : points } },
    });

    // 2. Create game event
    const gameEvent = await tx.gameEvent.create({
      data: {
        gameId,
        teamId,
        playerId,
        type: isMiss ? "FIELD_GOAL_MISS" : "FIELD_GOAL",
        eventSubtype: subtype, // "2PT", "3PT", "MISS_2PT", "MISS_3PT"
        points: isMiss ? 0 : points,
        quarter: game.quarter,
        eventContext: eventContext || "normal",
        gameClockSeconds,
      },
    });

    // 3. Upsert box score
    const existing = await tx.boxScore.findUnique({
      where: { gameId_playerId: { gameId, playerId } },
    });

    let boxScore;
    if (isMiss) {
      // Miss: increment attempted only
      const missField =
        subtype === "MISS_2PT" ? "fg2Attempted" :
        subtype === "MISS_3PT" ? "fg3Attempted" : "fgAttempted";

      boxScore = existing
        ? await tx.boxScore.update({
            where: { id: existing.id },
            data: {
              fgAttempted: { increment: 1 },
              [missField]: { increment: 1 },
            },
          })
        : await tx.boxScore.create({
            data: {
              gameId,
              playerId,
              teamId,
              fgAttempted: 1,
              [missField]: 1,
            },
          });
    } else {
      // Make: increment made AND attempted
      const madeField =
        points === 2 ? "fg2Made" : points === 3 ? "fg3Made" : "fgMade";
      const attemptedField =
        points === 2 ? "fg2Attempted" : points === 3 ? "fg3Attempted" : "fgAttempted";

      boxScore = existing
        ? await tx.boxScore.update({
            where: { id: existing.id },
            data: {
              points: { increment: points },
              fgMade: { increment: 1 },
              fgAttempted: { increment: 1 },
              [madeField]: { increment: 1 },
              [attemptedField]: { increment: 1 },
            },
          })
        : await tx.boxScore.create({
            data: {
              gameId,
              playerId,
              teamId,
              points,
              fgMade: 1,
              fgAttempted: 1,
              [madeField]: 1,
              [attemptedField]: 1,
            },
          });
    }

    return [gameEvent, boxScore];
  });

  // Calculate efficiency after transaction
  const efficiency = await calculateEfficiency(gameId, playerId);

  // Update efficiency
  if (boxScore) {
    await prisma.boxScore.update({
      where: { id: boxScore.id },
      data: { efficiency },
    });
  }

  return {
    success: true,
    gameEventId: gameEvent.id,
    boxScoreId: boxScore?.id,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// FREE THROW HANDLER
// ═══════════════════════════════════════════════════════════════════════════

async function handleFreeThrow(
  action: any,
  game: any
): Promise<FibaEventResult> {
  const { gameId, teamId, playerId, subtype, ftSequence } = action;
  const isMade = subtype === "FT_MADE";

  const gameClockSeconds = QUARTER_DURATION_SECONDS - game.currentTimeLeft;

  const [gameEvent, boxScore] = await prisma.$transaction(async (tx) => {
    // 1. Update game score
    const updatedGame = await tx.game.update({
      where: { id: gameId },
      data: {
        [teamId === game.homeTeamId ? "homeScore" : "awayScore"]: {
          increment: isMade ? 1 : 0,
        },
      },
    });

    // 2. Create game event
    const gameEvent = await tx.gameEvent.create({
      data: {
        gameId,
        teamId,
        playerId,
        type: "FREE_THROW",
        eventSubtype: subtype,
        points: isMade ? 1 : 0,
        quarter: game.quarter,
        gameClockSeconds,
      },
    });

    // 3. Upsert box score
    const existing = await tx.boxScore.findUnique({
      where: { gameId_playerId: { gameId, playerId } },
    });

    const boxScore = existing
      ? await tx.boxScore.update({
          where: { id: existing.id },
          data: {
            ftAttempted: { increment: 1 },
            ...(isMade && { ftMade: { increment: 1 }, points: { increment: 1 } }),
          },
        })
      : await tx.boxScore.create({
          data: {
            gameId,
            playerId,
            teamId,
            ftAttempted: 1,
            ...(isMade && { ftMade: 1, points: 1 }),
          },
        });

    return [gameEvent, boxScore];
  });

  return {
    success: true,
    gameEventId: gameEvent.id,
    boxScoreId: boxScore?.id,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// REBOUND HANDLER
// ═══════════════════════════════════════════════════════════════════════════

async function handleRebound(
  action: any,
  game: any
): Promise<FibaEventResult> {
  const { gameId, teamId, playerId, subtype } = action;
  const isOffensive = subtype === "REBOUND_OFF";

  const gameClockSeconds = QUARTER_DURATION_SECONDS - game.currentTimeLeft;

  const [gameEvent, boxScore] = await prisma.$transaction(async (tx) => {
    // 1. Create game event
    const gameEvent = await tx.gameEvent.create({
      data: {
        gameId,
        teamId,
        playerId,
        type: "REBOUND",
        eventSubtype: subtype,
        quarter: game.quarter,
        gameClockSeconds,
      },
    });

    // 2. Upsert box score
    const existing = await tx.boxScore.findUnique({
      where: { gameId_playerId: { gameId, playerId } },
    });

    const field = isOffensive ? "reboundsOff" : "reboundsDef";

    const boxScore = existing
      ? await tx.boxScore.update({
          where: { id: existing.id },
          data: {
            rebounds: { increment: 1 },
            [field]: { increment: 1 },
          },
        })
      : await tx.boxScore.create({
          data: {
            gameId,
            playerId,
            teamId,
            rebounds: 1,
            [field]: 1,
          },
        });

    return [gameEvent, boxScore];
  });

  // Recalc efficiency
  const efficiency = await calculateEfficiency(gameId, playerId);
  await prisma.boxScore.update({
    where: { id: boxScore.id },
    data: { efficiency },
  });

  return {
    success: true,
    gameEventId: gameEvent.id,
    boxScoreId: boxScore?.id,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// ASSIST HANDLER
// ═══════════════════════════════════════════════════════════════════════════

async function handleAssist(
  action: any,
  game: any
): Promise<FibaEventResult> {
  const { gameId, teamId, playerId } = action;
  const gameClockSeconds = QUARTER_DURATION_SECONDS - game.currentTimeLeft;

  const [gameEvent, boxScore] = await prisma.$transaction(async (tx) => {
    const gameEvent = await tx.gameEvent.create({
      data: {
        gameId,
        teamId,
        playerId,
        type: "ASSIST",
        eventSubtype: "ASSIST",
        quarter: game.quarter,
        gameClockSeconds,
      },
    });

    const existing = await tx.boxScore.findUnique({
      where: { gameId_playerId: { gameId, playerId } },
    });

    const boxScore = existing
      ? await tx.boxScore.update({
          where: { id: existing.id },
          data: { assists: { increment: 1 } },
        })
      : await tx.boxScore.create({
          data: { gameId, playerId, teamId, assists: 1 },
        });

    return [gameEvent, boxScore];
  });

  const efficiency = await calculateEfficiency(gameId, playerId);
  await prisma.boxScore.update({
    where: { id: boxScore.id },
    data: { efficiency },
  });

  return {
    success: true,
    gameEventId: gameEvent.id,
    boxScoreId: boxScore?.id,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// STEAL HANDLER
// ═══════════════════════════════════════════════════════════════════════════

async function handleSteal(
  action: any,
  game: any
): Promise<FibaEventResult> {
  const { gameId, teamId, playerId } = action;
  const gameClockSeconds = QUARTER_DURATION_SECONDS - game.currentTimeLeft;

  const [gameEvent, boxScore] = await prisma.$transaction(async (tx) => {
    const gameEvent = await tx.gameEvent.create({
      data: {
        gameId,
        teamId,
        playerId,
        type: "STEAL",
        eventSubtype: "STEAL",
        quarter: game.quarter,
        gameClockSeconds,
      },
    });

    const existing = await tx.boxScore.findUnique({
      where: { gameId_playerId: { gameId, playerId } },
    });

    const boxScore = existing
      ? await tx.boxScore.update({
          where: { id: existing.id },
          data: { steals: { increment: 1 } },
        })
      : await tx.boxScore.create({
          data: { gameId, playerId, teamId, steals: 1 },
        });

    return [gameEvent, boxScore];
  });

  const efficiency = await calculateEfficiency(gameId, playerId);
  await prisma.boxScore.update({
    where: { id: boxScore.id },
    data: { efficiency },
  });

  return {
    success: true,
    gameEventId: gameEvent.id,
    boxScoreId: boxScore?.id,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// BLOCK HANDLER
// ═══════════════════════════════════════════════════════════════════════════

async function handleBlock(
  action: any,
  game: any
): Promise<FibaEventResult> {
  const { gameId, teamId, playerId } = action;
  const gameClockSeconds = QUARTER_DURATION_SECONDS - game.currentTimeLeft;

  const [gameEvent, boxScore] = await prisma.$transaction(async (tx) => {
    const gameEvent = await tx.gameEvent.create({
      data: {
        gameId,
        teamId,
        playerId,
        type: "BLOCK",
        eventSubtype: "BLOCK",
        quarter: game.quarter,
        gameClockSeconds,
      },
    });

    const existing = await tx.boxScore.findUnique({
      where: { gameId_playerId: { gameId, playerId } },
    });

    const boxScore = existing
      ? await tx.boxScore.update({
          where: { id: existing.id },
          data: { blocks: { increment: 1 } },
        })
      : await tx.boxScore.create({
          data: { gameId, playerId, teamId, blocks: 1 },
        });

    return [gameEvent, boxScore];
  });

  const efficiency = await calculateEfficiency(gameId, playerId);
  await prisma.boxScore.update({
    where: { id: boxScore.id },
    data: { efficiency },
  });

  return {
    success: true,
    gameEventId: gameEvent.id,
    boxScoreId: boxScore?.id,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// TURNOVER HANDLER
// ═══════════════════════════════════════════════════════════════════════════

async function handleTurnover(
  action: any,
  game: any
): Promise<FibaEventResult> {
  const { gameId, teamId, playerId } = action;
  const gameClockSeconds = QUARTER_DURATION_SECONDS - game.currentTimeLeft;

  const [gameEvent, boxScore] = await prisma.$transaction(async (tx) => {
    const gameEvent = await tx.gameEvent.create({
      data: {
        gameId,
        teamId,
        playerId,
        type: "TURNOVER",
        eventSubtype: "TURNOVER",
        quarter: game.quarter,
        gameClockSeconds,
      },
    });

    const existing = await tx.boxScore.findUnique({
      where: { gameId_playerId: { gameId, playerId } },
    });

    const boxScore = existing
      ? await tx.boxScore.update({
          where: { id: existing.id },
          data: { turnovers: { increment: 1 } },
        })
      : await tx.boxScore.create({
          data: { gameId, playerId, teamId, turnovers: 1 },
        });

    return [gameEvent, boxScore];
  });

  return {
    success: true,
    gameEventId: gameEvent.id,
    boxScoreId: boxScore?.id,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// FOUL HANDLER (All Foul Types: P, T, U, D, C)
// ═══════════════════════════════════════════════════════════════════════════

async function handleFoul(
  action: any,
  game: any
): Promise<FibaEventResult> {
  const { gameId, teamId, playerId, foulType, fouledPlayerId, wasShooting } =
    action;

  const gameClockSeconds = QUARTER_DURATION_SECONDS - game.currentTimeLeft;

  const result = await prisma.$transaction(async (tx) => {
    // 1. Create game event
    const gameEvent = await tx.gameEvent.create({
      data: {
        gameId,
        teamId,
        playerId,
        type: "FOUL",
        eventSubtype: undefined, // Use separate foulType field
        foulType,
        fouledPlayerId: fouledPlayerId || null,
        wasShooting: wasShooting || false,
        quarter: game.quarter,
        gameClockSeconds,
      },
    });

    // 2. Update box score
    const existing = await tx.boxScore.findUnique({
      where: { gameId_playerId: { gameId, playerId } },
    });

    const updateData: any = { fouls: { increment: 1 } };

    // Track by foul type (P, T, U, D)
    if (foulType === "PERSONAL") {
      updateData.foulsPersonal = { increment: 1 };
    } else if (foulType === "TECHNICAL") {
      updateData.foulsTechnical = { increment: 1 };
    } else if (foulType === "UNSPORTSMANLIKE") {
      updateData.foulsUnsports = { increment: 1 };
    } else if (foulType === "DISQUALIFYING") {
      updateData.foulsDisq = { increment: 1 };
    }

    const boxScore = existing
      ? await tx.boxScore.update({
          where: { id: existing.id },
          data: updateData,
        })
      : await tx.boxScore.create({
          data: {
            gameId,
            playerId,
            teamId,
            fouls: 1,
            ...(foulType === "PERSONAL" && { foulsPersonal: 1 }),
            ...(foulType === "TECHNICAL" && { foulsTechnical: 1 }),
            ...(foulType === "UNSPORTSMANLIKE" && { foulsUnsports: 1 }),
            ...(foulType === "DISQUALIFYING" && { foulsDisq: 1 }),
          },
        });

    // 3. Check for fouls out (5 personal = DQ or 2x T+U = DQ)
    const totalFouls = boxScore.fouls + 1;
    const technicalUnsports = (boxScore.foulsTechnical || 0) +
      (boxScore.foulsUnsports || 0) +
      (foulType === "TECHNICAL" || foulType === "UNSPORTSMANLIKE" ? 1 : 0);

    const isFouledOut = totalFouls >= FIBA_RULES.MAX_PERSONAL_FOULS;
    const isDisqualified = technicalUnsports >= FIBA_RULES.MAX_TECHNICAL_UNSPORTS ||
      foulType === "DISQUALIFYING";

    if (isFouledOut || isDisqualified) {
      await tx.boxScore.update({
        where: { id: boxScore.id },
        data: {
          isFouledOut: isFouledOut,
          isDisqualified: isDisqualified,
        },
      });

      // Автоматично видалити гравця з площе (sub out)
      const onCourt = await tx.gameOnCourt.findUnique({
        where: { gameId_playerId: { gameId, playerId } },
      });

      if (onCourt?.onCourt) {
        await tx.gameOnCourt.update({
          where: { gameId_playerId: { gameId, playerId } },
          data: { onCourt: false },
        });
      }
    }

    return [gameEvent, boxScore, { isFouledOut, isDisqualified }];
  });

  const [gameEvent, boxScore, validationObj] = result as any;

  return {
    success: true,
    gameEventId: (gameEvent as any)?.id,
    boxScoreId: (boxScore as any)?.id,
    validation: validationObj,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// SUBSTITUTION HANDLER
// ═══════════════════════════════════════════════════════════════════════════

async function handleSubstitution(
  action: any,
  game: any
): Promise<FibaEventResult> {
  const { gameId, teamId, playerId, subtype, playerOutId } = action;
  const gameClockSeconds = QUARTER_DURATION_SECONDS - game.currentTimeLeft;

  const result = await prisma.$transaction(async (tx) => {
    // 1. Create substitution event
    const subEvent = await tx.gameSubstitution.create({
      data: {
        gameId,
        teamId,
        playerId,
        playerOutId: playerOutId || null,
        action: subtype, // "IN" | "OUT"
        quarter: game.quarter,
        gameClockSeconds,
      },
    });

    // 2. Update onCourt status
    const onCourtRecord = await tx.gameOnCourt.findUnique({
      where: { gameId_playerId: { gameId, playerId } },
    });

    if (onCourtRecord) {
      const isSubIn = subtype === "IN";

      // If IN: update timestamp and set onCourt to true
      // If OUT: set onCourt to false, accumulate time
      let timeOnCourtSeconds = onCourtRecord.timeOnCourtSeconds || 0;

      if (!isSubIn && onCourtRecord.lastSubInTimestamp !== null) {
        // Player exiting: add to accumulated time
        const segmentDuration = gameClockSeconds - onCourtRecord.lastSubInTimestamp;
        timeOnCourtSeconds += Math.max(0, segmentDuration);
      }

      await tx.gameOnCourt.update({
        where: { gameId_playerId: { gameId, playerId } },
        data: {
          onCourt: isSubIn,
          lastSubInTimestamp: isSubIn ? gameClockSeconds : null,
          timeOnCourtSeconds,
        },
      });
    }

    return subEvent;
  });

  return {
    success: true,
    gameEventId: result.id,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// TIMEOUT HANDLER
// ═══════════════════════════════════════════════════════════════════════════

async function handleTimeout(
  action: any,
  game: any
): Promise<FibaEventResult> {
  const { gameId, teamId } = action;

  const result = await prisma.$transaction(async (tx) => {
    // Decrement timeout for team
    const currentTimeouts =
      teamId === game.homeTeamId ? game.homeTimeouts : game.awayTimeouts;

    if (currentTimeouts <= 0) {
      throw new Error("No timeouts remaining");
    }

    const updated = await tx.game.update({
      where: { id: gameId },
      data: {
        [teamId === game.homeTeamId ? "homeTimeouts" : "awayTimeouts"]: {
          decrement: 1,
        },
      },
    });

    return updated;
  });

  return {
    success: true,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const QUARTER_DURATION_SECONDS = 600; // 10 minutes
