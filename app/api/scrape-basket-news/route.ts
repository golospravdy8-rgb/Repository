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

async function scrapeBasketNews(): Promise<NewsItem[]> {
  const headers = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" };

  // --- БЛОК 1: "НОВИНИ ДНЯ" (кнопки 1-6) ---
  const newsDay: { title: string; link: string }[] = [];
  try {
    const res = await fetch("https://basket.com.ua/", {
      headers,
      signal: AbortSignal.timeout(15000),
    });
    const html = await res.text();
    const $ = cheerio.load(html);

    // Знаходимо секцію НОВИНИ ДНЯ
    $("a").each((_, el) => {
      const link = $(el).attr("href") || "";
      const title = $(el).text().trim();
      const fullLink = link.startsWith("http") ? link : `https://basket.com.ua${link}`;
      if (
        fullLink.includes("basket.com.ua/news/newsday/") &&
        fullLink.split("/").length > 7 && // це конкретна новина, не категорія
        title.length > 10 &&
        !newsDay.find(n => n.link === fullLink)
      ) {
        newsDay.push({ title, link: fullLink });
      }
    });
    console.log(`[НОВИНИ ДНЯ] знайдено: ${newsDay.length}`);
  } catch (e) {
    console.error("[НОВИНИ ДНЯ] помилка:", e);
  }

  // --- БЛОК 2: "СТРІЧКА НОВИН" (кнопки 7-12) ---
  const newsStrychka: { title: string; link: string }[] = [];
  try {
    const strRes = await fetch("https://basket.com.ua/news/newsday/", {
      headers,
      signal: AbortSignal.timeout(15000),
    });
    const strHtml = await strRes.text();
    const $str = cheerio.load(strHtml);

    $str("a[href*='/news/newsday/']").each((_, el) => {
      const link = $str(el).attr("href") || "";
      const title = $str(el).text().trim();
      const fullLink = link.startsWith("http") ? link : `https://basket.com.ua${link}`;
      if (
        fullLink !== "https://basket.com.ua/news/newsday/" &&
        fullLink.split("/").length > 7 &&
        title.length > 10 &&
        !newsStrychka.find(n => n.link === fullLink)
      ) {
        newsStrychka.push({ title, link: fullLink });
      }
    });
    console.log(`[СТРІЧКА НОВИН] знайдено: ${newsStrychka.length}`);
  } catch (e) {
    console.error("[СТРІЧКА НОВИН] помилка:", e);
  }

  const top6Day = newsDay.slice(0, 6);
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
