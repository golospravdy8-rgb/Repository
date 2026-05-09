/**
 * Legacy Wrappers for Backward Compatibility
 *
 * These functions maintain the original API from LiveScoreTracker.tsx
 * while routing all events through the new FIBA Event Engine.
 *
 * This ensures:
 * 1. Zero changes needed to UI components
 * 2. All events recorded with FIBA compliance
 * 3. Single source of truth (recordFibaEvent)
 * 4. Easy migration path (functions can be deprecated later)
 */

import { recordFibaEvent } from "./fiba-event-engine";
import type { FibaEventResult } from "./types";

// ═══════════════════════════════════════════════════════════════════════════
// SCORING WRAPPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Legacy: addScoreWithType(gameId, teamId, playerId, points, eventType, options)
 *
 * Converts to FIBA FIELD_GOAL or FREE_THROW event
 * Called by: LiveScoreTracker.tsx
 *
 * PHASE 1: Now passes gameClockSeconds and isFreeThrow from UI
 *
 * @param gameId
 * @param teamId
 * @param playerId
 * @param points - 1, 2, or 3
 * @param eventType - "normal", "fastbreak", "second_chance", "off_turnover"
 * @param options - { gameClockSeconds?: number, isFreeThrow?: boolean }
 */
export async function addScoreWithType(
  gameId: number,
  teamId: number,
  playerId: number,
  points: 1 | 2 | 3,
  eventType?: string,
  options?: { gameClockSeconds?: number; isFreeThrow?: boolean }
): Promise<{ newAchievements: string[] }> {
  // PHASE 1: isFreeThrow differentiates between regular and FT
  const isFreeThrow = options?.isFreeThrow ?? false;
  const gameClockSeconds = options?.gameClockSeconds ?? 0;

  if (points === 1) {
    // PHASE 1: Free throw or regular 1-point (as a field goal or FT)
    if (isFreeThrow) {
      await recordFibaEvent({
        type: "FREE_THROW",
        subtype: "FT_MADE",
        gameId,
        teamId,
        playerId,
        points: 1,
        gameClockSeconds,
      });
    } else {
      // Regular 1-point (e.g., And-1 converted as a "1-point field goal")
      // Use 2PT as closest category or treat as free throw made
      await recordFibaEvent({
        type: "FREE_THROW",
        subtype: "FT_MADE",
        gameId,
        teamId,
        playerId,
        points: 1,
        gameClockSeconds,
      });
    }
  } else if (points === 2) {
    const ctx = (eventType || "normal") as "normal" | "fastbreak" | "second_chance" | "off_turnover";
    await recordFibaEvent({
      type: "FIELD_GOAL",
      subtype: "2PT",
      gameId,
      teamId,
      playerId,
      points: 2,
      eventContext: ctx,
      gameClockSeconds,
    });
  } else {
    // 3-pointer
    const ctx = (eventType || "normal") as "normal" | "fastbreak" | "second_chance" | "off_turnover";
    await recordFibaEvent({
      type: "FIELD_GOAL",
      subtype: "3PT",
      gameId,
      teamId,
      playerId,
      points: 3,
      eventContext: ctx,
      gameClockSeconds,
    });
  }

  // TODO: Fetch and return achievements if needed
  return { newAchievements: [] };
}

/**
 * Legacy: addScore(gameId, teamId, playerId, points)
 *
 * Deprecated - use addScoreWithType instead.
 * Kept for backward compatibility with any direct calls.
 */
export async function addScore(
  gameId: number,
  teamId: number,
  playerId: number,
  points: 1 | 2 | 3
): Promise<{ newAchievements: string[] }> {
  return addScoreWithType(gameId, teamId, playerId, points, "normal");
}

// ═══════════════════════════════════════════════════════════════════════════
// REBOUND WRAPPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Legacy: addReboundDef(gameId, teamId, playerId, options)
 * UI button: "Підбір(З)" (захисний)
 *
 * PHASE 1: Now accepts gameClockSeconds
 */
export async function addReboundDef(
  gameId: number,
  teamId: number,
  playerId: number,
  options?: { gameClockSeconds?: number }
): Promise<{ newAchievements: string[] }> {
  await recordFibaEvent({
    type: "REBOUND",
    subtype: "REBOUND_DEF",
    gameId,
    teamId,
    playerId,
    gameClockSeconds: options?.gameClockSeconds,
  });

  return { newAchievements: [] };
}

