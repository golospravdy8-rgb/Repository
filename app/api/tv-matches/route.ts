import { NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    // Спробуємо отримати матчи з бази даних
    const dbMatches = await prisma.tvMatch.findMany({
      orderBy: { createdAt: "asc" },  // ← Зберігаємо порядок вставки з парсингу сайту
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

    // Повертаємо матчи з бази в порядку вставки (порядок з сайту)
    const freshMatches = await prisma.tvMatch.findMany({
      orderBy: { createdAt: "asc" },  // ← Порядок з сайту
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
 * Парсить головну сторінку й зберігає 12 найсвіжіших матчів
 */
async function syncMatches() {
  try {
    const res = await fetch("https://basketball-video.com/", {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
      signal: AbortSignal.timeout(12000),
    });
    const html = await res.text();
    const $ = cheerio.load(html);
    const newMatches: { title: string; url: string; matchDate: Date }[] = [];

    // Парсимо .short_item блоки (центральна секція матчів)
    $(".short_item").each((_, el) => {
      const titleEl = $(el).find("h3 a");
      const title = titleEl.text().trim();
      const href = titleEl.attr("href") || "";

      if (!title || !href) return;

      // Витягуємо дату з назви (напр. "April 12, 2026")
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

      if (!newMatches.find((m) => m.url === fullUrl)) {
        newMatches.push({
          title: title.substring(0, 150),
          url: fullUrl,
          matchDate,
        });
      }
    });

    console.log(`[TV] Parsed ${newMatches.length} matches from basketball-video.com`);

    if (newMatches.length === 0) {
      console.log("[TV] No matches parsed");
      return;
    }

    // НЕ сортуємо! Зберігаємо порядок з сайту як displayOrder
    // Беремо перші 12 матчів в тому порядку, в якому вони з'явилися на сайті
    const top12New = newMatches.slice(0, 12);

    // Отримуємо поточні матчи з бази
    const existingMatches = await prisma.tvMatch.findMany({
      orderBy: { matchDate: "desc" },
    });

    // Знаходимо яких матчів не має у базі
    const urlsToAdd = top12New
      .filter((m) => !existingMatches.find((em) => em.url === m.url))
      .map((m) => m.url);

    console.log(
      `[TV] ${urlsToAdd.length} new matches to add, ${existingMatches.length} existing`
    );

    // Додаємо нові матчи (в тому порядку, в якому вони були розпарсені з сайту)
    for (const match of top12New) {
      await prisma.tvMatch.upsert({
        where: { url: match.url },
        update: {
          matchDate: match.matchDate,
        },
        create: {
          title: match.title,
          url: match.url,
          matchDate: match.matchDate,
        },
      });
    }

    // Отримуємо всі матчи, відсортовані по датам
    const allMatches = await prisma.tvMatch.findMany({
      orderBy: { matchDate: "desc" },
    });

    // Якщо матчів більше ніж 12 — видаляємо найстаріші
    if (allMatches.length > 12) {
      const toDelete = allMatches.slice(12).map((m) => m.id);
      console.log(`[TV] Deleting ${toDelete.length} old matches`);
      await prisma.tvMatch.deleteMany({
        where: { id: { in: toDelete } },
      });
    }

    console.log("[TV] Sync complete");
  } catch (e) {
    console.error("[TV] Sync error:", e);
  }
}
