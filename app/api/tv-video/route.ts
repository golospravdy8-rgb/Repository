import { NextResponse } from "next/server";
import * as cheerio from "cheerio";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");
  if (!url) return NextResponse.json({ videoUrl: null, type: null });

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        "Referer": "https://watchreplay.net/",
      },
      signal: AbortSignal.timeout(10000),
    });
    const html = await res.text();
    const $ = cheerio.load(html);

    // 1. iframe
    const iframeSrc = $("iframe[src]").first().attr("src");
    if (iframeSrc && iframeSrc.startsWith("http")) {
      return NextResponse.json({ videoUrl: iframeSrc, type: "iframe" });
    }

    // 2. video/source
    const videoSrc =
      $("video source[src]").first().attr("src") ||
      $("video[src]").first().attr("src");
    if (videoSrc) {
      const type = videoSrc.includes(".m3u8") ? "m3u8" : "mp4";
      return NextResponse.json({ videoUrl: videoSrc, type });
    }

    // 3. regex in scripts
    const scripts = $("script").map((_, el) => $(el).html() || "").get().join(" ");
    const m3u8Match = scripts.match(/https?:\/\/[^"'\s]+\.m3u8/);
    if (m3u8Match) {
      return NextResponse.json({ videoUrl: m3u8Match[0], type: "m3u8" });
    }
    const mp4Match = scripts.match(/https?:\/\/[^"'\s]+\.mp4/);
    if (mp4Match) {
      return NextResponse.json({ videoUrl: mp4Match[0], type: "mp4" });
    }

    return NextResponse.json({ videoUrl: null, type: null });
  } catch (e) {
    console.error("tv-video error:", e);
    return NextResponse.json({ videoUrl: null, type: null });
  }
}
