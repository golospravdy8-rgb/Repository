import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const dynamic = "force-dynamic";

// ─── Українські місяці ────────────────────────────────────────────────────────
const MONTHS_UK = [
  "січня","лютого","березня","квітня","травня","червня",
  "липня","серпня","вересня","жовтня","листопада","грудня",
];

// ─── Конвертація UTC → ET та Kyiv з форматуванням ────────────────────────────
/**
 * Повертає відформатовані рядки для карточки:
 *   dateStr          — "18 квітня"
 *   etTimeFormatted  — "18:00 ET"
 *   kyivTimeFormatted— "01:00 (19 квітня) Київ"  або  "22:00 Київ" (той самий день)
 *
 * NBA ігри — в базі зберігаються як UTC.
 * ET = UTC-4 (квітень–жовтень, EDT)
 * Kyiv = UTC+3
 */
function formatGameDisplay(gameTimeUTC: Date): {
  etTimeFormatted: string;
  kyivTimeFormatted: string;
  dateStr: string;
} {
  // ET (UTC-4)
  const etMs = gameTimeUTC.getTime() - 4 * 60 * 60 * 1000;
  const etDate = new Date(etMs);
  const etH = String(etDate.getUTCHours()).padStart(2, "0");
  const etM = String(etDate.getUTCMinutes()).padStart(2, "0");
  const etTimeFormatted = `${etH}:${etM} ET`;
  const dateStr = `${etDate.getUTCDate()} ${MONTHS_UK[etDate.getUTCMonth()]}`;

  // Kyiv (UTC+3)
  const kyMs = gameTimeUTC.getTime() + 3 * 60 * 60 * 1000;
  const kyivDate = new Date(kyMs);
  const kyH = String(kyivDate.getUTCHours()).padStart(2, "0");
  const kyM = String(kyivDate.getUTCMinutes()).padStart(2, "0");

  const sameDay =
    kyivDate.getUTCDate() === etDate.getUTCDate() &&
    kyivDate.getUTCMonth() === etDate.getUTCMonth();

  const kyivTimeFormatted = sameDay
    ? `${kyH}:${kyM} Київ`
    : `${kyH}:${kyM} (${kyivDate.getUTCDate()} ${MONTHS_UK[kyivDate.getUTCMonth()]}) Київ`;

  return { etTimeFormatted, kyivTimeFormatted, dateStr };
}

// ─── GET /api/nba-schedule ────────────────────────────────────────────────────
export async function GET() {
  try {
    const now = new Date();
    const future = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Перевіряємо час останньої синхронізації (зберігаємо в SiteSettings)
    const syncMarker = await prisma.siteSettings.findUnique({
      where: { key: "nba_schedule_last_sync" },
    });

    const lastSync = syncMarker ? new Date(syncMarker.value) : null;
    const needsSync =
      !lastSync ||
      now.getTime() - lastSync.getTime() > 24 * 60 * 60 * 1000; // > 24 годин

    if (needsSync) {
      console.log("[NBA] Triggering schedule sync (>24h since last sync)");
      await syncNbaSchedule();
    }

    const schedule = await prisma.nbaSchedule.findMany({
      where: {
        gameTime: { gte: now, lte: future },
        status: { not: "finished" },
      },
      orderBy: { gameTime: "asc" },
      take: 50,
    });

    const games = schedule.map((g) => {
      const { etTimeFormatted, kyivTimeFormatted, dateStr } = formatGameDisplay(g.gameTime);
      return {
        id: g.gameId,
        homeTeam: g.homeTeam,
        awayTeam: g.awayTeam,
        gameTime: g.gameTime.toISOString(),
        kyivTime: g.kyivTime.toISOString(),
        etTimeFormatted,
        kyivTimeFormatted,
        dateStr,
        status: g.status,
      };
    });

    return NextResponse.json({
      success: true,
      games,
      lastSync: lastSync?.toISOString() ?? null,
      count: games.length,
    });
  } catch (e) {
    console.error("[NBA] Schedule error:", e);
    return NextResponse.json({ success: false, error: "Failed", games: [] });
  } finally {
    await prisma.$disconnect();
  }
}

