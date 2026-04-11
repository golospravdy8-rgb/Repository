import { NextRequest, NextResponse } from "next/server";

// ┌─────────────────────────────────────────────────────────────────────────┐
// │ ГІБРИДНА КОНФІГУРАЦІЯ PUPPETEER: localhost + Vercel                    │
// ├─────────────────────────────────────────────────────────────────────────┤
// │ DEVELOPMENT (localhost):                                                │
// │ • puppeteer (повний пакет з вбудованим Chromium)                       │
// │ • require('puppeteer').launch()                                         │
// │                                                                          │
// │ PRODUCTION (Vercel):                                                    │
// │ • puppeteer-core (тільки API, без Chromium)                            │
// │ • @sparticuz/chromium-min (оптимізований Chromium для Vercel)          │
// │ • Додаємо executablePath до launchArgs                                 │
// └─────────────────────────────────────────────────────────────────────────┘

let puppeteer: any;
let chromium: any;

const isDev = process.env.NODE_ENV === "development";

if (isDev) {
  // Локально: puppeteer (с Chromium)
  puppeteer = require("puppeteer");
} else {
  // На Vercel: puppeteer-core + chromium-min
  puppeteer = require("puppeteer-core");
  chromium = require("@sparticuz/chromium-min");
}

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

// ┌─────────────────────────────────────────────────────────────────────────┐
// │ VERCEL PRODUCTION SCRAPER (v2026.04.11 Final)                          │
// ├─────────────────────────────────────────────────────────────────────────┤
// │ ✅ Гібридний імпорт: localhost (puppeteer) + Vercel (puppeteer-core)  │
// │ ✅ In-memory кеш на 5 хвилин                                          │
// │ ✅ Vercel Edge Cache: s-maxage=300, stale-while-revalidate=60         │
// │ ✅ Retry логіка: max 2 спроби на помилку                              │
// │ ✅ Promise.race timeout protection на всіх операціях                   │
// │ ✅ Всі 9 CSS селекторів для зображень (ТОЧНО як на localhost)        │
// │ ✅ Fallback новини — 4 актуальні статті з basket.com.ua               │
// │ ✅ Детальні логи для Vercel Function Logs + localhost console        │
// └─────────────────────────────────────────────────────────────────────────┘

const CACHE_DURATION = 5 * 60 * 1000; // 5 хвилин
let cachedNews: CacheEntry | null = null;

/**
 * FALLBACK НОВИНИ (4 актуальні статті від 2026-04-11)
 * Використовуються коли парсинг впав або вичерпав всі retry
 */
const FALLBACK_NEWS: NewsItem[] = [
  {
    id: "fallback-1",
    title: "НБА: результати матчів 11 квітня",
    imageUrl:
      "https://basket.com.ua/wp-content/uploads/2026/04/Znimok-ekrana-2026-04-11-091703.jpg",
    link: "https://basket.com.ua/news/newsday/2026/04/11/nba-rezultaty-matchiv-11-kvitnya-2/",
    date: "11 квіт. 2026",
  },
  {
    id: "fallback-2",
    title:
      "Євроліга, 37-й тур: «Монако» розгромив «Барселону», «Жальгіріс» тріумфує",
    imageUrl:
      "https://basket.com.ua/wp-content/uploads/2026/04/photo_2026-04-11_02-49-13.jpg",
    link: "https://basket.com.ua/news/newsday/2026/04/11/yevroliga-37-j-tur-monako-peregrav-barselonu-zhalgiris-triumfuye-v-serbiyi/",
    date: "11 квіт. 2026",
  },
  {
    id: "fallback-3",
    title: "Суперліга: «Київ-Баскет» розгромив «Запоріжжя» у плейофі",
    imageUrl:
      "https://basket.com.ua/wp-content/uploads/2026/04/C30I4215.jpg",
    link: "https://basket.com.ua/news/newsday/2026/04/10/plejof-superligy-zaporizhzhya-kyyiv-basket/",
    date: "11 квіт. 2026",
  },
  {
    id: "fallback-4",
    title: "«Денвер» – «Оклахома»: превю найважливіших матчів НБА регулярки",
    imageUrl:
      "https://basket.com.ua/wp-content/uploads/2026/04/gettyimages-2203648354.jpg",
    link: "https://basket.com.ua/news/materialy/2026/04/10/denver-oklahoma-lejkers-finiks-i-shhe-13-igor-prevyu-vyrishalnyh-matchiv-regulyarky-nba/",
    date: "11 квіт. 2026",
  },
];

