import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const dynamic = "force-dynamic";

const MONTHS_UK = [
  "січня","лютого","березня","квітня","травня","червня",
  "липня","серпня","вересня","жовтня","листопада","грудня",
];

/**
 * Конвертує UTC datetime у форматовані рядки для ET та Київ.
 * NBA ігри зберігаються як UTC в базі.
 * ET = UTC-4 (квітень — літній час)
 * Kyiv = UTC+3
 */
function formatGameDisplay(gameTimeUTC: Date): {
  etTimeFormatted: string;
  kyivTimeFormatted: string;
  dateStr: string;
} {
  // ET (UTC-4 у квітні — EDT)
  const etDate = new Date(gameTimeUTC.getTime() - 4 * 60 * 60 * 1000);
  const etH = String(etDate.getUTCHours()).padStart(2, "0");
  const etM = String(etDate.getUTCMinutes()).padStart(2, "0");
  const etTimeFormatted = `${etH}:${etM} ET`;

  // Дата для відображення — за ET
  const etDay = etDate.getUTCDate();
  const etMonth = MONTHS_UK[etDate.getUTCMonth()];
  const dateStr = `${etDay} ${etMonth}`;

  // Київ (UTC+3)
  const kyivDate = new Date(gameTimeUTC.getTime() + 3 * 60 * 60 * 1000);
  const kyH = String(kyivDate.getUTCHours()).padStart(2, "0");
  const kyM = String(kyivDate.getUTCMinutes()).padStart(2, "0");

  // Якщо Київ-час — наступного дня відносно ET-дати
  const sameDay =
    kyivDate.getUTCDate() === etDate.getUTCDate() &&
    kyivDate.getUTCMonth() === etDate.getUTCMonth();

  let kyivTimeFormatted: string;
  if (sameDay) {
    kyivTimeFormatted = `${kyH}:${kyM} Київ`;
  } else {
    const kyDay = kyivDate.getUTCDate();
    const kyMonth = MONTHS_UK[kyivDate.getUTCMonth()];
    kyivTimeFormatted = `${kyH}:${kyM} (${kyDay} ${kyMonth}) Київ`;
  }

  return { etTimeFormatted, kyivTimeFormatted, dateStr };
}

/**
 * GET /api/nba-schedule
 * Повертає плей-офф матчі NBA (до 50 ігор, 30 днів наперед)
 */