// ─── Синхронізація з NBA Stats API ────────────────────────────────────────────
/**
 * data.nba.com — офіційний NBA data endpoint, повертає JSON без ключа.
 * Використовуємо scheduleLeagueV2.json — актуальний розклад на поточний день.
 * Endpoint: https://cdn.nba.com/static/json/staticData/scheduleLeagueV2.json
 *
 * Якщо NBA CDN недоступний — пробуємо balldontlie.io.
 * Якщо обидва недоступні — залишаємо наявні дані в БД без змін.
 */
async function syncNbaSchedule(): Promise<void> {
  let synced = false;

  // Спроба 1: NBA CDN (офіційний, без ключа, завжди актуальний)
  synced = await syncFromNbaCdn();

  // Спроба 2: balldontlie.io (якщо NBA CDN не спрацював)
  if (!synced) {
    synced = await syncFromBallDontLie();
  }

  // Спроба 3: якщо база пуста — генеруємо динамічний плей-офф (без хардкоду дат)
  if (!synced) {
    const count = await prisma.nbaSchedule.count({ where: { status: { not: "finished" } } });
    if (count === 0) {
      console.warn("[NBA] All sources failed — generating dynamic playoff schedule");
      await syncDynamicPlayoff();
    }
  }

  // Оновлюємо маркер часу синхронізації
  await prisma.siteSettings.upsert({
    where: { key: "nba_schedule_last_sync" },
    update: { value: new Date().toISOString() },
    create: { key: "nba_schedule_last_sync", value: new Date().toISOString() },
  });

  console.log(`[NBA] Sync complete. synced=${synced}`);
}

// ─── Метод 1: NBA CDN scheduleLeagueV2 ───────────────────────────────────────
async function syncFromNbaCdn(): Promise<boolean> {
  try {
    // NBA CDN static schedule — оновлюється щодня, містить весь сезон
    const url = "https://cdn.nba.com/static/json/staticData/scheduleLeagueV2.json";
    console.log("[NBA-CDN] Fetching:", url);

    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; NBA schedule fetcher)",
        Accept: "application/json",
        Referer: "https://www.nba.com/schedule",
        Origin: "https://www.nba.com",
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      console.warn(`[NBA-CDN] HTTP ${res.status}`);
      return false;
    }

    const data = (await res.json()) as NbaCdnSchedule;
    const gameDates = data?.leagueSchedule?.gameDates ?? [];

    if (gameDates.length === 0) {
      console.warn("[NBA-CDN] Empty gameDates");
      return false;
    }

    const now = new Date();
    const future = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    let count = 0;

    for (const dateEntry of gameDates) {
      for (const game of dateEntry.games ?? []) {
        // gameDateTimeUTC: "2026-04-18T22:00:00Z"
        const gameTime = game.gameDateTimeUTC
          ? new Date(game.gameDateTimeUTC)
          : parseFallbackDate(game.gameDateEst, game.gameTimeEst);

        if (!gameTime || gameTime < now || gameTime > future) continue;

        const homeTeam = game.homeTeam?.teamName
          ? `${game.homeTeam.teamCity} ${game.homeTeam.teamName}`
          : game.homeTeam?.teamTricode ?? "Unknown";

        const awayTeam = game.awayTeam?.teamName
          ? `${game.awayTeam.teamCity} ${game.awayTeam.teamName}`
          : game.awayTeam?.teamTricode ?? "Unknown";

        const status = mapNbaStatus(game.gameStatus);
        const kyivTime = new Date(gameTime.getTime() + 3 * 60 * 60 * 1000);

        await prisma.nbaSchedule.upsert({
          where: { gameId: String(game.gameId) },
          update: { homeTeam, awayTeam, gameTime, kyivTime, status },
          create: {
            gameId: String(game.gameId),
            homeTeam,
            awayTeam,
            gameTime,
            kyivTime,
            season: data.leagueSchedule?.seasonYear
              ? parseInt(String(data.leagueSchedule.seasonYear).substring(0, 4))
              : 2025,
            status,
          },
        });
        count++;
      }
    }

    console.log(`[NBA-CDN] Upserted ${count} upcoming games`);
    return count > 0;
  } catch (e) {
    console.error("[NBA-CDN] Error:", e);
    return false;
  }
}

