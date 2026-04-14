import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import * as cheerio from "cheerio";

const prisma = new PrismaClient();

export const dynamic = "force-dynamic";

/**
 * Cron endpoint: POST /api/cron/find-live-streams
 * Запускається кожні 10 хвилин під час ігор
 * Шукає робочі посилання на LIVE трансляції NBA
 */
export async function POST(req: NextRequest) {
  // Перевіримо Vercel Cron Secret для безпеки
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

    // Знаходимо ігри, які зараз або незабаром мають починатися
    const currentGames = await prisma.nbaSchedule.findMany({
      where: {
        gameTime: {
          gte: new Date(now.getTime() - 4 * 60 * 60 * 1000), // 4 години назад (матч може триватиcь)
          lte: oneHourLater,
        },
        status: { not: "finished" },
      },
    });

    console.log(`[CRON] Found ${currentGames.length} current/upcoming games`);

    const results = [];

    for (const game of currentGames) {
      // Перевіримо, чи вже є активна live-сесія
      let liveSession = await prisma.liveSession.findUnique({
        where: { gameId: game.gameId },
      });

      if (!liveSession) {
        // Створюємо нову live-сесію
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
        console.log(`[CRON] Created new live session for ${game.awayTeam} vs ${game.homeTeam}`);
      }

      // Перевіримо, чи ми вже шукали цю гру (макс 2 спроби)
      if (liveSession.checkCount >= 2) {
        console.log(`[CRON] Skipping ${game.awayTeam} vs ${game.homeTeam} (already checked 2 times)`);
        continue;
      }

      // Шукаємо live посилання
      const liveUrl = await findLiveStream(game.awayTeam, game.homeTeam);

      if (liveUrl) {
        await prisma.liveSession.update({
          where: { id: liveSession.id },
          data: {
            liveUrl,
            liveSource: extractSource(liveUrl),
            isActive: true,
            lastChecked: new Date(),
            checkCount: liveSession.checkCount + 1,
          },
        });

        // Update NBA schedule status to "live"
        try {
          await prisma.nbaSchedule.update({
            where: { gameId: game.gameId },
            data: { status: "live" },
          });
          console.log(`[LIVE] Game marked as LIVE: ${game.gameId}`);
        } catch (err) {
          console.warn(`[LIVE] Could not update schedule for ${game.gameId}: ${String(err)}`);
        }

        results.push({
          game: `${game.awayTeam} vs ${game.homeTeam}`,
          liveUrl,
          source: extractSource(liveUrl),
          found: true,
        });

        console.log(`[CRON] ✅ Found live stream for ${game.awayTeam} vs ${game.homeTeam}`);
      } else {
        // Оновлюємо checkCount без посилання
        await prisma.liveSession.update({
          where: { id: liveSession.id },
          data: {
            lastChecked: new Date(),
            checkCount: liveSession.checkCount + 1,
          },
        });

        results.push({
          game: `${game.awayTeam} vs ${game.homeTeam}`,
          found: false,
        });

        console.log(`[CRON] ❌ No live stream found for ${game.awayTeam} vs ${game.homeTeam}`);
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
 * Шукає live посилання для гри в basketball-video.com, ok.ru, dailymotion тощо
 */
async function findLiveStream(awayTeam: string, homeTeam: string): Promise<string | null> {
  try {
    // Спочатку шукаємо в basketball-video.com (наш основний джерело)
    const searchQuery = `${awayTeam.replace(/\s+/g, "-")} vs ${homeTeam.replace(/\s+/g, "-")}`.toLowerCase();

    // Спроба 1: basketball-video.com
    const bbvideoUrl = `https://basketball-video.com/?s=${encodeURIComponent(`${awayTeam} ${homeTeam}`)}`;
    const bbvideoRes = await fetch(bbvideoUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
      signal: AbortSignal.timeout(5000),
    });

    if (bbvideoRes.ok) {
      const html = await bbvideoRes.text();
      const $ = cheerio.load(html);

      // Шукаємо "LIVE" посилання або сьогоднішні матчи
      const liveLink = $("a:contains('LIVE'), a:contains('LIVE Game'), h2:contains('Today')").first().attr("href");
      if (liveLink && liveLink.startsWith("http")) {
        console.log(`[CRON] Found basketball-video.com link: ${liveLink.substring(0, 80)}`);
        return liveLink;
      }
    }

    // Спроба 2: ok.ru (шукаємо через простий пошук)
    const okruSearch = `https://ok.ru/search?q=${encodeURIComponent(`NBA ${awayTeam} ${homeTeam} live`)}`;
    const okruRes = await fetch(okruSearch, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
      signal: AbortSignal.timeout(5000),
    });

    if (okruRes.ok) {
      const html = await okruRes.text();
      if (html.includes("videoembed") || html.includes("video")) {
        console.log(`[CRON] Found potential ok.ru stream`);
        return `https://ok.ru/search?q=${encodeURIComponent(`NBA ${awayTeam} ${homeTeam}`)}`;
      }
    }

    console.log(`[CRON] No live stream found for ${awayTeam} vs ${homeTeam}`);
    return null;
  } catch (e) {
    console.error(`[CRON] Error searching for ${awayTeam} vs ${homeTeam}:`, e);
    return null;
  }
}

/**
 * Витягує джерело з URL
 */
function extractSource(url: string): string {
  if (url.includes("ok.ru")) return "ok.ru";
  if (url.includes("dailymotion")) return "dailymotion";
  if (url.includes("youtube")) return "youtube";
  if (url.includes("basketball-video")) return "basketball-video";
  return "unknown";
}