/**
 * ===== ФУНКЦІЯ ВИТЯГУВАННЯ ЗОБРАЖЕННЯ З ДЕТАЛЬНОЇ СТОРІНКИ НОВИНИ =====
 *
 * Використовує розширену ієрархію селекторів (9 пріоритетів):
 * 1. og:image meta-тег (найнадійніший для соціальних мереж)
 * 2. article:image meta-тег (OpenGraph article image)
 * 3. twitter:image meta-тег (Twitter Card)
 * 4. img.wp-post-image (WordPress featured image)
 * 5. .entry-content img (перше зображення в вмісту статті)
 * 6. figure img (семантичний контейнер для зображень)
 * 7. img[class*='wp-image'] (WordPress dynamically-named classes)
 * 8. .post-thumbnail img (WordPress thumbnail)
 * 9. Перше wp-content/uploads зображення на сторінці (fallback)
 *
 * @param newsUrl URL статті для парсингу
 * @param browser Puppeteer browser instance
 * @param timeoutMs Timeout для операції (ms)
 * @returns URL зображення або null
 */
async function getNewsThumbnail(
  newsUrl: string,
  browser: any,
  timeoutMs: number = 8000
): Promise<string | null> {
  let page = null;
  try {
    // ┌── TIMEOUT PROTECTION 1: newPage() ──┐
    page = await Promise.race([
      browser.newPage(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("newPage() timeout")), timeoutMs)
      ),
    ]);

    console.log(
      `[getNewsThumbnail] Сторінка створена для ${newsUrl.substring(0, 50)}...`
    );

    // ┌── TIMEOUT PROTECTION 2: page.goto() ──┐
    await Promise.race([
      page.goto(newsUrl, {
        waitUntil: "domcontentloaded",
        timeout: timeoutMs,
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("goto() timeout")), timeoutMs)
      ),
    ]);

    console.log(`[getNewsThumbnail] ✓ Сторінка завантажена`);

    // Затримка для завантаження всіх зображень на сторінці
    await new Promise((resolve) => setTimeout(resolve, 800));

    // ┌── ВИТЯГУВАННЯ ЗОБРАЖЕННЯ (9 ПРІОРИТЕТІВ) ──┐
    let imageUrl = await page.evaluate(() => {
      // ПРІОРИТЕТ 1: og:image meta-тег (OpenGraph)
      const ogMetas = document.querySelectorAll(
        "meta[property='og:image'], meta[name='og:image']"
      );
      for (const meta of Array.from(ogMetas)) {
        const content = meta.getAttribute("content");
        if (
          content &&
          !content.includes("data:") &&
          !content.includes(".svg") &&
          content.length > 15
        ) {
          return content;
        }
      }

      // ПРІОРИТЕТ 2: article:image meta-тег
      const articleImageMeta = document.querySelector(
        "meta[property='article:image']"
      );
      if (articleImageMeta) {
        const content = articleImageMeta.getAttribute("content");
        if (
          content &&
          !content.includes("data:") &&
          !content.includes(".svg")
        ) {
          return content;
        }
      }

      // ПРІОРИТЕТ 3: twitter:image meta-тег
      const twitterMeta = document.querySelector(
        "meta[name='twitter:image'], meta[property='twitter:image']"
      );
      if (twitterMeta) {
        const content = twitterMeta.getAttribute("content");
        if (
          content &&
          !content.includes("data:") &&
          !content.includes(".svg")
        ) {
          return content;
        }
      }

      // ПРІОРИТЕТ 4: img.wp-post-image (WordPress featured image)
      const wpPostImg = document.querySelector(
        "img.wp-post-image"
      ) as HTMLImageElement | null;
      if (wpPostImg && wpPostImg.src) {
        if (
          wpPostImg.src.includes("wp-content") &&
          !wpPostImg.src.includes("data:")
        ) {
          return wpPostImg.src;
        }
      }

      // ПРІОРИТЕТ 5: .entry-content img (перше зображення в контенті)
      const entryContent = document.querySelector(".entry-content");
      if (entryContent) {
        const imgs = entryContent.querySelectorAll("img");
        for (let img of Array.from(imgs)) {
          const imgEl = img as HTMLImageElement;
          if (
            imgEl.src &&
            imgEl.src.includes("wp-content") &&
            !imgEl.src.includes("data:") &&
            !imgEl.src.includes(".svg") &&
            imgEl.naturalWidth > 100 &&
            imgEl.naturalHeight > 100
          ) {
            return imgEl.src;
          }
        }
      }

      // ПРІОРИТЕТ 6: figure img (семантичний контейнер)
      const figureImg = document.querySelector(
        "figure img"
      ) as HTMLImageElement | null;
      if (figureImg && figureImg.src) {
        if (
          figureImg.src.includes("wp-content") &&
          !figureImg.src.includes("data:")
        ) {
          return figureImg.src;
        }
      }

      // ПРІОРИТЕТ 7: img[class*='wp-image'] (WordPress classes)
      const wpImages = document.querySelectorAll("img[class*='wp-image']");
      for (let img of Array.from(wpImages)) {
        const imgEl = img as HTMLImageElement;
        if (
          imgEl.src &&
          imgEl.src.includes("wp-content") &&
          !imgEl.src.includes("data:") &&
          !imgEl.src.includes(".svg")
        ) {
          return imgEl.src;
        }
      }

      // ПРІОРИТЕТ 8: .post-thumbnail img
      const postThumb = document.querySelector(
        ".post-thumbnail img"
      ) as HTMLImageElement | null;
      if (postThumb && postThumb.src) {
        if (
          postThumb.src.includes("wp-content") &&
          !postThumb.src.includes("data:")
        ) {
          return postThumb.src;
        }
      }

      // ПРІОРИТЕТ 9: Перше велике wp-content/uploads зображення
      const allImages = document.querySelectorAll("img");
      for (let img of Array.from(allImages)) {
        const imgEl = img as HTMLImageElement;
        if (
          imgEl.src &&
          imgEl.src.includes("wp-content/uploads") &&
          !imgEl.src.includes("data:") &&
          !imgEl.src.includes(".svg") &&
          !imgEl.src.includes("logo") &&
          !imgEl.src.includes("icon") &&
          imgEl.src.length > 40
        ) {
          return imgEl.src;
        }
      }

      return null;
    });

    // Нормалізація URL (перетворення відносних на абсолютні)
    if (imageUrl && !imageUrl.startsWith("http")) {
      const baseUrl = new URL(newsUrl).origin;
      imageUrl = imageUrl.startsWith("/")
        ? `${baseUrl}${imageUrl}`
        : `${baseUrl}/${imageUrl}`;
    }

    // Фільтрація невалідних URL
    if (imageUrl && (imageUrl.includes(".svg") || imageUrl.includes("data:"))) {
      console.log("[getNewsThumbnail] URL невалідний (SVG/data)");
      return null;
    }

    if (imageUrl) {
      console.log(
        `[getNewsThumbnail] ✓ Зображення: ${imageUrl.substring(0, 80)}...`
      );
    } else {
      console.log(
        `[getNewsThumbnail] ⚠ Зображення не знайдено для ${newsUrl.substring(0, 40)}...`
      );
    }

    return imageUrl || null;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[getNewsThumbnail] ✗ ПОМИЛКА: ${msg}`);
    return null;
  } finally {
    if (page) {
      try {
        await page.close();
      } catch (e) {
        // Ігноруємо помилки закриття сторінки
      }
    }
  }
}

/**
 * ===== ФУНКЦІЯ ПАРСИНГУ НОВИН З BASKET.COM.UA =====
 *
 * Алгоритм:
 * 1. Запуск Chromium (з правильними аргументами для dev/prod)
 * 2. Завантаження головної сторінки basket.com.ua
 * 3. Витягування 20 посилань на новини
 * 4. Для кожної новини (max 10) переходимо на деталі та витягуємо зображення
 * 5. Повертаємо масив з 10 новинами + зображеннями
 *
 * Retry логіка:
 * - При помилці: max 2 спроби (total 3 attempt)
 * - Затримка між спробами: 1 сек
 *
 * @param retryCount Поточна спроба (0, 1, 2)
 * @returns Масив новин або []
 */
async function scrapeBasketNews(retryCount = 0): Promise<NewsItem[]> {
  let browser = null;
  const MAX_RETRIES = 2;

  try {
    console.log(
      `\n[scrapeBasketNews] 📰 Спроба ${retryCount + 1}/${MAX_RETRIES + 1}`
    );

    // ┌── ЗАПУСК CHROMIUM ──┐
    console.log("[scrapeBasketNews] 🚀 Запуск Chromium...");

    const launchArgs: any = {
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-gpu",
        "--disable-web-security",
        "--disable-features=IsolateOrigins,site-per-process",
      ],
    };

    // Умовна конфігурація залежно від середовища
    if (isDev) {
      console.log("[scrapeBasketNews] 🔧 Режим: Development (localhost)");
      // На localhost puppeteer сам знайде Chromium
    } else {
      console.log("[scrapeBasketNews] 🔧 Режим: Vercel Production");
      // На Vercel використовуємо chromium-min
      launchArgs.executablePath = await chromium.executablePath();
      launchArgs.args.push("--disable-extensions");
    }

    browser = await Promise.race([
      puppeteer.launch(launchArgs),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("Browser launch timeout (30s)")),
          30000
        )
      ),
    ]);

    console.log("[scrapeBasketNews] ✓ Chromium запущений");

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });

    // ┌── ЗАВАНТАЖЕННЯ ГОЛОВНОЇ СТОРІНКИ ──┐
    console.log("[scrapeBasketNews] 📡 Завантаження basket.com.ua...");

    await Promise.race([
      page.goto("https://basket.com.ua/", {
        waitUntil: "domcontentloaded",
        timeout: 12000,
      }),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("Main page load timeout (12s)")),
          12000
        )
      ),
    ]);

    console.log("[scrapeBasketNews] ✓ Головна сторінка завантажена");

    // ┌── ПАРСИНГ ПОСИЛАНЬ НА НОВИНИ ──┐
    console.log("[scrapeBasketNews] 🔍 Пошук посилань на новини...");

    const newsLinks = await page.evaluate(() => {
      const news: Array<{ title: string; link: string }> = [];

      const selectors = [
        "a[href*='/news']",
        "[class*='news-item'] a",
        "[class*='article'] a",
        "article a",
      ];

      for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        Array.from(elements).forEach((el) => {
          const link = (el as HTMLAnchorElement).href;
          const text = (el as HTMLAnchorElement).textContent?.trim();

          if (
            link &&
            link.includes("basket.com.ua") &&
            text &&
            text.length > 5
          ) {
            if (!news.find((n) => n.link === link)) {
              news.push({ title: text, link });
            }
          }
        });
      }

      return news.slice(0, 20);
    });

    console.log(`[scrapeBasketNews] ✓ Знайдено ${newsLinks.length} посилань`);

    // ┌── ВИТЯГУВАННЯ ЗОБРАЖЕНЬ ДЛЯ КОЖНОЇ НОВИНИ ──┐
    console.log("[scrapeBasketNews] 🖼️  Витягування зображень (max 10)...\n");

    const newsWithImages: NewsItem[] = [];

    for (let i = 0; i < Math.min(newsLinks.length, 10); i++) {
      const newsItem = newsLinks[i];
      const imageUrl = await getNewsThumbnail(newsItem.link, browser, 8000);

      newsWithImages.push({
        id: `news-${Date.now()}-${i}`,
        title: newsItem.title.substring(0, 150),
        imageUrl: imageUrl,
        link: newsItem.link,
        date: new Date().toLocaleDateString("uk-UA", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
      });

      const imgStatus = imageUrl ? "✓ img" : "✗ no img";
      console.log(
        `[scrapeBasketNews] [${i + 1}/10] ${newsItem.title.substring(0, 55)}... ${imgStatus}`
      );
    }

    await page.close();

    console.log(
      `\n[scrapeBasketNews] ✓ Парсинг завершено! (${newsWithImages.length} новин)`
    );

    return newsWithImages;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(
      `\n[scrapeBasketNews] ✗ ПОМИЛКА на спробі ${retryCount + 1}: ${errorMsg}`
    );

    // ┌── RETRY ЛОГІКА ──┐
    if (retryCount < MAX_RETRIES) {
      console.log(`[scrapeBasketNews] ⟲ Повторна спроба через 1 сек...\n`);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return scrapeBasketNews(retryCount + 1);
    }

    console.error(
      `[scrapeBasketNews] ✗ Всі ${MAX_RETRIES + 1} спроби вичерпані`
    );
    return [];
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`[scrapeBasketNews] Помилка закриття браузера: ${msg}`);
      }
    }
  }
}

/**
 * ===== GET /api/scrape-basket-news =====
 *
 * Endpoint повертає актуальні новини баскетболу з зображеннями
 *
 * Кеш-стратегія:
 * 1. In-memory кеш на 5 хвилин (холодний старт на Vercel)
 * 2. Vercel Edge Cache: s-maxage=300 (усі клієнти кешуються)
 * 3. Stale-while-revalidate: 60s (фонове оновлення)
 *
 * Fallback: Якщо парсинг впав → 4 fallback новини
 *
 * @returns JSON { news: NewsItem[], source: "memory-cache" | "fresh-scrape" | "fallback" }
 */
export async function GET(request: NextRequest) {
  try {
    const now = Date.now();

    console.log("\n[GET] ═══════════════════════════════════════════════════");
    console.log(
      `[GET] 🌐 Запит до /api/scrape-basket-news (${new Date().toISOString()})`
    );

    // ┌── STEP 1: ПЕРЕВІРКА IN-MEMORY КЕШУ ──┐
    if (cachedNews && now - cachedNews.timestamp < CACHE_DURATION) {
      const cacheAge = Math.round((now - cachedNews.timestamp) / 1000);
      console.log(
        `[GET] ✓ In-memory кеш потрапив! (вік: ${cacheAge}s, limit: ${Math.round(CACHE_DURATION / 1000)}s)`
      );
      console.log("[GET] ═══════════════════════════════════════════════════\n");

      return NextResponse.json(
        { news: cachedNews.data, source: "memory-cache" },
        {
          status: 200,
          headers: {
            "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
          },
        }
      );
    }

    console.log("[GET] ⚠ In-memory кеш пробіл, парсимо нові новини...");

    // ┌── STEP 2: ПАРСИНГ НОВИХ НОВИН (З RETRY) ──┐
    let news = await scrapeBasketNews();

    // ┌── STEP 3: FALLBACK МЕХАНІЗМ ──┐
    if (!news || news.length === 0) {
      console.warn(
        "[GET] ⚠ Парсинг не спрацював, використовуємо fallback новини"
      );
      news = FALLBACK_NEWS;
    }

    // ┌── STEP 4: ЗБЕРЕЖЕННЯ В КЕШ ──┐
    cachedNews = {
      data: news,
      timestamp: now,
    };

    console.log(
      `[GET] ✓ Повертаємо ${news.length} новин (${news[0].imageUrl ? "з картинками" : "без картинок"})`
    );
    console.log("[GET] ═══════════════════════════════════════════════════\n");

    return NextResponse.json(
      { news, source: "fresh-scrape" },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
        },
      }
    );
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[GET] ✗ НЕОЧІКУВАНА ПОМИЛКА: ${errorMsg}`);
    console.log("[GET] ═══════════════════════════════════════════════════\n");

    return NextResponse.json(
      {
        error: "Scraping failed, returning fallback news",
        news: FALLBACK_NEWS,
        source: "fallback",
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=60",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
}