/**
 * Legacy: addReboundOff(gameId, teamId, playerId, options)
 * UI button: "Підбір(н)" (атакуючий)
 *
 * PHASE 1: Now accepts gameClockSeconds
 */
export async function addReboundOff(
  gameId: number,
  teamId: number,
  playerId: number,
  options?: { gameClockSeconds?: number }
): Promise<{ newAchievements: string[] }> {
  await recordFibaEvent({
    type: "REBOUND",
    subtype: "REBOUND_OFF",
    gameId,
    teamId,
    playerId,
    gameClockSeconds: options?.gameClockSeconds,
  });

  return { newAchievements: [] };
}

/**
 * Legacy: addRebound(gameId, teamId, playerId)
 * Deprecated - use addReboundDef or addReboundOff
 *
 * This function would not know if it's offensive or defensive.
 * For safety, treat as defensive (more common).
 */
export async function addRebound(
  gameId: number,
  teamId: number,
  playerId: number
): Promise<{ newAchievements: string[] }> {
  return addReboundDef(gameId, teamId, playerId);
}

// ═══════════════════════════════════════════════════════════════════════════
// ASSIST WRAPPER
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Legacy: addAssist(gameId, teamId, playerId, options)
 * UI button: "ПР" (пас)
 *
 * PHASE 1: Now accepts gameClockSeconds
 */
export async function addAssist(
  gameId: number,
  teamId: number,
  playerId: number,
  options?: { gameClockSeconds?: number }
): Promise<{ newAchievements: string[] }> {
  await recordFibaEvent({
    type: "ASSIST",
    subtype: "ASSIST",
    gameId,
    teamId,
    playerId,
    gameClockSeconds: options?.gameClockSeconds,
  });

  return { newAchievements: [] };
}

// ═══════════════════════════════════════════════════════════════════════════
// DEFENSIVE WRAPPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Legacy: addSteal(gameId, teamId, playerId, options)
 *
 * PHASE 1: Now accepts gameClockSeconds
 */
export async function addSteal(
  gameId: number,
  teamId: number,
  playerId: number,
  options?: { gameClockSeconds?: number }
): Promise<{ newAchievements: string[] }> {
  await recordFibaEvent({
    type: "STEAL",
    subtype: "STEAL",
    gameId,
    teamId,
    playerId,
    gameClockSeconds: options?.gameClockSeconds,
  });

  return { newAchievements: [] };
}

/**
 * Legacy: addBlock(gameId, teamId, playerId, options)
 *
 * PHASE 1: Now accepts gameClockSeconds
 */
export async function addBlock(
  gameId: number,
  teamId: number,
  playerId: number,
  options?: { gameClockSeconds?: number }
): Promise<{ newAchievements: string[] }> {
  await recordFibaEvent({
    type: "BLOCK",
    subtype: "BLOCK",
    gameId,
    teamId,
    playerId,
    gameClockSeconds: options?.gameClockSeconds,
  });

  return { newAchievements: [] };
}

/**
 * Legacy: addTurnover(gameId, teamId, playerId, options)
 *
 * PHASE 1: Now accepts gameClockSeconds
 */
export async function addTurnover(
  gameId: number,
  teamId: number,
  playerId: number,
  options?: { gameClockSeconds?: number }
): Promise<{ newAchievements: string[] }> {
  await recordFibaEvent({
    type: "TURNOVER",
    subtype: "TURNOVER",
    gameId,
    teamId,
    playerId,
    gameClockSeconds: options?.gameClockSeconds,
  });

  return { newAchievements: [] };
}

// ═══════════════════════════════════════════════════════════════════════════
// MISSED SHOT WRAPPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Legacy: addMissFg2(gameId, teamId, playerId, options)
 *
 * PHASE 1: Now accepts gameClockSeconds
 */
export async function addMissFg2(
  gameId: number,
  teamId: number,
  playerId: number,
  options?: { gameClockSeconds?: number }
): Promise<{ newAchievements: string[] }> {
  await recordFibaEvent({
    type: "FIELD_GOAL_MISS",
    subtype: "MISS_2PT",
    gameId,
    teamId,
    playerId,
    points: 0,
    gameClockSeconds: options?.gameClockSeconds,
  });

  return { newAchievements: [] };
}

