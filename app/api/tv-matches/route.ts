import { NextResponse } from "next/server";
import * as cheerio from "cheerio";

let cache: { data: unknown; ts: number } | null = null;

export async function GET() {
  if (cache && Date.now() - cache.ts < 3600000) {
    return NextResponse.json(cache.data);
  }
  try {
    const res = await fetch("https://watchreplay.net/", {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
      signal: AbortSignal.timeout(12000),
    });
    const html = await res.text();
    const $ = cheerio.load(html);
    const matches: { id: string; title: string; url: string; date: string }[] = [];

    $("a[href]").each((_, el) => {
      const href = $(el).attr("href") || "";
      const text = $(el).text().trim();
      const fullUrl = href.startsWith("http") ? href : `https://watchreplay.net${href}`;
      if (
        fullUrl.includes("watchreplay.net") &&
        (href.includes("-vs-") || href.includes("_vs_")) &&
        text.length > 5 &&
        !matches.find((m) => m.url === fullUrl)
      ) {
        const slug = href.split("/").filter(Boolean).pop() || "";
        matches.push({
          id: slug,
          title: text.substring(0, 80),
          url: fullUrl,
          date: "",
        });
      }
    });

    const result = { matches: matches.slice(0, 20) };
    cache = { data: result, ts: Date.now() };
    return NextResponse.json(result);
  } catch (e) {
    console.error("tv-matches error:", e);
    return NextResponse.json({ matches: [] });
  }
}
