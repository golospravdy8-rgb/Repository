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
  const res = await fetch("https://basket.com.ua/", {
    headers: { "User-Agent": "Mozilla/5.0" },
    signal: AbortSignal.timeout(12000),
  });
  const html = await res.text();
  const $ = cheerio.load(html);

  const links: { title: string; link: string }[] = [];

  // Стрічка новин — секція з усіма останніми новинами
  $(".news-feed a, .news-list a, .feed a, [class*='feed'] a, [class*='news-item'] a").each((_, el) => {
    const link = $(el).attr("href") || "";
    const title = $(el).text().trim();
    if (
      link.includes("basket.com.ua/news/") &&
      title.length > 10 &&
      !links.find((n) => n.link === link)
    ) {
      links.push({ title, link });
    }
  });

  // Якщо нічого не знайшло — fallback на всі /news/
  if (links.length === 0) {
    $("a").each((_, el) => {
      const link = $(el).attr("href") || "";
      const title = $(el).text().trim();
      if (
        link.includes("basket.com.ua/news/") &&
        title.length > 10 &&
        !links.find((n) => n.link === link)
      ) {
        links.push({ title, link });
      }
    });
  }

  const top10 = links.slice(0, 12);

  const news: NewsItem[] = await Promise.all(
    top10.map(async (item, i) => {
      const imageUrl = await getNewsImage(item.link);
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

  return news.filter((n) => n.title.length > 5);
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
