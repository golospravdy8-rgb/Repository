import { NextResponse } from "next/server";
import { getSettings } from "@/lib/site-settings";

export const dynamic = "force-dynamic";

const BROWSER_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept-Language": "uk-UA,uk;q=0.9,en;q=0.8",
};

// In-memory cache for channel handle (refreshed every hour)
let cachedHandle: { handle: string; channelId: string; fetchedAt: number } | null = null;

async function getChannelHandle(channelId: string): Promise<string | null> {
  const now = Date.now();
  if (cachedHandle && cachedHandle.channelId === channelId && now - cachedHandle.fetchedAt < 3600_000) {
    return cachedHandle.handle;
  }
  try {
    const res = await fetch(`https://www.youtube.com/channel/${channelId}`, {
      cache: "no-store",
      headers: BROWSER_HEADERS,
    });
    if (!res.ok) return null;
    const html = await res.text();
    const handles = [...html.matchAll(/"(@[a-zA-Z0-9_.-]+)"/g)].map(m => m[1]);
    const handle = handles.find(h => h !== "@youtube" && h !== "@YouTube" && h.length > 3);
    if (handle) {
      cachedHandle = { handle, channelId, fetchedAt: now };
      return handle;
    }
    return null;
  } catch {
    return null;
  }
}

// Check channel's /@handle/live page — shows active stream if one exists.
// Returns videoId + title if live, null otherwise.
async function getLiveFromChannelPage(channelId: string): Promise<{ id: string; title: string } | null> {
  try {
    const handle = await getChannelHandle(channelId);
    const liveUrl = handle
      ? `https://www.youtube.com/${handle}/live`
      : `https://www.youtube.com/channel/${channelId}/live`;

    const res = await fetch(liveUrl, {
      cache: "no-store",
      headers: BROWSER_HEADERS,
      redirect: "follow",
    });
    if (!res.ok) return null;
    const html = await res.text();

    if (!html.includes('"isLiveNow":true')) return null;

    const videoIdMatch = html.match(/"videoId":"([^"]{11})"/) || html.match(/watch\?v=([^"&]{11})/);
    if (!videoIdMatch) return null;

    // Try to get a clean title from videoDetails
    const titleMatch = html.match(/"videoDetails":\{[^}]*"title":"([^"]+)"/) ||
      html.match(/"title":\{"runs":\[\{"text":"([^"]+)"/) ||
      html.match(/<title>([^<|]+)/);
    const title = titleMatch ? titleMatch[1].replace(/\\u0026/g, "&").trim() : "";

    return { id: videoIdMatch[1], title };
  } catch {
    return null;
  }
}

export async function GET() {
  const settings = await getSettings(["stream.enabled", "stream.youtubeChannelId"]);

  const enabled = settings["stream.enabled"] === "true";
  const channelId = settings["stream.youtubeChannelId"] || "";

  if (!enabled || !channelId) {
    return NextResponse.json({ isLive: false, videoId: null });
  }

  try {
    const liveVideo = await getLiveFromChannelPage(channelId);
    if (liveVideo) {
      return NextResponse.json({ isLive: true, videoId: liveVideo.id, title: liveVideo.title });
    }
    return NextResponse.json({ isLive: false, videoId: null });
  } catch {
    return NextResponse.json({ isLive: false, videoId: null, error: "fetch_failed" });
  }
}