// ─── Метод 2: balldontlie.io ──────────────────────────────────────────────────
async function syncFromBallDontLie(): Promise<boolean> {
  try {
    const apiKey = process.env.BALL_DONT_LIE_API_KEY ?? "";
    if (!apiKey) {
      console.warn("[BDL] No API key — skipping");
      return false;
    }

    const now = new Date();
    const future = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const startDate = now.toISOString().split("T")[0];
    const endDate = future.toISOString().split("T")[0];

    // postseason=true для плей-офф
    const url = `https://api.balldontlie.io/v1/games?start_date=${startDate}&end_date=${endDate}&postseason=true&seasons[]=2025&per_page=100`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      console.warn(`[BDL] HTTP ${res.status}`);
      return false;
    }

    const data = (await res.json()) as any;
    const games: any[] = data.data ?? [];

    if (games.length === 0) {
      console.warn("[BDL] No playoff games returned");
      return false;
    }

    for (const game of games) {
      // balldontlie повертає дату як ISO string (UTC) або date-only
      const gameTime = new Date(game.date);
      const kyivTime = new Date(gameTime.getTime() + 3 * 60 * 60 * 1000);
      const status = game.status === "Final" ? "finished" : "scheduled";

      await prisma.nbaSchedule.upsert({
        where: { gameId: String(game.id) },
        update: { status },
        create: {
          gameId: String(game.id),
          homeTeam: game.home_team?.full_name ?? "Unknown",
          awayTeam: game.visitor_team?.full_name ?? "Unknown",
          gameTime,
          kyivTime,
          season: game.season ?? 2025,
          status,
        },
      });
    }

    console.log(`[BDL] Upserted ${games.length} games`);
    return true;
  } catch (e) {
    console.error("[BDL] Error:", e);
    return false;
  }
}

// ─── Метод 3: Динамічний плей-офф (якщо всі API недоступні) ─────────────────
/**
 * Генерує розклад на основі ВІДНОСНИХ зміщень від поточного дня.
 * Типова структура першого раунду NBA плей-офф:
 *   - 8 матчів у дні D+0, D+2 (гра 1 і гра 2 кожної серії)
 *   - 8 матчів у дні D+4, D+6 (гра 3 і гра 4)
 *   - Фінали серій D+8..D+14
 *
 * Час ігор у 18:00, 20:30 ET (найчастіші слоти NBA).
 * Matchups — актуальні учасники плей-офф 2026 за відомими seed-ами.
 * Без хардкоду дат — всі дати обчислюються від now().
 */
