/**
 * lib/leaders/utils.ts
 * Утиліти для фільтрації та сортування лідерів
 */

import type { LeaderStats, StatKey, Position, LeaderFilters } from "./types";

/**
 * Фільтрує список лідерів за критеріями
 */
export function filterLeaders(
  leaders: LeaderStats[],
  filters: Partial<LeaderFilters>
): LeaderStats[] {
  let result = [...leaders];

  // Фільтр по пошуку (імя)
  if (filters.search && filters.search.trim()) {
    const search = filters.search.toLowerCase();
    result = result.filter(
      (p) =>
        p.firstName.toLowerCase().includes(search) ||
        p.lastName.toLowerCase().includes(search)
    );
  }

  // Фільтр по командам
  if (filters.teamId !== undefined && filters.teamId > 0) {
    result = result.filter((p) => p.teamId === filters.teamId);
  }

  // Фільтр по позиціям
  if (filters.position) {
    result = result.filter((p) => p.position === filters.position);
  }

  return result;
}

/**
 * Сортує лідерів за обраною категорією
 */
export function sortLeaders(
  leaders: LeaderStats[],
  sortBy: StatKey,
  direction: "asc" | "desc" = "desc"
): LeaderStats[] {
  const direction_multiplier = direction === "desc" ? -1 : 1;

  return [...leaders].sort((a, b) => {
    const aVal = a[sortBy];
    const bVal = b[sortBy];

    if (typeof aVal === "number" && typeof bVal === "number") {
      return (bVal - aVal) * direction_multiplier;
    }

    return 0;
  });
}

/**
 * Застосовує фільтри, сортування та ліміт
 */
export function processLeaders(
  leaders: LeaderStats[],
  filters: Partial<LeaderFilters> & { sortBy: StatKey }
): LeaderStats[] {
  let result = filterLeaders(leaders, filters);
  result = sortLeaders(result, filters.sortBy, filters.direction);

  if (filters.limit && filters.limit !== 999) {
    result = result.slice(0, filters.limit);
  }

  return result;
}

/**
 * Отримує значення для виведення (з правильною кількістю знаків)
 */
export function formatStatValue(value: unknown, decimal: number = 1): string {
  if (typeof value !== "number") return String(value);
  return value.toFixed(decimal);
}

/**
 * Отримує медаль для позиції
 */
export function getMedal(position: number): string {
  switch (position) {
    case 1:
      return "🥇";
    case 2:
      return "🥈";
    case 3:
      return "🥉";
    default:
      return "";
  }
}

/**
 * Скорочує довге імя для таблиці
 */
export function truncateName(firstName: string, lastName: string, maxLength: number = 20): string {
  const full = `${firstName} ${lastName}`;
  if (full.length > maxLength) {
    return `${firstName.charAt(0)}. ${lastName}`;
  }
  return full;
}

/**
 * Отримує ініціали для аватара
 */
export function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}
