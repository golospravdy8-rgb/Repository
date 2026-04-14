import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { findLiveStream } from "@/lib/live-stream-finder";

const prisma = new PrismaClient();

export const dynamic = "force-dynamic";

/**
 * POST /api/live-sessions/trigger-search
 *
 * Manually trigger a live stream search for a game
 * Used when:
 * - User opens schedule page (need to search immediately)
 * - User is watching game that just started
 *
 * Request:
 * {
 *   gameId: "401866755",
 *   awayTeam: "Miami Heat",
 *   homeTeam: "Charlotte Hornets",
 *   gameTime: "2026-04-14T23:30:00Z",
 *   kyivTime: "2026-04-15T02:30:00Z"
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { gameId, awayTeam, homeTeam, gameTime, kyivTime } = body;

    if (!gameId || !awayTeam || !homeTeam) {
      return NextResponse.json(
        { error: "Missing gameId, awayTeam, or homeTeam" },
        { status: 400 }
      );
    }

    console.log(`[TRIGGER] Search requested for ${awayTeam} vs ${homeTeam}`);

    // Знаходимо або створюємо live-сесію
    let liveSession = await prisma.liveSession.findUnique({
      where: { gameId },
    });

    if (!liveSession) {
      liveSession = await prisma.liveSession.create({
        data: {
          gameId,
          homeTeam,
          awayTeam,
          gameTime: new Date(gameTime),
          kyivTime: new Date(kyivTime),
          isActive: false,
          checkCount: 0,
        },
      });
      console.log(`[TRIGGER] Created new live session for ${gameId}`);
    }

    // Якщо пошук вже завершений - повертаємо результат
    if (liveSession.searchCompleted && liveSession.liveUrl) {
      return NextResponse.json({
        success: true,
        found: true,
        liveUrl: liveSession.liveUrl,
        liveSource: liveSession.liveSource,
        message: "Already found stream for this game",
      });
    }

    if (liveSession.searchCompleted && !liveSession.liveUrl) {
      return NextResponse.json({
        success: true,
        found: false,
        message: "Search completed, no stream found",
      });
    }

    // Шукаємо посилання
    console.log(`[TRIGGER] Starting search...`);
    const searchResult = await findLiveStream(awayTeam, homeTeam, gameId);

    if (searchResult) {
      const { url, source } = searchResult;

      // Обновляємо live-сесію
      const update: any = {
        liveUrl: url,
        liveSource: source,
        isActive: true,
        lastChecked: new Date(),
      };

      // Якщо це перший пошук - записуємо мітку
      if (!liveSession.firstSearchAt) {
        update.firstSearchAt = new Date();
      }

      await prisma.liveSession.update({
        where: { gameId },
        data: update,
      });

      // Обновляємо статус в NBA Schedule
      try {
        await prisma.nbaSchedule.update({
          where: { gameId },
          data: { status: "live" },
        });
        console.log(`[TRIGGER] Game marked as LIVE: ${gameId}`);
      } catch (err) {
        console.warn(
          `[TRIGGER] Could not update schedule for ${gameId}: ${String(err)}`
        );
      }

      return NextResponse.json({
        success: true,
        found: true,
        liveUrl: url,
        liveSource: source,
        message: `Found stream from ${source}`,
      });
    } else {
      // Не знайдено - записуємо мітку першої спроби
      if (!liveSession.firstSearchAt) {
        await prisma.liveSession.update({
          where: { gameId },
          data: {
            firstSearchAt: new Date(),
            checkCount: 1,
          },
        });
        console.log(`[TRIGGER] First search attempt recorded for ${gameId}`);
      }

      return NextResponse.json({
        success: true,
        found: false,
        message: "No stream found, will retry in 10 minutes",
      });
    }
  } catch (error) {
    console.error("[TRIGGER] Error:", error);
    return NextResponse.json(
      { error: "Failed to trigger search", details: String(error) },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