export async function GET() {
  try {
    const now = new Date();
    const future = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    let schedule = await prisma.nbaSchedule.findMany({
      where: {
        gameTime: { gte: now, lte: future },
        status: { not: "finished" },
      },
      orderBy: { gameTime: "asc" },
      take: 50,
    });

    if (schedule.length === 0) {
      await syncNbaSchedule();
      schedule = await prisma.nbaSchedule.findMany({
        where: {
          gameTime: { gte: now, lte: future },
          status: { not: "finished" },
        },
        orderBy: { gameTime: "asc" },
        take: 50,
      });
    }

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

    return NextResponse.json({ success: true, games });
  } catch (e) {
    console.error("[NBA] Schedule error:", e);
    return NextResponse.json({ success: false, error: "Failed to fetch NBA schedule", games: [] });
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Синхронізує розклад з balldontlie.io (з підтримкою postseason)
 * або переключається на mock-дані.
 */
async function syncNbaSchedule() {
  try {
    const now = new Date();
    const future = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const startDate = now.toISOString().split("T")[0];
    const endDate = future.toISOString().split("T")[0];

    const apiKey = process.env.BALL_DONT_LIE_API_KEY || "";
    if (!apiKey) {
      console.warn("[NBA] BALL_DONT_LIE_API_KEY not set — using playoff mock data");
      await syncPlayoffMock();
      return;
    }

    // postseason=true + seasons[]=2025 для плей-офф сезону 2025-26
    const url = `https://api.balldontlie.io/v1/games?start_date=${startDate}&end_date=${endDate}&postseason=true&seasons[]=2025&per_page=100`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      console.warn("[NBA] API error, using playoff mock data");
      await syncPlayoffMock();
      return;
    }

    const data = (await res.json()) as any;
    const games: any[] = data.data || [];
    console.log(`[NBA] Fetched ${games.length} playoff games from balldontlie`);

    if (games.length === 0) {
      console.warn("[NBA] No playoff games from API — using mock data");
      await syncPlayoffMock();
      return;
    }

    for (const game of games) {
      // balldontlie повертає дату як "2026-04-18" (без часу) або ISO string
      // Трактуємо як UTC
      const gameTime = new Date(game.date);
      const kyivTime = new Date(gameTime.getTime() + 3 * 60 * 60 * 1000);

      await prisma.nbaSchedule.upsert({
        where: { gameId: String(game.id) },
        update: { status: game.status === "Final" ? "finished" : "scheduled" },
        create: {
          gameId: String(game.id),
          homeTeam: game.home_team?.full_name || "Unknown",
          awayTeam: game.visitor_team?.full_name || "Unknown",
          gameTime,
          kyivTime,
          season: game.season || 2025,
          status: game.status === "Final" ? "finished" : "scheduled",
        },
      });
    }

    console.log("[NBA] Playoff schedule synced from API");
  } catch (e) {
    console.error("[NBA] Sync error:", e);
    await syncPlayoffMock();
  }
}

/**
 * Реалістичні плей-офф матчі 2026 (перший раунд, стартує 18 квітня).
 * UTC = ET + 4h (EDT у квітні).
 * Kyiv = UTC + 3h = ET + 7h.
 *
 * Приклад: 18:00 ET = 22:00 UTC → 01:00 Kyiv (19 квітня)
 *          20:30 ET = 00:30 UTC (наст. день) → 03:30 Kyiv (19 квітня)
 */
async function syncPlayoffMock() {
  // Всі часи — UTC (18:00 ET + 4h = 22:00 UTC)
  const d = (dateStr: string, utcH: number, utcM: number) => {
    const dt = new Date(`${dateStr}T${String(utcH).padStart(2,"0")}:${String(utcM).padStart(2,"0")}:00.000Z`);
    return dt;
  };

  const games = [
    // 18 квітня
    { id: "playoff_2026_r1_g1",  away: "New York Knicks",          home: "Atlanta Hawks",            utc: d("2026-04-18", 22, 0)  },
    { id: "playoff_2026_r1_g2",  away: "Boston Celtics",           home: "Miami Heat",               utc: d("2026-04-19",  0, 30) },
    // 19 квітня
    { id: "playoff_2026_r1_g3",  away: "Oklahoma City Thunder",    home: "Memphis Grizzlies",        utc: d("2026-04-19", 19, 0)  },
    { id: "playoff_2026_r1_g4",  away: "Denver Nuggets",           home: "Los Angeles Clippers",     utc: d("2026-04-19", 21, 30) },
    { id: "playoff_2026_r1_g5",  away: "Cleveland Cavaliers",      home: "Orlando Magic",            utc: d("2026-04-20",  0, 0)  },
    { id: "playoff_2026_r1_g6",  away: "Houston Rockets",          home: "Los Angeles Lakers",       utc: d("2026-04-20",  2, 30) },
    // 20 квітня
    { id: "playoff_2026_r1_g7",  away: "Milwaukee Bucks",          home: "Indiana Pacers",           utc: d("2026-04-20", 19, 0)  },
    { id: "playoff_2026_r1_g8",  away: "Philadelphia 76ers",       home: "Brooklyn Nets",            utc: d("2026-04-20", 21, 30) },
    { id: "playoff_2026_r1_g9",  away: "Golden State Warriors",    home: "Phoenix Suns",             utc: d("2026-04-21",  0, 0)  },
    { id: "playoff_2026_r1_g10", away: "Minnesota Timberwolves",   home: "Dallas Mavericks",         utc: d("2026-04-21",  2, 30) },
    // Гра 2 кожної серії (22-23 квітня)
    { id: "playoff_2026_r1_g11", away: "New York Knicks",          home: "Atlanta Hawks",            utc: d("2026-04-22", 22, 0)  },
    { id: "playoff_2026_r1_g12", away: "Boston Celtics",           home: "Miami Heat",               utc: d("2026-04-23",  0, 30) },
    { id: "playoff_2026_r1_g13", away: "Oklahoma City Thunder",    home: "Memphis Grizzlies",        utc: d("2026-04-23", 19, 0)  },
    { id: "playoff_2026_r1_g14", away: "Denver Nuggets",           home: "Los Angeles Clippers",     utc: d("2026-04-23", 21, 30) },
    { id: "playoff_2026_r1_g15", away: "Houston Rockets",          home: "Los Angeles Lakers",       utc: d("2026-04-24",  2, 30) },
  ];

  for (const game of games) {
    const kyivTime = new Date(game.utc.getTime() + 3 * 60 * 60 * 1000);
    await prisma.nbaSchedule.upsert({
      where: { gameId: game.id },
      update: { status: "scheduled" },
      create: {
        gameId: game.id,
        homeTeam: game.home,
        awayTeam: game.away,
        gameTime: game.utc,
        kyivTime,
        season: 2025,
        status: "scheduled",
      },
    });
  }

  console.log("[NBA] Playoff mock schedule (15 games) synced");
}
