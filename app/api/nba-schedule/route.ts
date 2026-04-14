import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const dynamic = "force-dynamic";

// ─── Types ────────────────────────────────────────────────────────────────────
type NbaPeriod = {
  type: "playoffs" | "playin" | "summer_league" | "preseason" | "regular_season" | "offseason";
  label: string;
  primaryUrl: string;
  fallbackUrl: string;
  year: number;
};

type ParsedGame = {
  gameId: string;
  homeTeam: string;
  awayTeam: string;
  gameTime: Date;
  status: string;
  periodType: string;
};

// ─── Українські місяці ────────────────────────────────────────────────────────
const MONTHS_UK = [
  "січня","лютого","березня","квітня","травня","червня",
  "липня","серпня","вересня","жовтня","листопада","грудня",
];

// ─── NBA Headers для обходу блокування bot ─────────────────────────────────
const NBA_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.5",
  "Accept-Encoding": "gzip, deflate, br",
  "Referer": "https://www.nba.com/",
  "Cache-Control": "no-cache",
};

// ─── Конвертація UTC → ET та Kyiv з форматуванням ────────────────────────────
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
    const period = getNbaSeasonPeriod();

    // Перевіряємо час останньої синхронізації
    const lastSyncRow = await prisma.siteSettings.findUnique({
      where: { key: "nba_sched_last_sync" },
    });

    const lastSync = lastSyncRow ? new Date(lastSyncRow.value) : null;

    // Розраховуємо інтервал синхронізації залежно від періоду
    const syncIntervalMs = {
      playin: 15 * 60 * 1000,        // 15 хв
      playoffs: 30 * 60 * 1000,      // 30 хв
      regular_season: 2 * 60 * 60 * 1000,  // 2 год
      summer_league: 60 * 60 * 1000, // 1 год
      preseason: 3 * 60 * 60 * 1000, // 3 год
      offseason: 24 * 60 * 60 * 1000, // 24 год
    }[period.type] || 2 * 60 * 60 * 1000;

    const gamesCount = await prisma.nbaSchedule.count();
    const shouldSync = gamesCount === 0 || !lastSync || (now.getTime() - lastSync.getTime() > syncIntervalMs);

    if (shouldSync) {
      console.log(`[NBA] Triggering sync (period: ${period.type}, interval: ${syncIntervalMs}ms)`);
      await syncNbaSchedule();
    }

    // Фільтруємо ігри залежно від періоду
    let filterStart = now;
    if (period.type === "playin" || period.type === "playoffs") {
      const playInStart = new Date("2026-04-14T00:00:00Z");
      filterStart = playInStart < now ? now : playInStart;
    }

    const schedule = await prisma.nbaSchedule.findMany({
      where: {
        gameTime: { gte: filterStart, lte: future },
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
      period: {
        type: period.type,
        label: period.label,
        sourceUrl: period.primaryUrl,
        lastSync: lastSync?.toISOString() ?? null,
      },
      count: games.length,
    });
  } catch (e) {
    console.error("[NBA] Schedule error:", e);
    return NextResponse.json({ success: false, error: "Failed", games: [], period: null });
  } finally {
    await prisma.$disconnect();
  }
}