/**
 * Legacy: addMissFg3(gameId, teamId, playerId, options)
 *
 * PHASE 1: Now accepts gameClockSeconds
 */
export async function addMissFg3(
  gameId: number,
  teamId: number,
  playerId: number,
  options?: { gameClockSeconds?: number }
): Promise<{ newAchievements: string[] }> {
  await recordFibaEvent({
    type: "FIELD_GOAL_MISS",
    subtype: "MISS_3PT",
    gameId,
    teamId,
    playerId,
    points: 0,
    gameClockSeconds: options?.gameClockSeconds,
  });

  return { newAchievements: [] };
}

/**
 * Legacy: addMissFt(gameId, teamId, playerId, options)
 *
 * PHASE 1: Now accepts gameClockSeconds
 */
export async function addMissFt(
  gameId: number,
  teamId: number,
  playerId: number,
  options?: { gameClockSeconds?: number }
): Promise<{ newAchievements: string[] }> {
  await recordFibaEvent({
    type: "FREE_THROW",
    subtype: "FT_MISS",
    gameId,
    teamId,
    playerId,
    points: 0,
    gameClockSeconds: options?.gameClockSeconds,
  });

  return { newAchievements: [] };
}

// ═══════════════════════════════════════════════════════════════════════════
// FOUL WRAPPERS (All types: P, T, U, D)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Legacy: addFoul(gameId, teamId, playerId, options)
 * UI button: "Фол" (типова/персональна)
 *
 * PHASE 1: Now accepts fouledPlayerId and gameClockSeconds
 */
export async function addFoul(
  gameId: number,
  teamId: number,
  playerId: number,
  options?: { gameClockSeconds?: number; fouledPlayerId?: number }
): Promise<void> {
  await recordFibaEvent({
    type: "FOUL",
    foulType: "PERSONAL",
    gameId,
    teamId,
    playerId,
    fouledPlayerId: options?.fouledPlayerId || undefined,
    gameClockSeconds: options?.gameClockSeconds,
  });
}

/**
 * Legacy: addFoulTechnical(gameId, teamId, playerId, options)
 * UI button: "Фол Т" (технічний)
 *
 * PHASE 1: Now accepts fouledPlayerId and gameClockSeconds
 * Results in: 1 FT + possession for opponent team
 */
export async function addFoulTechnical(
  gameId: number,
  teamId: number,
  playerId: number,
  options?: { gameClockSeconds?: number; fouledPlayerId?: number }
): Promise<void> {
  await recordFibaEvent({
    type: "FOUL",
    foulType: "TECHNICAL",
    gameId,
    teamId,
    playerId,
    fouledPlayerId: options?.fouledPlayerId || undefined,
    gameClockSeconds: options?.gameClockSeconds,
  });
}

/**
 * Legacy: addFoulUnsportsmanlike(gameId, teamId, playerId, options)
 * UI button: "Фол Л" (неспортивна)
 *
 * PHASE 1: Now accepts fouledPlayerId and gameClockSeconds
 * Results in: 1 FT + possession for opponent team
 */
export async function addFoulUnsportsmanlike(
  gameId: number,
  teamId: number,
  playerId: number,
  options?: { gameClockSeconds?: number; fouledPlayerId?: number }
): Promise<void> {
  await recordFibaEvent({
    type: "FOUL",
    foulType: "UNSPORTSMANLIKE",
    gameId,
    teamId,
    playerId,
    fouledPlayerId: options?.fouledPlayerId || undefined,
    gameClockSeconds: options?.gameClockSeconds,
  });
}

/**
 * Legacy: addFoulDisqualifying(gameId, teamId, playerId, options)
 * UI button: "Фол Д" (дисквалімікуюча)
 *
 * PHASE 1: Now accepts fouledPlayerId and gameClockSeconds
 * Results in: Player ejection
 */
