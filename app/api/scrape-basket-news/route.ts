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

const CACHE_DURATION = 5 * 60 * 1000;
let cachedNews: CacheEntry | null = null;

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

  // Отримуємо поточну дату та вчорашню дату в форматі YYYY-MM-DD
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const yesterday = new Date(today.getTime() - 86400000);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  const allNews: { title: string; link: string }[] = [];

  try {
    const res = await fetch("https://basket.com.ua/", {
      headers,
      signal: AbortSignal.timeout(15000),
    });
    const html = await res.text();
    const $ = cheerio.load(html);

    // Збираємо ВСІ новини зі сторінки
    $("a").each((_, el) => {
      const link = $(el).attr("href") || "";
      const title = $(el).text().trim();
      const fullLink = link.startsWith("http") ? link : `https://basket.com.ua${link}`;
      if (
        fullLink.includes("basket.com.ua/news/newsday/") &&
        fullLink.split("/").length > 7 &&
        title.length > 10 &&
        !allNews.find(n => n.link === fullLink)
      ) {
        allNews.push({ title, link: fullLink });
      }
    });
    console.log(`[ВСЬОГО] знайдено: ${allNews.length}`);
  } catch (e) {
    console.error("[ПАРСИНГ] помилка:", e);
  }

  // --- РОЗДІЛЕННЯ ПО ДАТАМ ---
  let newsDay: { title: string; link: string }[] = [];
  let newsStrychka: { title: string; link: string }[] = [];

  allNews.forEach(item => {
    const dateFromUrl = extractDateFromUrl(item.link);
    if (dateFromUrl === todayStr) {
      newsDay.push(item);
    } else if (dateFromUrl === yesterdayStr || (dateFromUrl && dateFromUrl < yesterdayStr)) {
      newsStrychka.push(item);
    }
  });

  console.log(`[НОВИНИ ДНЯ (${todayStr})] ${newsDay.length} | [СТРІЧКА (вчора/раніше)] ${newsStrychka.length}`);

  // Якщо новин дня менше 6 — доповнюємо вчорашніми
  let top6Day = newsDay.slice(0, 6);
  if (top6Day.length < 6) {
    const needed = 6 - top6Day.length;
    top6Day = [...top6Day, ...newsStrychka.slice(0, needed)];
    newsStrychka = newsStrychka.slice(needed);
  }

  const top6Str = newsStrychka.slice(0, 6);
  const combined = [...top6Day, ...top6Str];

  console.log(`[TOTAL] ${top6Day.length} новин дня + ${top6Str.length} стрічки = ${combined.length} разом`);

  const news: NewsItem[] = await Promise.all(
    combined.map(async (item, i) => {
      const imageUrl = await getNewsImage(item.link);
      console.log(`[${i+1}/12] ${item.title.substring(0,50)} | img: ${imageUrl ? "✓" : "✗"}`);
      return {
        id: `news-${Date.now()}-${i}`,
        title: item.title.substring(0, 150),
        imageUrl,
        link: item.link,
        date: new Date().toLocaleDateString("uk-UA", {
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

    if (cachedNews && now - cachedNews.timestamp < CACHE_DURATION) {
      return NextResponse.json(
        { news: cachedNews.data, cached: true },
        {
          headers: {
            "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
          },
        }
      );
    }

    const news = await scrapeBasketNews();

    if (news.length > 0) {
      cachedNews = { data: news, timestamp: now };
    }

    return NextResponse.json(
      { news: news.length > 0 ? news : [] },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
        },
      }
    );
  } catch (err) {
    console.error("Scrape error:", err);
    return NextResponse.json({ news: [] });
  }
}
