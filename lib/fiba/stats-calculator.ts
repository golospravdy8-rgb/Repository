/**
 * FIBA Statistics Calculator
 *
 * Performs calculations for:
 * - Player Efficiency (FIBA standard formula)
 * - Court Time (with proper rounding)
 * - Plus/Minus tracking
 * - Field Goal Percentages (2P%, 3P%, FT%)
 */

import { prisma } from "@/lib/prisma";

// ═══════════════════════════════════════════════════════════════════════════
// EFFICIENCY CALCULATION (FIBA Standard)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Calculate FIBA Player Efficiency
 *
 * Formula:
 * Efficiency = (PTS + REB + AST + STL + BLK) - (FGA - FGM + FTA - FTM + TO)
 *
 * @param gameId - Game ID
 * @param playerId - Player ID
 * @returns Efficiency number (can be negative)
 *
 * @example
 * Player with 20 PTS, 5 REB, 3 AST, 1 STL, 0 BLK, 2 TO, 8-15 FG, 2-3 FT
 * = (20 + 5 + 3 + 1 + 0) - (15 - 8 + 3 - 2 + 2)
 * = 29 - 10
 * = +19
 */
export async function calculateEfficiency(
  gameId: number,
  playerId: number
): Promise<number> {
  const boxScore = await prisma.boxScore.findUnique({
    where: { gameId_playerId: { gameId, playerId } },
  });

  if (!boxScore) return 0;

  const positives =
    (boxScore.points || 0) +
    (boxScore.rebounds || 0) +
    (boxScore.assists || 0) +
    (boxScore.steals || 0) +
    (boxScore.blocks || 0);

  const negatives =
    (boxScore.fgAttempted || 0) - (boxScore.fgMade || 0) +
    (boxScore.ftAttempted || 0) - (boxScore.ftMade || 0) +
    (boxScore.turnovers || 0);

  return positives - negatives;
}

// ═══════════════════════════════════════════════════════════════════════════
// COURT TIME FORMATTING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Convert seconds to MM:SS format (FIBA standard for protocol)
 *
 * @param seconds - Total seconds played
 * @returns String in format "MM:SS"
 *
 * @example
 * formatCourtTime(330) => "5:30"
 * formatCourtTime(45) => "0:45"
 * formatCourtTime(600) => "10:00"
 */
export function formatCourtTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Get player court time in MM:SS format
 *
 * Uses BoxScore.timeOnCourtSeconds which is updated on each substitution.
 * If player is currently on court, adds time from last entry to current moment.
 *
 * @param gameId - Game ID
 * @param playerId - Player ID
 * @param currentGameClockSeconds - Current game clock (600 - timeLeft)
 * @returns String in format "MM:SS"
 */
export async function getPlayerCourtTime(
  gameId: number,
  playerId: number,
  currentGameClockSeconds?: number
): Promise<string> {
  const boxScore = await prisma.boxScore.findUnique({
    where: { gameId_playerId: { gameId, playerId } },
  });

  if (!boxScore) return "0:00";

  let totalSeconds = boxScore.timeOnCourtSeconds || 0;

  // If currently on court, add current segment
  if (boxScore.isOnCourt && boxScore.enteredAt !== null) {
    const gameClock = currentGameClockSeconds || 0;
    const currentSegment = gameClock - boxScore.enteredAt;
    totalSeconds += Math.max(0, currentSegment);
  }

  return formatCourtTime(totalSeconds);
}

// ═══════════════════════════════════════════════════════════════════════════
// PLUS/MINUS CALCULATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Calculate Plus/Minus for a player
 *
 * Formula:
 * +/- = (Team points while player on court) - (Opponent points while player on court)
 *
 * This requires tracking when player was on/off court.
 * Simplified version: calculate from game score difference when player was court
 *
 * @param gameId - Game ID
 * @param playerId - Player ID
 * @param teamId - Player's team ID
 * @returns Plus/Minus number
 */
export async function calculatePlusMinus(
  gameId: number,
  playerId: number,
  teamId: number
): Promise<number> {
  // Get all events while player was on court
  const events = await prisma.gameEvent.findMany({
    where: { gameId },
    orderBy: { createdAt: "asc" },
  });

  // Get on/off court timing
  const substitutions = await prisma.gameSubstitution.findMany({
    where: { gameId, playerId },
    orderBy: { createdAt: "asc" },
  });

  // Calculate: sum of (team points - opponent points) during on-court periods
  // This is simplified; full implementation would track exact intervals
  let plusMinus = 0;

  // For now, return 0 (requires event-based tracking enhancement)
  // TODO: Implement full +/- tracking with on/off court timing

  return plusMinus;
}

/**
 * Get Plus/Minus context (for potential future use)
 */
