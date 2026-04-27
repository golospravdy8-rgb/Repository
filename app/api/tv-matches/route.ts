import { NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    // Спробуємо отримати матчи з бази даних (нові в начале)
    const dbMatches = await prisma.tvMatch.findMany({
      orderBy: { matchDate: "desc" },  // ← НОВЫЕ МАТЧИ В НАЧАЛЕ (по дате DESC)
      take: 12,
    });

    if (dbMatches.length > 0) {
      const result = {
        matches: dbMatches.map((m) => ({
          id: m.id,
          title: m.title,
          url: m.url,
          date: m.matchDate.toISOString().split("T")[0],
        })),
      };
      return NextResponse.json(result);
    }

    // Якщо база пуста, парсимо basketball-video.com
    await syncMatches();

    // Повертаємо матчи з бази (новые в начале)
    const freshMatches = await prisma.tvMatch.findMany({
      orderBy: { matchDate: "desc" },  // ← НОВЫЕ МАТЧИ В НАЧАЛЕ
      take: 12,
    });

    const result = {
      matches: freshMatches.map((m) => ({
        id: m.id,
        title: m.title,
        url: m.url,
        date: m.matchDate.toISOString().split("T")[0],
      })),
    };

    return NextResponse.json(result);
  } catch (e) {
    console.error("tv-matches error:", e);
    return NextResponse.json({ matches: [] });
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Синхронізує матчи з basketball-video.com
 * Ключова логіка: N нових матчів → додаємо N + видаляємо N найстаріших
 * Результат: завжди 12 найсвіжіших матчів, нові в НАЧАЛЕ (DESC за datою)
 */
async function syncMatches() {
  try {
    const res = await fetch("https://basketball-video.com/", {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
      signal: AbortSignal.timeout(12000),
    });
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

    console.log(`[TV] Parsed ${parsedMatches.length} matches from basketball-video.com`);

    if (parsedMatches.length === 0) {
      console.log("[TV] No matches parsed");
      return;
    }

    // Беремо перші 12 матчів в тому порядку, в якому вони на сайті
    const top12Parsed = parsedMatches.slice(0, 12);

    // Отримуємо поточні матчи з бази (всі)
    const existingMatches = await prisma.tvMatch.findMany({
      orderBy: { matchDate: "desc" },
    });

    // Визначаємо які матчі нові (не в базі)
    const newMatches = top12Parsed.filter(
      (m) => !existingMatches.find((em) => em.url === m.url)
    );
    const countNewMatches = newMatches.length;

    console.log(
      `[TV] Found ${countNewMatches} NEW matches, ${existingMatches.length} existing`
    );

    // Якщо нові матчи — додаємо їх
    if (countNewMatches > 0) {
      for (const match of newMatches) {
        await prisma.tvMatch.create({
          data: {
            title: match.title,
            url: match.url,
            matchDate: match.matchDate,
          },
        });
      }
      console.log(`[TV] Added ${countNewMatches} new matches`);
    }

    // Отримуємо всі матчи після додавання (у порядку спадання дати)
    const allMatches = await prisma.tvMatch.findMany({
      orderBy: { matchDate: "desc" },
    });

    console.log(`[TV] Total matches in DB: ${allMatches.length}`);

    // КЛЮЧОВА ЛОГІКА: якщо більше ніж 12 матчів — видаляємо старійші
    // Кількість видаління = мін(countNewMatches, надлишок)
    const maxMatches = 12;
    if (allMatches.length > maxMatches) {
      const excess = allMatches.length - maxMatches;
      const countToDelete = Math.min(countNewMatches || 1, excess);

      // Видаляємо найстаріші матчи (末початку масиву, який відсортований DESC)
      const toDelete = allMatches.slice(maxMatches, maxMatches + countToDelete).map((m) => m.id);

      console.log(
        `[TV] Deleting ${toDelete.length} old matches (kept ${maxMatches} newest)`
      );

      await prisma.tvMatch.deleteMany({
        where: { id: { in: toDelete } },
      });
    }

    console.log("[TV] Sync complete");
  } catch (e) {
    console.error("[TV] Sync error:", e);
  }
}

// POST для manual sync (тестування)
export async function POST() {
  try {
    await syncMatches();

    const matches = await prisma.tvMatch.findMany({
      orderBy: { matchDate: "desc" },
      take: 12,
    });

    return NextResponse.json({
      success: true,
      message: "Sync completed",
      totalMatches: matches.length,
      matches: matches.map((m) => ({
        id: m.id,
        title: m.title,
        url: m.url,
        date: m.matchDate.toISOString().split("T")[0],
      })),
    });
  } catch (e) {
    console.error("tv-matches POST error:", e);
    return NextResponse.json(
      { success: false, error: String(e) },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
