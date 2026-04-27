import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const dynamic = "force-dynamic";
export const maxDuration = 60; // 60 seconds timeout for Vercel Functions

/**
 * Cron endpoint: POST /api/cron/sync-tv-matches
 * Запускається кожну годину (0 * * * *)
 * Синхронізує матчи з basketball-video.com
 *
 * Логика:
 * 1. Парсить basketball-video.com (перших 12 матчів)
 * 2. Знаходить нові матчи (не в базі)
 * 3. Додає нові матчи
 * 4. Видаляє старійші матчи (кількість = кількість нових)
 * 5. Результат: 12 найсвіжіших матчів (нові в НАЧАЛЕ по дате DESC)
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  // Дозволяємо запуск без auth для локального тестування, але з auth для продакшену
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    console.log("[CRON] Starting TV matches sync...");

    // Парсимо basketball-video.com
    const res = await fetch("https://basketball-video.com/", {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      throw new Error(`Basketball-video.com returned ${res.status}`);
    }

    const html = await res.text();
    const $ = cheerio.load(html);
    const parsedMatches: { title: string; url: string; matchDate: Date }[] = [];

    // Парсимо .short_item блоки (центральна секція матчів)
    $(".short_item").each((_, el) => {
      const titleEl = $(el).find("h3 a");
      const title = titleEl.text().trim();
      const href = titleEl.attr("href") || "";

      if (!title || !href) return;

      // Витягуємо дату з назви (напр. "April 26, 2026")
      const dateMatch = title.match(/([A-Z][a-z]+\s+\d{1,2},\s+\d{4})/);
      let matchDate = new Date();
      if (dateMatch) {
        const dateStr = dateMatch[1];
        const parsed = new Date(dateStr);
        if (!isNaN(parsed.getTime())) {
          matchDate = parsed;
        }
      }

      const fullUrl = href.startsWith("http")
        ? href
        : `https://basketball-video.com${href}`;

      // Дублікати за URL
      if (!parsedMatches.find((m) => m.url === fullUrl)) {
        parsedMatches.push({
          title: title.substring(0, 150),
          url: fullUrl,
          matchDate,
        });
      }
    });

    console.log(`[CRON] Parsed ${parsedMatches.length} matches from basketball-video.com`);

    if (parsedMatches.length === 0) {
      console.log("[CRON] No matches parsed, ending sync");
      return NextResponse.json({
        success: true,
        message: "No matches parsed",
        timestamp: new Date().toISOString(),
      });
    }

    // Беремо перші 12 матчів
    const top12Parsed = parsedMatches.slice(0, 12);

    // Отримуємо поточні матчи з бази
    const existingMatches = await prisma.tvMatch.findMany({
      orderBy: { matchDate: "desc" },
    });

    // Знаходимо нові матчи
    const newMatches = top12Parsed.filter(
      (m) => !existingMatches.find((em) => em.url === m.url)
    );
    const countNewMatches = newMatches.length;

    console.log(
      `[CRON] Found ${countNewMatches} NEW matches, ${existingMatches.length} existing`
    );

    let addedCount = 0;
    let deletedCount = 0;

    // Додаємо нові матчи
    if (countNewMatches > 0) {
      for (const match of newMatches) {
        await prisma.tvMatch.create({
          data: {
            title: match.title,
            url: match.url,
            matchDate: match.matchDate,
          },
        });
        addedCount++;
      }
      console.log(`[CRON] Added ${addedCount} new matches`);
    }

    // Отримуємо всі матчи після додавання
    const allMatches = await prisma.tvMatch.findMany({
      orderBy: { matchDate: "desc" },
    });

    console.log(`[CRON] Total matches in DB: ${allMatches.length}`);

    // КЛЮЧОВА ЛОГІКА: видаляємо старійші матчи
    const maxMatches = 12;
    if (allMatches.length > maxMatches) {
      const excess = allMatches.length - maxMatches;
      const countToDelete = Math.min(countNewMatches || 1, excess);

      // Видаляємо найстаріші матчи
      const toDelete = allMatches
        .slice(maxMatches, maxMatches + countToDelete)
        .map((m) => m.id);

      console.log(
        `[CRON] Deleting ${toDelete.length} old matches (kept ${maxMatches} newest)`
      );

      await prisma.tvMatch.deleteMany({
        where: { id: { in: toDelete } },
      });
      deletedCount = toDelete.length;
    }

    // Отримуємо фінальний список матчів
    const finalMatches = await prisma.tvMatch.findMany({
      orderBy: { matchDate: "desc" },
      take: 12,
    });

    console.log("[CRON] TV matches sync complete");

    return NextResponse.json({
      success: true,
      message: "TV matches synced successfully",
      timestamp: new Date().toISOString(),
      stats: {
        parsed: parsedMatches.length,
        added: addedCount,
        deleted: deletedCount,
        finalCount: finalMatches.length,
      },
      matches: finalMatches.map((m) => ({
        id: m.id,
        title: m.title.substring(0, 50) + "...",
        date: m.matchDate.toISOString().split("T")[0],
      })),
    });
  } catch (e) {
    console.error("[CRON] TV matches sync error:", e);
    return NextResponse.json(
      {
        success: false,
        error: String(e),
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
