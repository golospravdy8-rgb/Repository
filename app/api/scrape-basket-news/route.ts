import { NextResponse } from "next/server";
import * as cheerio from "cheerio";

interface NewsItem {
  id: string;
  title: string;
  imageUrl: string | null;
  link: string;
  date: string;
}

interface CacheEntry {
  data: NewsItem[];
  timestamp: number;
}

const CACHE_DURATION = 3 * 60 * 1000; // 3 хвилини
let cachedNews: CacheEntry | null = null;
let lastCacheReset = Date.now();

// Отримати дату в київському часі (UTC+3)
function getKyivDate(): string {
  const now = new Date();
  const kyivTime = new Date(now.getTime() + 3 * 60 * 60 * 1000);
  return kyivTime.toISOString().split("T")[0];
}

async function getNewsImage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(8000),
    });
    const html = await res.text();
    const $ = cheerio.load(html);
    const img =
      $("meta[property='og:image']").attr("content") ||
      $(".post-thumbnail img").attr("src") ||
      $("article img").first().attr("src") ||
      null;
    return img || null;
  } catch {
    return null;
  }
}

function extractDateFromUrl(url: string): string | null {
  const match = url.match(/\/(\d{4})\/(\d{2})\/(\d{2})\//);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : null;
}

async function scrapeBasketNews(): Promise<NewsItem[]> {
  const headers = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" };

  const res = await fetch("https://basket.com.ua/", {
    headers,
    signal: AbortSignal.timeout(15000),
  });
  const html = await res.text();
  const $ = cheerio.load(html);

  const todayStr = getKyivDate();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const kyivYesterday = new Date(yesterday.getTime() + 3 * 60 * 60 * 1000);
  const yesterdayStr = kyivYesterday.toISOString().split("T")[0];

  console.log(`[ДАТА] today: ${todayStr} | yesterday: ${yesterdayStr}`);

  const newsDay: { title: string; link: string }[] = [];
  const newsStrychka: { title: string; link: string }[] = [];

  // НОВИНИ ДНЯ — перший блок home-news-center
  $(".home-news-center").eq(0).find("a").each((_, el) => {
    const link = $(el).attr("href") || "";
    const title = $(el).text().trim();
    const cleanTitle = title.replace(/^\d{2}\.\d{2}\.\d{4}\s+\d{1,2}:\d{2}\s*/, "").trim();
    const fullLink = link.startsWith("http") ? link : `https://basket.com.ua${link}`;
    if (fullLink.includes("/news/") && cleanTitle.length > 10 && !newsDay.find(n => n.link === fullLink)) {
      newsDay.push({ title: cleanTitle, link: fullLink });
    }
  });

  // СТРІЧКА НОВИН — другий блок home-news-center
  $(".home-news-center").eq(1).find("a").each((_, el) => {
    const link = $(el).attr("href") || "";
    const title = $(el).text().trim();
    const cleanTitle = title.replace(/^\d{2}\.\d{2}\.\d{4}\s+\d{1,2}:\d{2}\s*/, "").trim();
    const fullLink = link.startsWith("http") ? link : `https://basket.com.ua${link}`;
    if (
      fullLink.includes("/news/") &&
      cleanTitle.length > 10 &&
      !newsStrychka.find(n => n.link === fullLink) &&
      !newsDay.find(n => n.link === fullLink)
    ) {
      newsStrychka.push({ title: cleanTitle, link: fullLink });
    }
  });

  console.log(`[НОВИНИ ДНЯ] ${newsDay.length} новин`);
  console.log(`[СТРІЧКА] ${newsStrychka.length} новин`);

  if (newsDay.length > 0) {
    console.log(`[ПЕРША НОВИНА ДНЯ] ${newsDay[0].title.substring(0, 60)}`);
  }
  if (newsStrychka.length > 0) {
    console.log(`[ПЕРША СТРІЧКА] ${newsStrychka[0].title.substring(0, 60)}`);
  }

  // Якщо якийсь блок порожній — fallback
  if (newsDay.length === 0 || newsStrychka.length === 0) {
    console.warn("Один з блоків порожній! Перевір CSS селектори.");
  }

  const top6Day = newsDay.slice(0, 6);
  const top6Str = newsStrychka.slice(0, 6);
  const combined = [...top6Day, ...top6Str];

  const news: NewsItem[] = await Promise.all(
    combined.map(async (item, i) => {
      const imageUrl = await getNewsImage(item.link);
      const isToday = i < top6Day.length;
      const newsDate = isToday ? todayStr : yesterdayStr;

      console.log(`[${i+1}/12] ${item.title.substring(0,50)} | ${newsDate} | img: ${imageUrl ? "✓" : "✗"}`);

      return {
        id: `news-${Date.now()}-${i}`,
        title: item.title.substring(0, 150),
        imageUrl,
        link: item.link,
        date: new Date(newsDate).toLocaleDateString("uk-UA", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
      };
    })
  );

  return news.filter(n => n.title.length > 5);
}

export async function GET() {
  try {
    const now = Date.now();

    // Якщо кеш старіший 3 хвилин — скидаємо
    if (cachedNews && now - cachedNews.timestamp >= CACHE_DURATION) {
      console.log("[CACHE] Скидаємо кеш (older than 3 min)");
      cachedNews = null;
    }

    if (cachedNews && now - cachedNews.timestamp < CACHE_DURATION) {
      console.log("[CACHE] Повертаємо кешовані дані");
      return NextResponse.json(
        { news: cachedNews.data, cached: true },
        {
          headers: {
            "Cache-Control": "public, s-maxage=180, stale-while-revalidate=30",
          },
        }
      );
    }

    console.log("[CACHE] Скрейпимо новий контент");
    const news = await scrapeBasketNews();

    if (news.length > 0) {
      cachedNews = { data: news, timestamp: now };
    }

    return NextResponse.json(
      { news: news.length > 0 ? news : [] },
      {
        headers: {
          "Cache-Control": "public, s-maxage=180, stale-while-revalidate=30",
        },
      }
    );
  } catch (err) {
    console.error("Scrape error:", err);
    return NextResponse.json({ news: [] });
  }
}
