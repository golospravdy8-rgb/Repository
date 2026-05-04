export interface Badge {
  id: string;
  name: string;
  icon: string;
  description: string;
  color: string;
}

export const BADGES: Badge[] = [
  { id: "top-scorer",      name: "Снайпер",           icon: "🏀", description: "Набрав 20+ очок в одній грі",                    color: "#f97316" },
  { id: "team-player",     name: "Командний гравець", icon: "🤝", description: "5+ асистів в одній грі",                        color: "#3b82f6" },
  { id: "defender",        name: "Захисник",          icon: "🛡",  description: "3+ перехоплень в одній грі",                  color: "#22c55e" },
  { id: "rebounder",       name: "Підбирач",          icon: "💪", description: "10+ підборів в одній грі",                     color: "#8b5cf6" },
  { id: "iron-defense",    name: "Залізний захист",   icon: "🦾", description: "5+ блокшотів в одній грі",                     color: "#ef4444" },
  { id: "triple-double",   name: "Трипл-дабл",        icon: "⭐", description: "10+ очок + підборів + передач в одній грі",     color: "#fbbf24" },
  { id: "stable",          name: "Стабільний",        icon: "📈", description: "10+ очок у 3 іграх поспіль",                    color: "#06b6d4" },
  { id: "iron-man",        name: "Залізна людина",    icon: "💎", description: "Зіграв 5+ ігор",                               color: "#06b6d4" },
];

export function calculateRating(
  boxScores: { points: number; rebounds: number; assists: number; steals: number; blocks: number }[]
): number {
  if (!boxScores || boxScores.length === 0) return 0;
  const g = boxScores.length;
  const avgPoints = boxScores.reduce((s, bs) => s + bs.points, 0) / g;
  const avgRebounds = boxScores.reduce((s, bs) => s + bs.rebounds, 0) / g;
  const avgAssists = boxScores.reduce((s, bs) => s + bs.assists, 0) / g;
  const avgSteals = boxScores.reduce((s, bs) => s + bs.steals, 0) / g;
  const avgBlocks = boxScores.reduce((s, bs) => s + bs.blocks, 0) / g;

  const rating = 50 +
    avgPoints * 1.8 +
    avgRebounds * 1.2 +
    avgAssists * 1.5 +
    avgSteals * 2.0 +
    avgBlocks * 1.8;

  return Math.round(Math.min(99, rating));
}

export function getRatingTier(rating: number): "gold" | "silver" | "bronze" {
  if (rating >= 85) return "gold";
  if (rating >= 75) return "silver";
  return "bronze";
}

export function checkNewAchievements(
  boxScores: (
    { points: number; rebounds: number; assists: number; steals: number; blocks: number } &
    { game?: { scheduledAt: Date } }
  )[],
  alreadyUnlocked: string[]
): string[] {
  const unlocked = new Set(alreadyUnlocked);
  const newBadges: string[] = [];

  const hasGame = (fn: (bs: typeof boxScores[0]) => boolean) => boxScores.some(fn);

  if (!unlocked.has("top-scorer")    && hasGame((bs) => bs.points >= 20))                                    newBadges.push("top-scorer");
  if (!unlocked.has("team-player")   && hasGame((bs) => bs.assists >= 5))                                    newBadges.push("team-player");
  if (!unlocked.has("defender")      && hasGame((bs) => bs.steals >= 3))                                     newBadges.push("defender");
  if (!unlocked.has("rebounder")     && hasGame((bs) => bs.rebounds >= 10))                                  newBadges.push("rebounder");
  if (!unlocked.has("iron-defense")  && hasGame((bs) => bs.blocks >= 5))                                     newBadges.push("iron-defense");
  if (!unlocked.has("triple-double") && hasGame((bs) => bs.points >= 10 && bs.rebounds >= 10 && bs.assists >= 10)) newBadges.push("triple-double");
  if (!unlocked.has("iron-man")      && boxScores.length >= 5)                                               newBadges.push("iron-man");

  // Stable: 10+ points in 3 consecutive games
  if (!unlocked.has("stable")) {
    const sorted = boxScores
      .filter(bs => bs.game?.scheduledAt)
      .sort((a, b) => new Date(a.game!.scheduledAt).getTime() - new Date(b.game!.scheduledAt).getTime());

    let streak = 0;
    for (const bs of sorted) {
      streak = bs.points >= 10 ? streak + 1 : 0;
      if (streak >= 3) {
        newBadges.push("stable");
        break;
      }
    }
  }

  return newBadges;
}
