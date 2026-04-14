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

// ─── Headers для обходу блокування ────────────────────────────────────────────
const NBA_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.5",
  "Accept-Encoding": "gzip, deflate, br",
  "Referer": "https://www.espn.com/",
  "Cache-Control": "no-cache",
};

// ─── Конвертація UTC → ET та Kyiv з форматуванням ────────────────────────────
function formatGameDisplay(gameTimeUTC: Date): {
  etTimeFormatted: string;
  kyivTimeFormatted: string;
  dateStr: string;
} {
  const etMs = gameTimeUTC.getTime() - 4 * 60 * 60 * 1000;
  const etDate = new Date(etMs);
  const etH = String(etDate.getUTCHours()).padStart(2, "0");
  const etM = String(etDate.getUTCMinutes()).padStart(2, "0");
  const etTimeFormatted = `${etH}:${etM} ET`;
  const dateStr = `${etDate.getUTCDate()} ${MONTHS_UK[etDate.getUTCMonth()]}`;

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

    const lastSyncRow = await prisma.siteSettings.findUnique({
      where: { key: "nba_sched_last_sync" },
    });

    const lastSync = lastSyncRow ? new Date(lastSyncRow.value) : null;

    const syncIntervalMs = {
      playin: 15 * 60 * 1000,
      playoffs: 30 * 60 * 1000,
      regular_season: 2 * 60 * 60 * 1000,
      summer_league: 60 * 60 * 1000,
      preseason: 3 * 60 * 60 * 1000,
      offseason: 24 * 60 * 60 * 1000,
    }[period.type] || 2 * 60 * 60 * 1000;

    const gamesCount = await prisma.nbaSchedule.count();
    const shouldSync = gamesCount === 0 || !lastSync || (now.getTime() - lastSync.getTime() > syncIntervalMs);

    if (shouldSync) {
      console.log(`[NBA] Triggering sync (period: ${period.type}, interval: ${syncIntervalMs}ms)`);
      await syncNbaSchedule();
    }

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

// ─── Period Detection ─────────────────────────────────────────────────────────
function getNbaSeasonPeriod(): NbaPeriod {
  const now = new Date();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const year = now.getFullYear();

  if ((month === 4 && day >= 18) || month === 5 || (month === 6 && day <= 22)) {
    return {
      type: "playoffs",
      label: "NBA Playoffs",
      primaryUrl: `https://www.nba.com/news/${year}-nba-playoffs-schedule`,
      fallbackUrl: `https://www.nba.com/schedule`,
      year,
    };
  }

  if (month === 4 && day >= 14 && day <= 17) {
    return {
      type: "playin",
      label: "NBA Play-In Tournament",
      primaryUrl: `https://www.nba.com/news/${year}-nba-playoffs-schedule`,
      fallbackUrl: `https://www.nba.com/schedule`,
      year,
    };
  }

  if ((month === 6 && day >= 23) || month === 7 || (month === 8 && day <= 20)) {
    return {
      type: "summer_league",
      label: "NBA Summer League",
      primaryUrl: `https://www.nba.com/schedule?season=2${year - 1}${year}&seasonType=SummerLeague`,
      fallbackUrl: `https://www.nba.com/games`,
      year,
    };
  }

  if (month === 10 && day <= 15) {
    return {
      type: "preseason",
      label: "NBA Preseason",
      primaryUrl: `https://www.nba.com/schedule?season=2${year}${year + 1}&seasonType=Pre+Season`,
      fallbackUrl: `https://www.nba.com/schedule`,
      year,
    };
  }

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

  return {
    type: "offseason",
    label: "NBA Offseason",
    primaryUrl: `https://www.nba.com/schedule`,
    fallbackUrl: `https://www.nba.com/games`,
    year,
  };
}

// ─── ESPN Scoreboard Parser ────────────────────────────────────────────────────
async function fetchFromEspn(daysAhead: number = 10): Promise<ParsedGame[]> {
  const games: ParsedGame[] = [];
  const period = getNbaSeasonPeriod();
  const now = new Date();

  try {
    for (let i = 0; i < daysAhead; i++) {
      const date = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');

      const url = `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=${dateStr}`;
      const res = await fetch(url, { headers: NBA_HEADERS, signal: AbortSignal.timeout(5000) as any });

      if (!res.ok) continue;

      const data = (await res.json()) as any;
      const events = data?.events || [];

      for (const event of events) {
        const gameId = event.id;
        const homeTeam = event.competitions?.[0]?.competitors?.find((c: any) => c.homeAway === "home")?.team?.displayName;
        const awayTeam = event.competitions?.[0]?.competitors?.find((c: any) => c.homeAway === "away")?.team?.displayName;
        const gameTimeStr = event.competitions?.[0]?.startDate;

        if (!gameId || !homeTeam || !awayTeam || !gameTimeStr) continue;

        const gameTime = new Date(gameTimeStr);
        if (isNaN(gameTime.getTime())) continue;

        let statusMapped = "scheduled";
        const statusObj = event.status?.type || {};
        const statusName = statusObj.name || statusObj.description || statusObj.state || "";
        if (statusName.toLowerCase().includes("in progress") || statusName === "in") {
          statusMapped = "live";
        } else if (statusName.toLowerCase().includes("final") || statusName === "final") {
          statusMapped = "finished";
        }

        games.push({
          gameId,
          homeTeam,
          awayTeam,
          gameTime,
          status: statusMapped,
          periodType: period.type,
        });
      }
    }

    games.sort((a, b) => a.gameTime.getTime() - b.gameTime.getTime());
    console.log(`[ESPN] Fetched ${games.length} games from scoreboard API`);
  } catch (err) {
    console.warn(`[ESPN] Fetch failed: ${err}`);
  }

  return games;
}

// ─── ESPN Scoreboard API as primary source ────────────────────────────────────
async function fetchNbaScheduleFromWeb(): Promise<ParsedGame[]> {
  const period = getNbaSeasonPeriod();

  await prisma.siteSettings.upsert({
    where: { key: "nba_current_period" },
    update: { value: JSON.stringify({ type: period.type, label: period.label, updatedAt: new Date().toISOString() }) },
    create: { key: "nba_current_period", value: JSON.stringify({ type: period.type, label: period.label, updatedAt: new Date().toISOString() }) },
  });

  if (period.type === "offseason") {
    console.log("[NBA-PARSER] Offseason — no games to parse");
    return [];
  }

  let games = await fetchFromEspn(10);

  if (games.length === 0) {
    console.warn("[NBA-PARSER] ESPN API returned no games, using static fallback");
    games = getStaticFallbackGames(period);
  }

  console.log(`[NBA-PARSER] Found ${games.length} games for period: ${period.label}`);
  return games;
}

// ─── Static Fallback Games ────────────────────────────────────────────────────
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
      g("pi_e1", "Charlotte Hornets",    "Miami Heat",             0, 23, 30),
      g("pi_w1", "Phoenix Suns",         "Portland Trail Blazers", 1,  2,  0),
      g("pi_e2", "Philadelphia 76ers",   "Orlando Magic",          1, 23, 30),
      g("pi_w2", "Los Angeles Clippers", "Golden State Warriors",  2,  2,  0),
      g("r1_e3_g1", "New York Knicks",       "Atlanta Hawks",           4, 17,  0),
      g("r1_e4_g1", "Cleveland Cavaliers",   "Toronto Raptors",         4, 19, 30),
      g("r1_w4_g1", "Los Angeles Lakers",    "Houston Rockets",         4, 22,  0),
      g("r1_w3_g1", "Denver Nuggets",        "Minnesota Timberwolves",  5, 22,  0),
    ];
  }
  return [];
}

// ─── Sync NBA Schedule ────────────────────────────────────────────────────────
async function syncNbaSchedule(): Promise<void> {
  console.log("[NBA-SYNC] Starting sync...");

  let games: ParsedGame[];
  try {
    games = await fetchNbaScheduleFromWeb();
  } catch (err) {
    console.error("[NBA-SYNC] Fetch failed:", err);
    const period = getNbaSeasonPeriod();
    games = getStaticFallbackGames(period);
  }

  if (games.length === 0) {
    console.log("[NBA-SYNC] No games found, skipping DB write");
    return;
  }

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
  }

  await prisma.siteSettings.upsert({
    where: { key: "nba_sched_last_sync" },
    update: { value: new Date().toISOString() },
    create: { key: "nba_sched_last_sync", value: new Date().toISOString() },
  });

  console.log(`[NBA-SYNC] Upserted ${games.length} games.`);
}