export async function calculatePlusMinusContext(
  gameId: number,
  playerId: number
): Promise<{ isPositive: boolean; magnitude: number }> {
  const boxScore = await prisma.boxScore.findUnique({
    where: { gameId_playerId: { gameId, playerId } },
  });

  const pm = boxScore?.plusMinus || 0;

  return {
    isPositive: pm > 0,
    magnitude: Math.abs(pm),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// PERCENTAGE CALCULATIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Calculate field goal percentage
 *
 * @param made - Field goals made
 * @param attempted - Field goals attempted
 * @returns Percentage as number (0-100) or null if no attempts
 */
export function calculateFGPercentage(
  made: number,
  attempted: number
): number | null {
  if (attempted === 0) return null;
  return Math.round((made / attempted) * 100);
}

/**
 * Format percentage for display
 *
 * @param percentage - Percentage number
 * @returns String like "45.5%" or "-"
 */
export function formatPercentage(percentage: number | null): string {
  if (percentage === null) return "-";
  return `${percentage.toFixed(1)}%`;
}

// ═══════════════════════════════════════════════════════════════════════════
// BULK STATISTICS CALCULATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Calculate all statistics for a player at once (for protocol display)
 *
 * @param gameId - Game ID
 * @param playerId - Player ID
 * @param currentGameClockSeconds - Optional current game clock
 * @returns Complete stats object
 */
export async function calculatePlayerStats(
  gameId: number,
  playerId: number,
  currentGameClockSeconds?: number
) {
  const boxScore = await prisma.boxScore.findUnique({
    where: { gameId_playerId: { gameId, playerId } },
  });

  if (!boxScore) {
    return {
      points: 0,
      fgMade: 0,
      fgAttempted: 0,
      fgPercent: null,
      fg2Made: 0,
      fg2Attempted: 0,
      fg2Percent: null,
      fg3Made: 0,
      fg3Attempted: 0,
      fg3Percent: null,
      ftMade: 0,
      ftAttempted: 0,
      ftPercent: null,
      reboundsOff: 0,
      reboundsDef: 0,
      reboundsTotal: 0,
      assists: 0,
      steals: 0,
      blocks: 0,
      turnovers: 0,
      fouls: 0,
      efficiency: 0,
      courtTime: "0:00",
    };
  }

  const courtTime = await getPlayerCourtTime(gameId, playerId, currentGameClockSeconds);
  const efficiency = await calculateEfficiency(gameId, playerId);

  return {
    points: boxScore.points || 0,
    fgMade: boxScore.fgMade || 0,
    fgAttempted: boxScore.fgAttempted || 0,
    fgPercent: calculateFGPercentage(
      boxScore.fgMade || 0,
      boxScore.fgAttempted || 0
    ),
    fg2Made: boxScore.fg2Made || 0,
    fg2Attempted: boxScore.fg2Attempted || 0,
    fg2Percent: calculateFGPercentage(
      boxScore.fg2Made || 0,
      boxScore.fg2Attempted || 0
    ),
    fg3Made: boxScore.fg3Made || 0,
    fg3Attempted: boxScore.fg3Attempted || 0,
    fg3Percent: calculateFGPercentage(
      boxScore.fg3Made || 0,
      boxScore.fg3Attempted || 0
    ),
    ftMade: boxScore.ftMade || 0,
    ftAttempted: boxScore.ftAttempted || 0,
    ftPercent: calculateFGPercentage(
      boxScore.ftMade || 0,
      boxScore.ftAttempted || 0
    ),
    reboundsOff: boxScore.reboundsOff || 0,
    reboundsDef: boxScore.reboundsDef || 0,
    reboundsTotal: boxScore.rebounds || 0,
    assists: boxScore.assists || 0,
    steals: boxScore.steals || 0,
    blocks: boxScore.blocks || 0,
    turnovers: boxScore.turnovers || 0,
    fouls: {
      personal: boxScore.foulsPersonal || 0,
      technical: boxScore.foulsTechnical || 0,
      unsports: boxScore.foulsUnsports || 0,
      disq: boxScore.foulsDisq || 0,
      total: boxScore.fouls || 0,
    },
    efficiency,
    courtTime,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// TEAM STATISTICS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get team foul count for a specific quarter
 *
 * Used to track when team reaches foul penalty threshold
 *
 * @param gameId - Game ID
 * @param teamId - Team ID
 * @param quarter - Quarter number (1-4)
 * @returns Total fouls by team in quarter
 */
export async function getTeamFoulCount(
  gameId: number,
  teamId: number,
  quarter: number
): Promise<number> {
  const fouls = await prisma.gameEvent.count({
    where: {
      gameId,
      teamId,
      quarter,
      type: "FOUL",
    },
  });

  return fouls;
}

/**
 * Check if team has reached foul penalty threshold
 *
 * FIBA Rules: 5 fouls per quarter = free throw
 *
 * @param gameId - Game ID
 * @param teamId - Team ID
 * @param quarter - Quarter number
 * @returns true if team has 5+ fouls
 */
export async function isTeamInBonus(
  gameId: number,
  teamId: number,
  quarter: number
): Promise<boolean> {
  const count = await getTeamFoulCount(gameId, teamId, quarter);
  return count >= 5;
}
