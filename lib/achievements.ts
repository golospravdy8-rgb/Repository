export interface Badge {
  id: string;
  name: string;
  icon: string;
  description: string;
  color: string;
}

export const BADGES: Badge[] = [
  { id: "top-scorer",   name: "Снайпер",       icon: "🏀", description: "Набрав 20+ очок в одній грі",    color: "#f97316" },
  { id: "team-player",  name: "Командний гравець", icon: "🤝", description: "5+ асистів в одній грі",    color: "#3b82f6" },
  { id: "defender",     name: "Захисник",       icon: "🛡",  description: "3+ перехоплень в одній грі",  color: "#22c55e" },
  { id: "rebounder",    name: "Підбирач",       icon: "💪", description: "10+ підборів в одній грі",     color: "#8b5cf6" },
  { id: "iron-man",     name: "Залізна людина", icon: "🦾", description: "Зіграв 5+ ігор",               color: "#ef4444" },
];

export function calculateRating(
  boxScores: { points: number; rebounds: number; assists: number; steals: number; blocks: number }[]
): number {
  if (!boxScores || boxScores.length === 0) return 0;
  const total = boxScores.reduce(
    (acc, bs) => acc + bs.points * 1 + bs.rebounds * 1.2 + bs.assists * 1.5 + bs.steals * 2 + bs.blocks * 2,
    0
  );
  return Math.round(total / boxScores.length);
}

export function getRatingTier(rating: number): "gold" | "silver" | "bronze" {
  if (rating >= 25) return "gold";
  if (rating >= 15) return "silver";
  if (rating >= 8)  return "bronze";
  return "bronze";
}

export function checkNewAchievements(
  boxScores: { points: number; rebounds: number; assists: number; steals: number; blocks: number }[],
  alreadyUnlocked: string[]
): string[] {
  const unlocked = new Set(alreadyUnlocked);
  const newBadges: string[] = [];

  const hasGame = (fn: (bs: typeof boxScores[0]) => boolean) => boxScores.some(fn);

  if (!unlocked.has("top-scorer")  && hasGame((bs) => bs.points >= 20))    newBadges.push("top-scorer");
  if (!unlocked.has("team-player") && hasGame((bs) => bs.assists >= 5))    newBadges.push("team-player");
  if (!unlocked.has("defender")    && hasGame((bs) => bs.steals >= 3))     newBadges.push("defender");
  if (!unlocked.has("rebounder")   && hasGame((bs) => bs.rebounds >= 10))  newBadges.push("rebounder");
  if (!unlocked.has("iron-man")    && boxScores.length >= 5)               newBadges.push("iron-man");

  return newBadges;
}
