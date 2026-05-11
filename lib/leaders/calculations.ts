/**
 * lib/leaders/calculations.ts
 * Функції для розрахунку статистики лідерів (%, хвилини, рейтинг)
 */

import type { BoxScore } from "@prisma/client";
import { calculateEFF } from "@/lib/efficiency";

/**
 * Обчислює FG% (Field Goal Percentage)
 * FG% = (2P Made + 3P Made) / (2P Attempted + 3P Attempted) × 100
 */
export function calculateFGPercent(
  fg2Made: number,
  fg2Attempted: number,
  fg3Made: number,
  fg3Attempted: number
): number {
  const totalMade = fg2Made + fg3Made;
  const totalAttempted = fg2Attempted + fg3Attempted;

  if (totalAttempted === 0) return 0;
  return Math.round((totalMade / totalAttempted) * 1000) / 10; // 0-100, 1 знак після коми
}

/**
 * Обчислює 2P% (Two-Point Percentage)
 */
export function calculate2PPercent(fg2Made: number, fg2Attempted: number): number {
  if (fg2Attempted === 0) return 0;
  return Math.round((fg2Made / fg2Attempted) * 1000) / 10;
}

/**
 * Обчислює 3P% (Three-Point Percentage)
 */
export function calculate3PPercent(fg3Made: number, fg3Attempted: number): number {
  if (fg3Attempted === 0) return 0;
  return Math.round((fg3Made / fg3Attempted) * 1000) / 10;
}

/**
 * Обчислює FT% (Free Throw Percentage)
 */
export function calculateFTPercent(ftMade: number, ftAttempted: number): number {
  if (ftAttempted === 0) return 0;
  return Math.round((ftMade / ftAttempted) * 1000) / 10;
}

/**
 * Обчислює MPG (Minutes Per Game)
 * Опускається на timeOnCourtSeconds з BoxScore
 */
export function calculateMPG(totalTimeOnCourtSeconds: number, gamesPlayed: number): number {
  if (gamesPlayed === 0) return 0;
  const totalMinutes = totalTimeOnCourtSeconds / 60;
  return Math.round((totalMinutes / gamesPlayed) * 10) / 10;
}

/**
 * Обчислює ККД (Коефіцієнт Корисної Дії) за гру
 * ККД = (PTS + REB + AST + STL + BLK - FOULS) / Games
 */
export function calculateKKD(
  points: number,
  rebounds: number,
  assists: number,
  steals: number,
  blocks: number,
  fouls: number,
  gamesPlayed: number
): number {
  if (gamesPlayed === 0) return 0;
  const totalValue = points + rebounds + assists + steals + blocks - fouls;
  return Math.round((totalValue / gamesPlayed) * 10) / 10;
}

/**
 * Обчислює рейтинг гравця (0-99)
 * Formula: 50 + PPG×1.8 + RPG×1.2 + APG×1.5 + SPG×2.0 + BPG×1.8
 * Clamped to [0, 99] with NaN protection.
 * Single source of truth: see lib/achievements.ts calculateRating(boxScores[])
 */
export function calculateRating(
  ppg: number,
  rpg: number,
  apg: number,
  spg: number,
  bpg: number
): number {
  const rating = 50 + ppg * 1.8 + rpg * 1.2 + apg * 1.5 + spg * 2.0 + bpg * 1.8;
  return Math.max(0, Math.min(99, Math.round(rating)));
}

/**
 * Обчислює рейтинг-тир (gold/silver/bronze)
 */
export function getRatingTier(rating: number): "gold" | "silver" | "bronze" {
  if (rating >= 85) return "gold";
  if (rating >= 75) return "silver";
  return "bronze";
}

/**
 * Напрацьовує середнє значення з масиву BoxScore
 * Використовується для агрегації статистики гравця за весь сезон
 */
export interface AggregatedStats {
  points: number;
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  fouls: number;
  fg2Made: number;
  fg2Attempted: number;
  fg3Made: number;
  fg3Attempted: number;
  ftMade: number;
  ftAttempted: number;
  timeOnCourtSeconds: number;
  games: number;
}

/**
 * Розраховує усі метрики для одного гравця
 */
export function computeLeaderMetrics(stats: AggregatedStats) {
  const g = Math.max(1, stats.games);

  const ppg = Math.round((stats.points / g) * 10) / 10;
  const rpg = Math.round((stats.rebounds / g) * 10) / 10;
  const apg = Math.round((stats.assists / g) * 10) / 10;
  const spg = Math.round((stats.steals / g) * 10) / 10;
  const bpg = Math.round((stats.blocks / g) * 10) / 10;

  const fgPercent = calculateFGPercent(
    stats.fg2Made,
    stats.fg2Attempted,
    stats.fg3Made,
    stats.fg3Attempted
  );
  const fg2Percent = calculate2PPercent(stats.fg2Made, stats.fg2Attempted);
  const fg3Percent = calculate3PPercent(stats.fg3Made, stats.fg3Attempted);
  const ftPercent = calculateFTPercent(stats.ftMade, stats.ftAttempted);

  const mpg = calculateMPG(stats.timeOnCourtSeconds, g);
  const totalMinutes = Math.round(stats.timeOnCourtSeconds / 60);

  const rating = calculateRating(ppg, rpg, apg, spg, bpg);
  const tier = getRatingTier(rating);

  const kkd = calculateKKD(stats.points, stats.rebounds, stats.assists, stats.steals, stats.blocks, stats.fouls, g);

  const eff = calculateEFF({
    points: stats.points,
    rebounds: stats.rebounds,
    assists: stats.assists,
    steals: stats.steals,
    blocks: stats.blocks,
    turnovers: 0,
    fg2Made: stats.fg2Made,
    fg2Attempted: stats.fg2Attempted,
    fg3Made: stats.fg3Made,
    fg3Attempted: stats.fg3Attempted,
    ftMade: stats.ftMade,
    ftAttempted: stats.ftAttempted,
  });

  return {
    ppg,
    rpg,
    apg,
    spg,
    bpg,
    fgPercent,
    fg2Percent,
    fg3Percent,
    ftPercent,
    mpg,
    totalMinutes,
    rating,
    tier,
    kkd,
    eff,
  };
}
