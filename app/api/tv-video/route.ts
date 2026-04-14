import { NextResponse } from "next/server";
import * as cheerio from "cheerio";

interface Server {
  name: string;
  parts: { label: string; url: string }[];
  watchUrl?: string;
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

    // Якщо просимо частину - повертаємо видео прямо
    if (part && part.startsWith("part")) {
      for (const server of servers) {
        const partIndex = parseInt(part.replace("part", ""));
        if (server.parts[partIndex - 1]) {
          const videoUrl = server.parts[partIndex - 1].url;
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

    // Якщо просимо конкретний watchUrl напряму
    if (part && typeof part === "string" && part.startsWith("http")) {
      return NextResponse.json({
        videoUrl: part,
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