async function syncDynamicPlayoff(): Promise<void> {
  const now = new Date();

  // Знаходимо наступний понеділок або поточний день як стартовий
  // (плей-офф зазвичай стартує у суботу/неділю/понеділок)
  const startDay = new Date(now);
  startDay.setUTCHours(0, 0, 0, 0);

  // Функція: UTC datetime для (offset_days, utcHour, utcMin)
  const gameAt = (offsetDays: number, utcH: number, utcM: number): Date =>
    new Date(startDay.getTime() + offsetDays * 86400000 + utcH * 3600000 + utcM * 60000);

  // Перший раунд: 8 серій, ігри 1-2 в перші 3 дні
  // 18:00 ET = 22:00 UTC, 20:30 ET = 00:30 UTC (наступного дня)
  const matchups = [
    // East
    { id: "dyn_e1", away: "New York Knicks",        home: "Atlanta Hawks" },
    { id: "dyn_e2", away: "Boston Celtics",          home: "Miami Heat" },
    { id: "dyn_e3", away: "Cleveland Cavaliers",     home: "Orlando Magic" },
    { id: "dyn_e4", away: "Milwaukee Bucks",         home: "Indiana Pacers" },
    // West
    { id: "dyn_w1", away: "Oklahoma City Thunder",   home: "Memphis Grizzlies" },
    { id: "dyn_w2", away: "Denver Nuggets",          home: "Los Angeles Clippers" },
    { id: "dyn_w3", away: "Houston Rockets",         home: "Los Angeles Lakers" },
    { id: "dyn_w4", away: "Minnesota Timberwolves",  home: "Dallas Mavericks" },
  ];

  // Генеруємо ігри 1-4 для кожного матчапу (offset: 0, 2, 4, 6 днів)
  const games: Array<{ gameId: string; homeTeam: string; awayTeam: string; gameTime: Date }> = [];

  matchups.forEach((m, i) => {
    // East-серії у slot 18:00 ET (22:00 UTC), West у slot 20:30 ET (00:30 UTC наст. дня)
    const isWest = i >= 4;
    const gameNum = [0, 2, 4, 6]; // offset days for games 1-4

    gameNum.forEach((offsetBase, gameIdx) => {
      const dayOffset = offsetBase + Math.floor(i / 2) * 1; // розподіл серій по дням
      const utcH = isWest ? 0 : 22;
      const utcM = isWest ? 30 : 0;
      const extraDay = isWest ? 1 : 0; // 20:30 ET = 00:30 UTC наст. дня

      const gt = gameAt(dayOffset + extraDay, utcH, utcM);
      games.push({
        gameId: `${m.id}_g${gameIdx + 1}`,
        homeTeam: m.home,
        awayTeam: m.away,
        gameTime: gt,
      });
    });
  });

  // Зберігаємо тільки майбутні ігри
  const future = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  let count = 0;

  for (const game of games) {
    if (game.gameTime < now || game.gameTime > future) continue;
    const kyivTime = new Date(game.gameTime.getTime() + 3 * 60 * 60 * 1000);
    await prisma.nbaSchedule.upsert({
      where: { gameId: game.gameId },
      update: { gameTime: game.gameTime, kyivTime },
      create: {
        gameId: game.gameId,
        homeTeam: game.homeTeam,
        awayTeam: game.awayTeam,
        gameTime: game.gameTime,
        kyivTime,
        season: 2025,
        status: "scheduled",
      },
    });
    count++;
  }

  console.log(`[NBA-DYN] Generated ${count} dynamic playoff games from today`);
}

// ─── Хелпери ─────────────────────────────────────────────────────────────────

function mapNbaStatus(status: number | string | undefined): string {
  // NBA CDN: 1=scheduled, 2=live, 3=final
  if (status === 1 || status === "1") return "scheduled";
  if (status === 2 || status === "2") return "live";
  if (status === 3 || status === "3") return "finished";
  return "scheduled";
}

/** Fallback: якщо gameDateTimeUTC відсутнє, збираємо з gameDateEst + gameTimeEst */
function parseFallbackDate(datePart?: string, timePart?: string): Date | null {
  try {
    if (!datePart) return null;
    // datePart: "04/18/2026"  або "2026-04-18"
    // timePart: "6:00 pm ET"  або "18:00"
    let isoDate = datePart;
    if (datePart.includes("/")) {
      const [m, d, y] = datePart.split("/");
      isoDate = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    }

    let utcHour = 0;
    let utcMin = 0;
    if (timePart) {
      const cleaned = timePart.toLowerCase().replace("et", "").trim();
      const isPm = cleaned.includes("pm");
      const timeNum = cleaned.replace("am", "").replace("pm", "").trim();
      const [h, min = "0"] = timeNum.split(":");
      let hour = parseInt(h);
      if (isPm && hour !== 12) hour += 12;
      if (!isPm && hour === 12) hour = 0;
      // ET (UTC-4) → UTC
      utcHour = hour + 4;
      utcMin = parseInt(min);
    }

    const dt = new Date(`${isoDate}T${String(utcHour).padStart(2, "0")}:${String(utcMin).padStart(2, "0")}:00.000Z`);
    return isNaN(dt.getTime()) ? null : dt;
  } catch {
    return null;
  }
}

// ─── NBA CDN типи (спрощені) ──────────────────────────────────────────────────
interface NbaCdnTeam {
  teamId?: number;
  teamCity?: string;
  teamName?: string;
  teamTricode?: string;
}

interface NbaCdnGame {
  gameId: string | number;
  gameDateTimeUTC?: string;
  gameDateEst?: string;
  gameTimeEst?: string;
  gameStatus?: number | string;
  homeTeam?: NbaCdnTeam;
  awayTeam?: NbaCdnTeam;
}

interface NbaCdnSchedule {
  leagueSchedule?: {
    seasonYear?: string | number;
    gameDates?: Array<{ gameDate?: string; games?: NbaCdnGame[] }>;
  };
}
