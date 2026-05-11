/**
 * lib/leaders/types.ts
 * Типи для системи рейтингів та лідерів
 */

export type StatKey =
  | "ppg"           // очки на гру
  | "rpg"           // підбори на гру
  | "apg"           // передачі на гру
  | "spg"           // перехоплення на гру
  | "bpg"           // блокшоти на гру
  | "rating"        // рейтинг (0-99)
  | "fgPercent"     // FG%
  | "fg2Percent"    // 2P%
  | "fg3Percent"    // 3P%
  | "ftPercent"     // FT%
  | "mpg"           // хвилини на гру
  | "kkd";          // ККД (Коефіцієнт Корисної Дії)

export type Position = "PG" | "SG" | "SF" | "PF" | "C";

export type RatingTier = "gold" | "silver" | "bronze";

export type LeaderStats = {
  playerId: number;
  firstName: string;
  lastName: string;
  teamName: string;
  teamShortName: string;
  teamId: number;
  photoUrl: string | null;
  position?: Position;

  // Basic per-game averages
  ppg: number;        // очки на гру
  rpg: number;        // підбори на гру
  apg: number;        // передачі на гру
  spg: number;        // перехоплення на гру
  bpg: number;        // блокшоти на гру
  kkd: number;        // Коефіцієнт Корисної Дії на гру (раніше VAL)
  eff: number;        // Efficiency (EFF)

  // Percentages
  fgPercent: number;   // FG% 0-100
  fg2Percent: number;  // 2P% 0-100
  fg3Percent: number;  // 3P% 0-100
  ftPercent: number;   // FT% 0-100

  // Minutes
  mpg: number;         // хвилини на гру
  totalMinutes: number; // всього хвилин

  // Meta
  gamesPlayed: number;
  rating: number;      // 0-99
  tier: RatingTier;

  // Database
  seasonId: number;
};

export type LeaderFilters = {
  sortBy: StatKey;
  teamId?: number;
  position?: Position;
  search?: string;
  limit: 10 | 20 | 999;
  direction: "asc" | "desc";
};

export type StatTabConfig = {
  key: StatKey;
  label: string;
  unit: string;
  category: "avg" | "percent" | "other";
  decimal: number; // скільки знаків після коми показувати
};

export const STAT_TABS: StatTabConfig[] = [
  { key: "ppg", label: "Очки", unit: "оч/гру", category: "avg", decimal: 1 },
  { key: "rpg", label: "Підбори", unit: "пд/гру", category: "avg", decimal: 1 },
  { key: "apg", label: "Передачі", unit: "пе/гру", category: "avg", decimal: 1 },
  { key: "bpg", label: "Блокшоти", unit: "бл/гру", category: "avg", decimal: 1 },
  { key: "spg", label: "Перехоплення", unit: "пр/гру", category: "avg", decimal: 1 },
  { key: "rating", label: "Рейтинг", unit: "пункти", category: "other", decimal: 0 },
  { key: "fgPercent", label: "FG%", unit: "%", category: "percent", decimal: 1 },
  { key: "fg2Percent", label: "2P%", unit: "%", category: "percent", decimal: 1 },
  { key: "fg3Percent", label: "3P%", unit: "%", category: "percent", decimal: 1 },
  { key: "ftPercent", label: "FT%", unit: "%", category: "percent", decimal: 1 },
  { key: "mpg", label: "Хвилини", unit: "хв/гру", category: "avg", decimal: 1 },
  { key: "kkd", label: "ККД", unit: "ккд/гру", category: "avg", decimal: 1 },
];

export const POSITIONS: Position[] = ["PG", "SG", "SF", "PF", "C"];

export const POSITION_NAMES: Record<Position, string> = {
  PG: "Розігравач",
  SG: "Гард",
  SF: "Крайній",
  PF: "Потужний",
  C: "Центр",
};