export async function addFoulDisqualifying(
  gameId: number,
  teamId: number,
  playerId: number,
  options?: { gameClockSeconds?: number; fouledPlayerId?: number }
): Promise<void> {
  await recordFibaEvent({
    type: "FOUL",
    foulType: "DISQUALIFYING",
    gameId,
    teamId,
    playerId,
    fouledPlayerId: options?.fouledPlayerId || undefined,
    gameClockSeconds: options?.gameClockSeconds,
  });
}

/**
 * Legacy: addCoachFoul(gameId, teamId, playerId)
 *
 * Note: Coach foul doesn't have a playerId in old system.
 * For compatibility, we pass it but set to null in engine.
 */
export async function addCoachFoul(
  gameId: number,
  teamId: number,
  playerId?: number | null
): Promise<void> {
  await recordFibaEvent({
    type: "FOUL",
    foulType: "COACH",
    gameId,
    teamId,
    playerId: null,
  } as any);
}

// ═══════════════════════════════════════════════════════════════════════════
// SUBSTITUTION WRAPPER
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Legacy: addSubstitution(gameId, teamId, playerId, action, gameTime, options)
 *
 * Handles both IN and OUT substitutions.
 * Manages court time accumulation automatically.
 *
 * @param action - "in" or "out"
 *
 * PHASE 1: Now accepts gameClockSeconds
 */
export async function addSubstitution(
  gameId: number,
  teamId: number,
  playerId: number,
  action: "in" | "out",
  gameTime?: string,
  options?: { gameClockSeconds?: number }
): Promise<void> {
  const subtype = action === "in" ? "IN" : "OUT";

  await recordFibaEvent({
    type: "SUBSTITUTION",
    subtype,
    gameId,
    teamId,
    playerId,
    gameClockSeconds: options?.gameClockSeconds,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// TIMEOUT WRAPPER
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Legacy: addTimeout(gameId, teamId, options)
 *
 * PHASE 1: Now accepts gameClockSeconds
 */
export async function addTimeout(
  gameId: number,
  teamId: number,
  options?: { gameClockSeconds?: number }
): Promise<void> {
  await recordFibaEvent({
    type: "TIMEOUT",
    gameId,
    teamId,
    gameClockSeconds: options?.gameClockSeconds,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// FREE THROW WRAPPER (if used separately from scoring)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Legacy: addFreeThrow(gameId, teamId, playerId, made, options)
 *
 * Separate endpoint if free throws are recorded differently from scoring.
 * Otherwise, addScoreWithType(gameId, teamId, playerId, 1, eventType) is used.
 *
 * PHASE 1: Now accepts gameClockSeconds
 */
export async function addFreeThrow(
  gameId: number,
  teamId: number,
  playerId: number,
  made: boolean,
  options?: { gameClockSeconds?: number }
): Promise<void> {
  if (made) {
    await recordFibaEvent({
      type: "FREE_THROW",
      subtype: "FT_MADE",
      gameId,
      teamId,
      playerId,
      points: 1,
      gameClockSeconds: options?.gameClockSeconds,
    });
  } else {
    await recordFibaEvent({
      type: "FREE_THROW",
      subtype: "FT_MISS",
      gameId,
      teamId,
      playerId,
      points: 0,
      gameClockSeconds: options?.gameClockSeconds,
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// COURT TIME SYNC (Called from LiveScoreTracker periodically)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Legacy: updatePlayerCourtTimes(gameId, playerCourtTimes)
 *
 * Called from LiveScoreTracker to sync court times.
 * Now mostly redundant (court times tracked on substitution).
 * Kept for compatibility.
 */
export async function updatePlayerCourtTimes(
  gameId: number,
  playerCourtTimes: Record<number, number>
): Promise<void> {
  // No-op or light sync if needed
  // Real tracking happens on sub IN/OUT events
}

/**
 * Legacy: updateGameTimerState(gameId, state)
 *
 * Called from LiveScoreTracker to save timer state.
 * Persists current game status to DB.
 */
export async function updateGameTimerState(
  gameId: number,
  state: {
    timeLeft: number;
    quarter: number;
    timerRunning: boolean;
    status: "LIVE" | "PAUSED";
  }
): Promise<void> {
  const { prisma } = await import("@/lib/prisma");

  await prisma.game.update({
    where: { id: gameId },
    data: {
      currentTimeLeft: state.timeLeft,
      quarter: state.quarter,
      timerRunning: state.timerRunning,
    },
  });
}
