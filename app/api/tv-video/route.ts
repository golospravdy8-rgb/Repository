import { NextResponse } from "next/server";
import * as cheerio from "cheerio";

interface Server {
  name: string;
  parts: { label: string; url: string }[];
  watchUrl?: string;
}

/**
 * Витягує прямий iframe src з сторінки (ok.ru, dailymotion, youtube, тощо)
 * Агресивний пошук: iframe → регулярні вирази → meta tags → скрипти
 */
async function extractEmbedUrl(pageUrl: string): Promise<string | null> {
  try {
    const res = await fetch(pageUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        "Referer": "https://basketball-video.com/",
      },
      signal: AbortSignal.timeout(8000),
    });
    const html = await res.text();
    const $ = cheerio.load(html);

    console.log(`[TV] extractEmbedUrl: parsing ${pageUrl.substring(0, 80)}`);

    // 1. Шукаємо всі iframe src (не лише першу)
    const iframes: string[] = [];
    $('iframe[src]').each((_, el) => {
      let src = $(el).attr('src') || '';
      if (src.startsWith('//')) src = 'https:' + src;
      if (src.startsWith('http')) iframes.push(src);
    });

    // Пріоритет: ok.ru > dailymotion > youtube > інші
    for (const src of iframes) {
      if (src.includes('ok.ru/videoembed')) {
        console.log(`[TV] Found OK.ru embed: ${src.substring(0, 70)}`);
        return src;
      }
    }
    for (const src of iframes) {
      if (src.includes('dailymotion.com') && src.includes('/embed/')) {
        console.log(`[TV] Found Dailymotion embed: ${src.substring(0, 70)}`);
        return src;
      }
    }
    for (const src of iframes) {
      if (src.includes('youtube.com/embed') || src.includes('youtu.be')) {
        console.log(`[TV] Found YouTube embed: ${src.substring(0, 70)}`);
        return src;
      }
    }
    for (const src of iframes) {
      if (src.length > 0) {
        console.log(`[TV] Found generic iframe: ${src.substring(0, 70)}`);
        return src;
      }
    }

    // 2. Шукаємо в HTML атрибутах (data-src, src= у div тощо)
    const dataSrcMatch = html.match(/data-src=["']([^"']*(?:ok\.ru|dailymotion|youtube|youtu\.be)[^"']*)/i);
    if (dataSrcMatch && dataSrcMatch[1]) {
      let url = dataSrcMatch[1];
      if (url.startsWith('//')) url = 'https:' + url;
      console.log(`[TV] Found data-src: ${url.substring(0, 70)}`);
      return url;
    }

    // 3. Шукаємо в скриптах (js змінні, json, тощо)
    const scripts = $('script').text();

    // OK.ru
    let match = scripts.match(/["']([^"']*ok\.ru\/videoembed\/\d+[^"']*)/i);
    if (match && match[1]) {
      console.log(`[TV] Found OK.ru in script: ${match[1].substring(0, 70)}`);
      return match[1];
    }

    // Dailymotion embed
    match = scripts.match(/["']([^"']*dailymotion\.com\/embed\/[^"']*)/i);
    if (match && match[1]) {
      console.log(`[TV] Found Dailymotion in script: ${match[1].substring(0, 70)}`);
      return match[1];
    }

    // YouTube
    match = scripts.match(/["']([^"']*youtube\.com\/embed\/[^"']*)/i);
    if (match && match[1]) {
      console.log(`[TV] Found YouTube in script: ${match[1].substring(0, 70)}`);
      return match[1];
    }

    // Будь-яке посилання на embed-сервіс
    match = scripts.match(/["']?(https?:\/\/[^\s"'<>]+\/(?:embed|videoembed)\/[^\s"'<>]*)/i);
    if (match && match[1]) {
      console.log(`[TV] Found generic embed: ${match[1].substring(0, 70)}`);
      return match[1];
    }

    // 4. Шукаємо у meta tags (og:video, twitter:player)
    const ogVideo = $('meta[property="og:video"]').attr('content');
    if (ogVideo && (ogVideo.includes('embed') || ogVideo.includes('videoembed'))) {
      console.log(`[TV] Found og:video: ${ogVideo.substring(0, 70)}`);
      return ogVideo;
    }

    // 5. Шукаємо src= у будь-яких HTML елементах (іноді embed в div)
    const allSrcs = $('[src*="embed"], [src*="videoembed"]').map((_, el) => $(el).attr('src')).get();
    for (const src of allSrcs) {
      if (src && src.startsWith('http')) {
        console.log(`[TV] Found src attribute: ${src.substring(0, 70)}`);
        return src;
      }
    }

    console.log('[TV] No embed URL found, returning null');
    return null;
  } catch (e) {
    console.error('[TV] extractEmbedUrl error:', e);
    return null;
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");
  const part = searchParams.get("part"); // "part1", "part2" або null для першого

  if (!url) return NextResponse.json({ videoUrl: null, type: null, servers: [] });

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        "Referer": "https://basketball-video.com/",
      },
      signal: AbortSignal.timeout(10000),
    });
    const html = await res.text();
    const $ = cheerio.load(html);

    // Парсимо basketball-video.com формат (Server #1, Server #2 (DM), Part 1/Part 2)
    const servers: Server[] = [];
    let currentServer: Server | null = null;

    // Ищемо текст з "Server #X" или "Part X"
    $("p").each((_, el) => {
      const text = $(el).text().trim();
      const link = $(el).find("a").attr("href");

      if (text.match(/Server\s*#\d+/i)) {
        if (currentServer) servers.push(currentServer);
        const serverNum = text.match(/Server\s*#(\d+)/i)?.[1] || "?";
        const isDM = text.includes("(DM)");
        currentServer = {
          name: isDM ? `Server #${serverNum} (DM)` : `Server #${serverNum}`,
          parts: [],
        };
      } else if (text.match(/Part\s*\d+/i) && currentServer) {
        const partNum = text.match(/Part\s*(\d+)/i)?.[1] || "?";
        if (link) {
          currentServer.parts.push({
            label: `Part ${partNum}`,
            url: link,
          });
        }
      } else if (text.match(/Watch/i) && currentServer && link) {
        if (currentServer.parts.length === 0) {
          currentServer.watchUrl = link;
        }
      }
    });

    if (currentServer) servers.push(currentServer);

    console.log(`[TV] Parsed ${servers.length} servers from basketball-video.com`);

    // Витягаємо прямі embed URLs з watchUrl (без частин)
    // щоб замість повної сторінки завантажувати чистий плеєр
    for (const server of servers) {
      if (server.watchUrl && server.parts.length === 0) {
        const embedUrl = await extractEmbedUrl(server.watchUrl);
        if (embedUrl) {
          server.watchUrl = embedUrl;
          console.log(`[TV] Extracted embed URL: ${embedUrl.substring(0, 50)}...`);
        }
      }
    }

    // Якщо просимо частину - повертаємо видео прямо
    if (part && part.startsWith("part")) {
      for (const server of servers) {
        const partIndex = parseInt(part.replace("part", ""));
        if (server.parts[partIndex - 1]) {
          const partUrl = server.parts[partIndex - 1].url;
          // Спробуємо витягти прямий embed URL з сторінки
          const embedUrl = await extractEmbedUrl(partUrl);
          const videoUrl = embedUrl || partUrl;
          return NextResponse.json({
            videoUrl,
            type: "external",
            servers,
            currentPart: part,
            message: "Part loaded successfully",
          });
        }
      }
    }

    // Якщо просимо конкретний watchUrl напряму (з кнопки "Відкрити")
    if (part && typeof part === "string" && part.startsWith("http")) {
      // Витягаємо прямий embed URL замість повної сторінки
      const embedUrl = await extractEmbedUrl(part);
      return NextResponse.json({
        videoUrl: embedUrl || part,
        type: "external",
        servers,
        message: "Watch URL loaded as iframe",
      });
    }

    // Стара логіка для watchreplay.net (iframe, video, scripts)
    const iframeSrc = $("iframe[src]").first().attr("src");
    if (iframeSrc && iframeSrc.startsWith("http")) {
      return NextResponse.json({
        videoUrl: iframeSrc,
        type: "iframe",
        servers,
      });
    }

    const videoSrc =
      $("video source[src]").first().attr("src") ||
      $("video[src]").first().attr("src");
    if (videoSrc) {
      const type = videoSrc.includes(".m3u8") ? "m3u8" : "mp4";
      return NextResponse.json({
        videoUrl: videoSrc,
        type,
        servers,
      });
    }

    const scripts = $("script").map((_, el) => $(el).html() || "").get().join(" ");
    const m3u8Match = scripts.match(/https?:\/\/[^"'\s]+\.m3u8/);
    if (m3u8Match) {
      return NextResponse.json({
        videoUrl: m3u8Match[0],
        type: "m3u8",
        servers,
      });
    }
    const mp4Match = scripts.match(/https?:\/\/[^"'\s]+\.mp4/);
    if (mp4Match) {
      return NextResponse.json({
        videoUrl: mp4Match[0],
        type: "mp4",
        servers,
      });
    }

    // Якщо ничего не знайшли - повертаємо сервери для вибору
    if (servers.length > 0) {
      return NextResponse.json({
        videoUrl: null,
        type: null,
        servers,
        message: "Select a server and part",
      });
    }

    return NextResponse.json({
      videoUrl: null,
      type: null,
      servers: [],
    });
  } catch (e) {
    console.error("tv-video error:", e);
    return NextResponse.json({
      videoUrl: null,
      type: null,
      servers: [],
    });
  }
}
