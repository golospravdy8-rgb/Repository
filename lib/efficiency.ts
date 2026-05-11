/**
 * lib/efficiency.ts
 * Обчислення EFF (Player Efficiency Rating) за FIBA стандартом
 *
 * EFF = PTS + REB + AST + STL + BLK
 *       - (FGA - FGM)
 *       - (FTA - FTM)
 *       - TO
 */

export function calculateEFF(boxScore: {
  points?: number | null;
  rebounds?: number | null;
  reboundsDef?: number | null;
  reboundsOff?: number | null;
  assists?: number | null;
  steals?: number | null;
  blocks?: number | null;
  turnovers?: number | null;
  fg2Made?: number | null;
  fg3Made?: number | null;
  fg2Attempted?: number | null;
  fg3Attempted?: number | null;
  ftMade?: number | null;
  ftAttempted?: number | null;
}): number {
  const pts = boxScore.points || 0;
  const reb = (boxScore.reboundsDef || 0) + (boxScore.reboundsOff || 0);
  const ast = boxScore.assists || 0;
  const stl = boxScore.steals || 0;
  const blk = boxScore.blocks || 0;

  const fga = (boxScore.fg2Attempted || 0) + (boxScore.fg3Attempted || 0);
  const fgm = (boxScore.fg2Made || 0) + (boxScore.fg3Made || 0);
  const fta = boxScore.ftAttempted || 0;
  const ftm = boxScore.ftMade || 0;
  const to = boxScore.turnovers || 0;

  return pts + reb + ast + stl + blk - (fga - fgm) - (fta - ftm) - to;
}
