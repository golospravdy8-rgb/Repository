import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const dynamic = "force-dynamic";

/**
 * GET /api/nba-schedule
 * Returns upcoming NBA games for next 3-4 days with Kyiv time conversion (UTC+3)
 */
export async function GET() {
  try {
    const now = new Date();
    const nextDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days ahead for more games

    // Спробуємо отримати з бази даних
    const schedule = await prisma.nbaSchedule.findMany({
      where: {
        gameTime: {
          gte: now,
          lte: nextDays,
        },
        status: { not: "finished" },
      },
      orderBy: { gameTime: "asc" },
      take: 50,
    });

    if (schedule.length > 0) {
      return NextResponse.json({
        success: true,
        games: schedule.map((g) => ({
          id: g.gameId,
          homeTeam: g.homeTeam,
          awayTeam: g.awayTeam,
          gameTime: g.gameTime.toISOString(),
          kyivTime: g.kyivTime.toISOString(),
          kyivTimeFormatted: formatKyivTime(g.kyivTime),
          status: g.status,
        })),
      });
    }

    // Якщо база пуста, парсимо з API
    await syncNbaSchedule();

    const freshSchedule = await prisma.nbaSchedule.findMany({
      where: {
        gameTime: {
          gte: now,
          lte: nextDays,
        },
        status: { not: "finished" },
      },
      orderBy: { gameTime: "asc" },
      take: 50,
    });

    return NextResponse.json({
      success: true,
      games: freshSchedule.map((g) => ({
        id: g.gameId,
        homeTeam: g.homeTeam,
        awayTeam: g.awayTeam,
        gameTime: g.gameTime.toISOString(),
        kyivTime: g.kyivTime.toISOString(),
        kyivTimeFormatted: formatKyivTime(g.kyivTime),
        status: g.status,
      })),
    });
  } catch (e) {
    console.error("[NBA] Schedule error:", e);
    return NextResponse.json({
      success: false,
      error: "Failed to fetch NBA schedule",
      games: [],
    });
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Форматує Київський час як "10:00 (Київ)"
 */
function formatKyivTime(date: Date): string {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes} (Київ)`;
}

/**
 * Синхронізує розклад з балдонтліе API
 */
async function syncNbaSchedule() {
  try {
    const now = new Date();
    const nextDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Використовуємо balldontlie.io API (безкоштовна альтернатива)
    // API: https://api.balldontlie.io/v1/games?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD
    const startDate = now.toISOString().split("T")[0];
    const endDate = nextDays.toISOString().split("T")[0];

    const apiKey = process.env.BALL_DONT_LIE_API_KEY || "";
    if (!apiKey) {
      console.warn("[NBA] BALL_DONT_LIE_API_KEY not set, using mock data");
      await syncMockSchedule();
      return;
    }

    const res = await fetch(
      `https://api.balldontlie.io/v1/games?start_date=${startDate}&end_date=${endDate}`,
      {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!res.ok) {
      console.warn("[NBA] API error, using mock data");
      await syncMockSchedule();
      return;
    }

    const data = (await res.json()) as any;
    const games = data.data || [];

    console.log(`[NBA] Fetched ${games.length} games from balldontlie API`);

    // Зберігаємо в базу
    for (const game of games) {
      const gameTime = new Date(game.date);
      const kyivTime = new Date(gameTime.getTime() + 3 * 60 * 60 * 1000); // UTC+3

      await prisma.nbaSchedule.upsert({
        where: { gameId: String(game.id) },
        update: {
          status: game.status === "Final" ? "finished" : "scheduled",
        },
        create: {
          gameId: String(game.id),
          homeTeam: game.home_team.full_name || "Unknown",
          awayTeam: game.visitor_team.full_name || "Unknown",
          gameTime,
          kyivTime,
          season: game.season || 2026,
          status: game.status === "Final" ? "finished" : "scheduled",
        },
      });
    }

    console.log("[NBA] Schedule synced");
  } catch (e) {
    console.error("[NBA] Sync error:", e);
    await syncMockSchedule();
  }
}

/**
 * Тестові дані для локального тестування
 */
async function syncMockSchedule() {
  try {
    const now = new Date();
    const mockGames = [
      {
        gameId: `mock_${Date.now()}_1`,
        homeTeam: "Los Angeles Lakers",
        awayTeam: "New York Knicks",
        gameTime: new Date(now.getTime() + 2 * 60 * 60 * 1000),
        season: 2026,
      },
      {
        gameId: `mock_${Date.now()}_2`,
        homeTeam: "Miami Heat",
        awayTeam: "Boston Celtics",
        gameTime: new Date(now.getTime() + 24 * 60 * 60 * 1000),
        season: 2026,
      },
      {
        gameId: `mock_${Date.now()}_3`,
        homeTeam: "Golden State Warriors",
        awayTeam: "Denver Nuggets",
        gameTime: new Date(now.getTime() + 48 * 60 * 60 * 1000),
        season: 2026,
      },
    ];

    for (const game of mockGames) {
      const kyivTime = new Date(game.gameTime.getTime() + 3 * 60 * 60 * 1000);

      await prisma.nbaSchedule.upsert({
        where: { gameId: game.gameId },
        update: { kyivTime },
        create: {
          ...game,
          kyivTime,
          status: "scheduled",
        },
      });
    }

    console.log("[NBA] Mock schedule created");
  } catch (e) {
    console.error("[NBA] Mock sync error:", e);
  }
}
