import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { findLiveStream } from "@/lib/live-stream-finder";

const prisma = new PrismaClient();

export const dynamic = "force-dynamic";

/**
 * Cron endpoint: POST /api/cron/find-live-streams
 * Запускається кожні 10 хвилин (24/7)
 * Шукає посилання на LIVE трансляції NBA з множинних джерел
 *
 * Логика:
 * 1. Знаходимо ігри в "вікні пошуку" (від старту до старту + 10 хв)
 * 2. Для кожної гри:
 *    - Першу спробу: якщо нема firstSearchAt
 *    - Другу спробу: якщо прошло >= 10 хвилин після першої
 * 3. Якщо знайдено посилання → update LiveSession + NbaSchedule.status
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
    const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000);

    // Знаходимо ігри для пошуку
    const currentGames = await prisma.nbaSchedule.findMany({
      where: {
        gameTime: {
          gte: fourHoursAgo, // 4 години назад (матч може триватись)
          lte: oneHourLater, // 1 година вперед
        },
        status: { not: "finished" },
      },
    });

    console.log(`[CRON] Found ${currentGames.length} games in search window`);

    const results = [];

    for (const game of currentGames) {
      // Знаходимо або створюємо live-сесію
      let liveSession = await prisma.liveSession.findUnique({
        where: { gameId: game.gameId },
      });

      if (!liveSession) {
        liveSession = await prisma.liveSession.create({
          data: {
            gameId: game.gameId,
            homeTeam: game.homeTeam,
            awayTeam: game.awayTeam,
            gameTime: game.gameTime,
            kyivTime: game.kyivTime,
            isActive: false,
            checkCount: 0,
          },
        });
        console.log(
          `[CRON] Created live session for ${game.awayTeam} vs ${game.homeTeam}`
        );
      }

      // Перевіряємо, чи заповнений пошук (searchCompleted)
      if (liveSession.searchCompleted) {
        console.log(
          `[CRON] Skipping ${game.awayTeam} vs ${game.homeTeam} (search completed)`
        );
        continue;
      }

      // ЛОГИКА ПОШУКУ:
      // 1 спроба: якщо нема firstSearchAt
      // 2 спроба: якщо прошло >= 10 хвилин після першої

      const TEN_MINUTES = 10 * 60 * 1000;
      const shouldSearch = determineSearchAttempt(liveSession, now, TEN_MINUTES);

      if (!shouldSearch) {
        console.log(
          `[CRON] Not yet time to search ${game.awayTeam} vs ${game.homeTeam}`
        );
        continue;
      }

      // ШУКАЄМО
      const searchResult = await findLiveStream(
        game.awayTeam,
        game.homeTeam,
        game.gameId
      );

      if (searchResult) {
        const { url, source } = searchResult;

        // Обновляємо live-сесію
        await prisma.liveSession.update({
          where: { gameId: game.gameId },
          data: {
            liveUrl: url,
            liveSource: source,
            isActive: true,
            lastChecked: new Date(),
            secondSearchAt: liveSession.firstSearchAt ? new Date() : undefined,
            searchCompleted: !!liveSession.firstSearchAt, // Close if was first search
          },
        });

        // Обновляємо NBA Schedule статус
        try {
          await prisma.nbaSchedule.update({
            where: { gameId: game.gameId },
            data: { status: "live" },
          });
          console.log(`[LIVE] Game marked as LIVE: ${game.gameId}`);
        } catch (err) {
          console.warn(
            `[LIVE] Could not update schedule for ${game.gameId}: ${String(err)}`
          );
        }

        results.push({
          game: `${game.awayTeam} vs ${game.homeTeam}`,
          liveUrl: url,
          source,
          found: true,
        });

        console.log(
          `[CRON] ✅ Found live stream (${source}): ${game.awayTeam} vs ${game.homeTeam}`
        );
      } else {
        // Не знайдено - оновляємо тільки мітки часу та counter
        const update: any = {
          lastChecked: new Date(),
          checkCount: liveSession.checkCount + 1,
        };

        // Записуємо мітку першої спроби, якщо це перший пошук
        if (!liveSession.firstSearchAt) {
          update.firstSearchAt = new Date();
        } else if (liveSession.firstSearchAt && !liveSession.secondSearchAt) {
          // Це друга спроба
          update.secondSearchAt = new Date();
          update.searchCompleted = true;
        }

        await prisma.liveSession.update({
          where: { gameId: game.gameId },
          data: update,
        });

        results.push({
          game: `${game.awayTeam} vs ${game.homeTeam}`,
          found: false,
        });

        console.log(
          `[CRON] ❌ No live stream found: ${game.awayTeam} vs ${game.homeTeam}`
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: `Checked ${currentGames.length} games`,
      results,
    });
  } catch (e) {
    console.error("[CRON] Error:", e);
    return NextResponse.json(
      { error: "Failed to search for live streams", details: String(e) },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Determine if we should search on this cron run
 */
function determineSearchAttempt(
  liveSession: any,
  now: Date,
  tenMinutes: number
): boolean {
  // Якщо пошук завершений - пропускаємо
  if (liveSession.searchCompleted) {
    return false;
  }

  // Якщо ще не робили першу спробу - робимо
  if (!liveSession.firstSearchAt) {
    return true;
  }

  // Якщо першу робили, але другу ще ні, і пройшло >= 10 хвилин - робимо другу
  if (liveSession.firstSearchAt && !liveSession.secondSearchAt) {
    const timeSinceFirst = now.getTime() - liveSession.firstSearchAt.getTime();
    return timeSinceFirst >= tenMinutes;
  }

  // Інші случаї - не шукаємо
  return false;
}