// ─── БЛОК 1: Визначення поточного NBA-періоду ─────────────────────────────────
function getNbaSeasonPeriod(): NbaPeriod {
  const now = new Date();
  const month = now.getMonth() + 1; // 1-12
  const day = now.getDate();
  const year = now.getFullYear();

  // PLAYOFFS (квітень-червень)
  if ((month === 4 && day >= 18) || month === 5 || (month === 6 && day <= 22)) {
    return {
      type: "playoffs",
      label: "NBA Playoffs",
      primaryUrl: `https://www.nba.com/news/${year}-nba-playoffs-schedule`,
      fallbackUrl: `https://www.nba.com/schedule`,
      year,
    };
  }

  // PLAY-IN (14-17 квітня)
  if (month === 4 && day >= 14 && day <= 17) {
    return {
      type: "playin",
      label: "NBA Play-In Tournament",
      primaryUrl: `https://www.nba.com/news/${year}-nba-playoffs-schedule`,
      fallbackUrl: `https://www.nba.com/schedule`,
      year,
    };
  }

  // SUMMER LEAGUE (кінець червня — серпень)
  if ((month === 6 && day >= 23) || month === 7 || (month === 8 && day <= 20)) {
    return {
      type: "summer_league",
      label: "NBA Summer League",
      primaryUrl: `https://www.nba.com/schedule?season=2${year - 1}${year}&seasonType=SummerLeague`,
      fallbackUrl: `https://www.nba.com/games`,
      year,
    };
  }

  // PRESEASON (жовтень 1-15)
  if (month === 10 && day <= 15) {
    return {
      type: "preseason",
      label: "NBA Preseason",
      primaryUrl: `https://www.nba.com/schedule?season=2${year}${year + 1}&seasonType=Pre+Season`,
      fallbackUrl: `https://www.nba.com/schedule`,
      year,
    };
  }

  // REGULAR SEASON (жовтень 16 — квітень 13)
  if (month >= 10 || (month <= 4 && day <= 13)) {
    const seasonYear = month >= 10 ? year + 1 : year;
    return {
      type: "regular_season",
      label: `NBA Regular Season ${year}-${seasonYear}`,
      primaryUrl: `https://www.nba.com/schedule`,
      fallbackUrl: `https://www.nba.com/games`,
      year: seasonYear,
    };
  }

  // OFFSEASON (серпень-вересень)
  return {
    type: "offseason",
    label: "NBA Offseason",
    primaryUrl: `https://www.nba.com/schedule`,
    fallbackUrl: `https://www.nba.com/games`,
    year,
  };
}

// ─── БЛОК 2: Основний парсер nba.com ──────────────────────────────────────────
async function fetchNbaScheduleFromWeb(): Promise<ParsedGame[]> {
  const period = getNbaSeasonPeriod();
  console.log(`[NBA-PARSER] Period: ${period.label}, URL: ${period.primaryUrl}`);

  // Зберігаємо поточний period
  await prisma.siteSettings.upsert({
    where: { key: "nba_current_period" },
    update: { value: JSON.stringify({ type: period.type, label: period.label, url: period.primaryUrl, updatedAt: new Date().toISOString() }) },
    create: { key: "nba_current_period", value: JSON.stringify({ type: period.type, label: period.label, url: period.primaryUrl, updatedAt: new Date().toISOString() }) },
  });

  // Якщо offseason — не парсимо
  if (period.type === "offseason") {
    console.log("[NBA-PARSER] Offseason — no games to parse");
    return [];
  }

  let games: ParsedGame[] = [];

  // Спробуй primaryUrl
  try {
    games = await parseNbaPage(period.primaryUrl, period.type);
  } catch (err) {
    console.warn(`[NBA-PARSER] Primary URL failed: ${err}`);
  }

  // Якщо не знайшов — спробуй fallback
  if (games.length === 0) {
    console.warn(`[NBA-PARSER] No games from primary, trying fallback: ${period.fallbackUrl}`);
    try {
      games = await parseNbaPage(period.fallbackUrl, period.type);
    } catch (err) {
      console.warn(`[NBA-PARSER] Fallback also failed: ${err}`);
    }
  }

  // Якщо взагалі нічого — використовуй статичні дані
  if (games.length === 0) {
    console.warn("[NBA-PARSER] All sources failed, using static fallback data");
    games = getStaticFallbackGames(period);
  }

  console.log(`[NBA-PARSER] Found ${games.length} games for period: ${period.label}`);
  return games;
}

// ─── БЛОК 3: parseNbaPage() — логіка парсингу HTML ───────────────────────────
async function parseNbaPage(url: string, periodType: string): Promise<ParsedGame[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(url, {
      headers: NBA_HEADERS,
      signal: controller.signal as any,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();

    // Стратегія 1: __NEXT_DATA__
    const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    if (nextDataMatch) {
      try {
        const nextData = JSON.parse(nextDataMatch[1]);
        const games = extractGamesFromNextData(nextData, periodType);
        if (games.length > 0) return games;
      } catch (e) {
        console.warn("[NBA-PARSER] __NEXT_DATA__ parse failed");
      }
    }

    // Стратегія 2: JSON blob
    const jsonPatterns = [
      /\"games\":\s*(\[[\s\S]*?\])/,
      /\"schedule\":\s*(\[[\s\S]*?\])/,
      /\"gameDates\":\s*(\[[\s\S]*?\])/,
    ];

    for (const pattern of jsonPatterns) {
      const match = html.match(pattern);
      if (match) {
        try {
          const data = JSON.parse(match[1]);
          const games = normalizeGamesArray(data, periodType);
          if (games.length > 0) return games;
        } catch (e) {}
      }
    }

    // Стратегія 3: текстовий пошук
    return extractGamesFromHtml(html, periodType);
  } finally {
    clearTimeout(timeout);
  }
}

function extractGamesFromNextData(data: any, periodType: string): ParsedGame[] {
  const games: ParsedGame[] = [];

  function traverse(obj: any, depth = 0): void {
    if (depth > 10 || !obj) return;

    const gameKeys = ["games", "gameCards", "schedule", "gameDates", "props"];

    if (Array.isArray(obj)) {
      if (obj.length > 0 && obj[0]?.gameId) {
        for (const g of obj) {
          const parsed = parseGameObject(g, periodType);
          if (parsed) games.push(parsed);
        }
        return;
      }
      obj.forEach(item => traverse(item, depth + 1));
    } else if (typeof obj === "object") {
      for (const key of gameKeys) {
        if (obj[key]) traverse(obj[key], depth + 1);
      }
      if (obj.pageProps) traverse(obj.pageProps, depth + 1);
    }
  }

  traverse(data);
  return games;
}

function parseGameObject(g: any, periodType: string): ParsedGame | null {
  const gameId = g.gameId || g.id || g.game_id;
  if (!gameId) return null;

  const homeTeam = g.homeTeam?.teamName || g.hTeam?.teamName || g.homeTeamName || g.home?.name || "";
  const awayTeam = g.awayTeam?.teamName || g.vTeam?.teamName || g.awayTeamName || g.away?.name || "";
  if (!homeTeam || !awayTeam) return null;

  const timeStr = g.gameTimeUTC || g.gameEt || g.startTimeUTC || g.scheduledTime || "";
  const gameTime = timeStr ? new Date(timeStr) : new Date();
  if (isNaN(gameTime.getTime())) return null;

  const statusRaw = g.gameStatus || g.status || g.gameStatusText || 1;
  let status = "scheduled";
  if (statusRaw === 2 || statusRaw === "live" || String(statusRaw).includes("Qtr") || String(statusRaw).includes("Half")) {
    status = "live";
  } else if (statusRaw === 3 || statusRaw === "finished" || statusRaw === "Final") {
    status = "finished";
  }

  return {
    gameId: String(gameId),
    homeTeam,
    awayTeam,
    gameTime,
    status,
    periodType,
  };
}

function extractGamesFromHtml(html: string, periodType: string): ParsedGame[] {
  // Базовий текстовий пошук — якщо не знайшли JSON
  const teamPattern = /(Atlanta Hawks|Boston Celtics|Brooklyn Nets|Charlotte Hornets|Chicago Bulls|Cleveland Cavaliers|Dallas Mavericks|Denver Nuggets|Detroit Pistons|Golden State Warriors|Houston Rockets|Indiana Pacers|Los Angeles Clippers|Los Angeles Lakers|Memphis Grizzlies|Miami Heat|Milwaukee Bucks|Minnesota Timberwolves|New Orleans Pelicans|New York Knicks|Oklahoma City Thunder|Orlando Magic|Philadelphia 76ers|Phoenix Suns|Portland Trail Blazers|Sacramento Kings|San Antonio Spurs|Toronto Raptors|Utah Jazz|Washington Wizards)/g;

  const teamMatches = html.match(teamPattern);
  if (teamMatches && teamMatches.length >= 2) {
    console.log(`[NBA-PARSER] Found ${teamMatches.length} team mentions in HTML but can't extract full schedule`);
  }

  return [];
}

function normalizeGamesArray(data: any[], periodType: string): ParsedGame[] {
  return data
    .map(g => parseGameObject(g, periodType))
    .filter(Boolean) as ParsedGame[];
}

// ─── БЛОК 4: getStaticFallbackGames() — резервні дані ────────────────────────
function getStaticFallbackGames(period: NbaPeriod): ParsedGame[] {
  if (period.type === "playoffs" || period.type === "playin") {
    const BASE = new Date("2026-04-14T00:00:00Z");
    const g = (id: string, away: string, home: string, d: number, h: number, m: number) => ({
      gameId: id,
      awayTeam: away,
      homeTeam: home,
      gameTime: new Date(BASE.getTime() + d*86400000 + h*3600000 + m*60000),
      status: "scheduled",
      periodType: period.type,
    });
    return [
      // Play-In
      g("pi_e1", "Charlotte Hornets",    "Miami Heat",             0, 23, 30),
      g("pi_w1", "Phoenix Suns",         "Portland Trail Blazers", 1,  2,  0),
      g("pi_e2", "Philadelphia 76ers",   "Orlando Magic",          1, 23, 30),
      g("pi_w2", "Los Angeles Clippers", "Golden State Warriors",  2,  2,  0),
      // First Round Game 1 (відомі серії)
      g("r1_e3_g1", "New York Knicks",       "Atlanta Hawks",           4, 17,  0),
      g("r1_e4_g1", "Cleveland Cavaliers",   "Toronto Raptors",         4, 19, 30),
      g("r1_w4_g1", "Los Angeles Lakers",    "Houston Rockets",         4, 22,  0),
      g("r1_w3_g1", "Denver Nuggets",        "Minnesota Timberwolves",  5, 22,  0),
    ];
  }
  return [];
}

// ─── БЛОК 5: Оновлена syncNbaSchedule() ───────────────────────────────────────
async function syncNbaSchedule(): Promise<void> {
  console.log("[NBA-SYNC] Starting smart sync...");

  let games: ParsedGame[];
  try {
    // Спробуємо живий парсинг
    games = await fetchNbaScheduleFromWeb();
  } catch (err) {
    console.error("[NBA-SYNC] Web fetch failed:", err);
    const period = getNbaSeasonPeriod();
    games = getStaticFallbackGames(period);
  }

  if (games.length === 0) {
    console.log("[NBA-SYNC] No games found, skipping DB write");
    return;
  }

  // Upsert всі ігри в БД
  let inserted = 0;
  for (const game of games) {
    await prisma.nbaSchedule.upsert({
      where: { gameId: game.gameId },
      update: {
        homeTeam: game.homeTeam,
        awayTeam: game.awayTeam,
        gameTime: game.gameTime,
        kyivTime: new Date(game.gameTime.getTime() + 3 * 60 * 60 * 1000),
        status: game.status,
      },
      create: {
        gameId: game.gameId,
        homeTeam: game.homeTeam,
        awayTeam: game.awayTeam,
        gameTime: game.gameTime,
        kyivTime: new Date(game.gameTime.getTime() + 3 * 60 * 60 * 1000),
        status: game.status,
        season: 2026,
      },
    });
    inserted++;
  }

  // Зберігаємо час останньої синхронізації
  await prisma.siteSettings.upsert({
    where: { key: "nba_sched_last_sync" },
    update: { value: new Date().toISOString() },
    create: { key: "nba_sched_last_sync", value: new Date().toISOString() },
  });

  console.log(`[NBA-SYNC] Done. Upserted ${inserted} games.`);
}

// ─── Хелпери (збережено з оригіналу) ──────────────────────────────────────────

function mapNbaStatus(status: number | string | undefined): string {
  if (status === 1 || status === "1") return "scheduled";
  if (status === 2 || status === "2") return "live";
  if (status === 3 || status === "3") return "finished";
  return "scheduled";
}

function parseFallbackDate(datePart?: string, timePart?: string): Date | null {
  try {
    if (!datePart) return null;
    let isoDate = datePart;
    if (datePart.includes("/")) {
      const [m, d, y] = datePart.split("/");
      isoDate = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    }

    let utcHour = 0;
    let utcMin = 0;
    if (timePart) {
      const cleaned = timePart.toLowerCase().replace("et", "").trim();
      const timeMatch = cleaned.match(/(\d{1,2}):(\d{2})\s*(am|pm)?/);
      if (timeMatch) {
        let h = parseInt(timeMatch[1]);
        const m = parseInt(timeMatch[2]);
        const ampm = timeMatch[3];
        if (ampm === "pm" && h !== 12) h += 12;
        if (ampm === "am" && h === 12) h = 0;
        // ET to UTC: +4 hours
        utcHour = (h + 4) % 24;
        utcMin = m;
      }
    }

    const isoStr = `${isoDate}T${String(utcHour).padStart(2, "0")}:${String(utcMin).padStart(2, "0")}:00Z`;
    const dt = new Date(isoStr);
    return isNaN(dt.getTime()) ? null : dt;
  } catch (e) {
    return null;
  }
}

// ─── Оригінальні функції синхронізації (збережено для сумісності) ──────────────

async function syncFromNbaCdn(): Promise<boolean> {
  try {
    const res = await fetch("https://cdn.nba.com/static/json/staticData/scheduleLeagueV2.json", {
      signal: AbortSignal.timeout(10000) as any,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = (await res.json()) as any;
    const gameDates = data?.leagueSchedule?.gameDates || [];

    const now = new Date();
    const future = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    let count = 0;
    for (const gd of gameDates) {
      const games = gd.games || [];
      for (const g of games) {
        const timeStr = g.gameDateTimeUTC;
        if (!timeStr) continue;
        const gameTime = new Date(timeStr);
        if (gameTime < now || gameTime > future) continue;

        const homeTeam = g.homeTeam?.teamName || "";
        const awayTeam = g.awayTeam?.teamName || "";
        if (!homeTeam || !awayTeam) continue;

        const status = mapNbaStatus(g.gameStatus);
        await prisma.nbaSchedule.upsert({
          where: { gameId: String(g.gameId) },
          update: { homeTeam, awayTeam, gameTime, status },
          create: {
            gameId: String(g.gameId),
            homeTeam,
            awayTeam,
            gameTime,
            kyivTime: new Date(gameTime.getTime() + 3 * 60 * 60 * 1000),
            status,
            season: parseInt(data?.leagueSchedule?.seasonYear || "2026"),
          },
        });
        count++;
      }
    }

    console.log(`[NBA-CDN] Synced ${count} games`);
    return count > 0;
  } catch (e) {
    console.warn("[NBA-CDN] Failed:", e);
    return false;
  }
}

async function syncFromBallDontLie(): Promise<boolean> {
  try {
    const apiKey = process.env.BALL_DONT_LIE_API_KEY;
    if (!apiKey) {
      console.warn("[NBA-BDL] No API key");
      return false;
    }

    const res = await fetch(
      "https://api.balldontlie.io/v1/games?postseason=true&seasons[]=2025&per_page=100",
      {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(10000) as any,
      }
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = (await res.json()) as any;
    const games = data?.data || [];

    let count = 0;
    for (const g of games) {
      const gameTime = new Date(g.date);
      const homeTeam = g.home_team?.full_name || "";
      const awayTeam = g.visitor_team?.full_name || "";

      if (!homeTeam || !awayTeam) continue;

      await prisma.nbaSchedule.upsert({
        where: { gameId: String(g.id) },
        update: { status: g.status },
        create: {
          gameId: String(g.id),
          homeTeam,
          awayTeam,
          gameTime,
          kyivTime: new Date(gameTime.getTime() + 3 * 60 * 60 * 1000),
          status: g.status || "scheduled",
          season: g.season || 2025,
        },
      });
      count++;
    }

    console.log(`[NBA-BDL] Synced ${count} games`);
    return count > 0;
  } catch (e) {
    console.warn("[NBA-BDL] Failed:", e);
    return false;
  }
}

async function syncDynamicPlayoff(): Promise<void> {
  const BASE = new Date("2026-04-14T00:00:00Z");

  const gameAt = (offsetDays: number, utcH: number, utcM: number): Date =>
    new Date(BASE.getTime() + offsetDays * 86400000 + utcH * 3600000 + utcM * 60000);

  const playInGames = [
    { gameId: "playin_e1_2026", away: "Atlanta Hawks",          home: "Washington Wizards",      dayOff: 0, utcH: 22, utcM: 0  },
    { gameId: "playin_w1_2026", away: "Golden State Warriors",  home: "Denver Nuggets",          dayOff: 1, utcH:  0, utcM: 30 },
    { gameId: "playin_e2_2026", away: "Charlotte Hornets",      home: "Miami Heat",              dayOff: 1, utcH: 22, utcM: 0  },
    { gameId: "playin_w2_2026", away: "Portland Trail Blazers", home: "Los Angeles Lakers",      dayOff: 2, utcH:  0, utcM: 30 },
    { gameId: "playin_e3_2026", away: "Brooklyn Nets",          home: "Boston Celtics",          dayOff: 2, utcH: 22, utcM: 0  },
    { gameId: "playin_w3_2026", away: "New Orleans Pelicans",   home: "Phoenix Suns",            dayOff: 3, utcH:  0, utcM: 30 },
    { gameId: "playin_e4_2026", away: "Philadelphia 76ers",     home: "Orlando Magic",           dayOff: 3, utcH: 22, utcM: 0  },
    { gameId: "playin_w4_2026", away: "Sacramento Kings",       home: "Memphis Grizzlies",       dayOff: 4, utcH:  0, utcM: 30 },
  ];

  const firstRoundMatchups = [
    { id: "r1_e1", away: "New York Knicks",       home: "Detroit Pistons",      isWest: false, startOffset: 4 },
    { id: "r1_e2", away: "Boston Celtics",         home: "Orlando Magic",        isWest: false, startOffset: 4 },
    { id: "r1_e3", away: "Cleveland Cavaliers",   home: "Miami Heat",           isWest: false, startOffset: 5 },
    { id: "r1_e4", away: "Milwaukee Bucks",        home: "Indiana Pacers",       isWest: false, startOffset: 5 },
    { id: "r1_w1", away: "Oklahoma City Thunder",  home: "Memphis Grizzlies",    isWest: true,  startOffset: 4 },
    { id: "r1_w2", away: "Denver Nuggets",         home: "Los Angeles Clippers", isWest: true,  startOffset: 4 },
    { id: "r1_w3", away: "Houston Rockets",        home: "Los Angeles Lakers",   isWest: true,  startOffset: 5 },
    { id: "r1_w4", away: "Minnesota Timberwolves", home: "Dallas Mavericks",     isWest: true,  startOffset: 5 },
  ];

  const allGames: Array<{ gameId: string; homeTeam: string; awayTeam: string; gameTime: Date }> = [];

  for (const g of playInGames) {
    allGames.push({
      gameId: g.gameId,
      homeTeam: g.home,
      awayTeam: g.away,
      gameTime: gameAt(g.dayOff, g.utcH, g.utcM),
    });
  }

  for (const m of firstRoundMatchups) {
    const utcH = m.isWest ? 0 : 22;
    const utcM = m.isWest ? 30 : 0;
    const extraDay = m.isWest ? 1 : 0;

    for (let gNum = 0; gNum < 4; gNum++) {
      const dayOffset = m.startOffset + gNum * 2;
      allGames.push({
        gameId: `${m.id}_g${gNum + 1}`,
        homeTeam: m.home,
        awayTeam: m.away,
        gameTime: gameAt(dayOffset + extraDay, utcH, utcM),
      });
    }
  }

  let count = 0;
  for (const game of allGames) {
    await prisma.nbaSchedule.upsert({
      where: { gameId: game.gameId },
      update: { homeTeam: game.homeTeam, awayTeam: game.awayTeam, gameTime: game.gameTime, status: "scheduled" },
      create: {
        gameId: game.gameId,
        homeTeam: game.homeTeam,
        awayTeam: game.awayTeam,
        gameTime: game.gameTime,
        kyivTime: new Date(game.gameTime.getTime() + 3 * 60 * 60 * 1000),
        status: "scheduled",
        season: 2026,
      },
    });
    count++;
  }

  console.log(`[NBA-DYN] Записано ${count} ігор: 8 Play-In + 32 First Round`);
}

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
