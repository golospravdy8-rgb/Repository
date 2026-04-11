export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getSettings } from "@/lib/site-settings";

const BROWSER_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept-Language": "uk-UA,uk;q=0.9,en;q=0.8",
};

/**
 * Get live stream info via YouTube RSS feed
 * RSS shows video metadata including live/upcoming videos
 * Parse <yt:videoId> and check if it's currently active via /live endpoint
 */
async function getLiveViaRSS(channelId: string): Promise<{ id: string; title: string } | null> {
  try {
    const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
    const res = await fetch(rssUrl, { cache: "no-store" });
    if (!res.ok) return null;

    const xml = await res.text();

    // Extract video ID from most recent entry: <yt:videoId>XXXXXXXXXX</yt:videoId>
    const videoIdMatch = xml.match(/<yt:videoId>([^<]+)<\/yt:videoId>/);
    if (!videoIdMatch) return null;

    const videoId = videoIdMatch[1];
    const titleMatch = xml.match(/<title>([^<]+)<\/title>/);
    const title = titleMatch ? titleMatch[1] : "";

    // Now check if this video is actually live right now by fetching the /live page
    // YouTube redirects /channel/ID/live to the active livestream if one exists
    try {
      const livePageRes = await fetch(
        `https://www.youtube.com/channel/${channelId}/live`,
        { cache: "no-store", headers: BROWSER_HEADERS, redirect: "follow" }
      );
      if (livePageRes.ok) {
        const html = await livePageRes.text();
        // Check if page contains data indicating an active stream
        // Look for "isLiveNow" or other indicators
        const isLive = html.includes('"isLiveNow":true') ||
                       html.includes('"status":"LIVE"') ||
                       html.includes('data-app-index="3"'); // live header structure

        if (isLive) {
          // Extract title from page if available
          const pageTitle = html.match(/"title":\{"simpleText":"([^"]+)"/) ||
                           html.match(/"title":"([^"]+)"/) ||
                           titleMatch;
          return {
            id: videoId,
            title: pageTitle ? pageTitle[1] : title,
          };
        }
      }
    } catch (e) {
      console.log(`[stream] Could not verify live status via page: ${e}`);
    }

    return null;
  } catch (e) {
    console.log(`[stream] RSS fetch failed: ${e}`);
    return null;
  }
}

/**
 * Fallback: check /channel/ID/live page directly for active stream
 */
async function getLiveViaChannelPage(channelId: string): Promise<{ id: string; title: string } | null> {
  try {
    const liveUrl = `https://www.youtube.com/channel/${channelId}/live`;
    const res = await fetch(liveUrl, {
      cache: "no-store",
      headers: BROWSER_HEADERS,
      redirect: "follow",
    });
    if (!res.ok) return null;

    const html = await res.text();

    // Multiple ways YouTube indicates live stream:
    const isLiveNow = html.includes('"isLiveNow":true');
    const isLiveStatus = html.includes('"status":"LIVE"');
    const hasLiveHeader = html.includes('data-app-index="3"');

    if (!isLiveNow && !isLiveStatus && !hasLiveHeader) {
      return null;
    }

    // Extract video ID
    const videoIdMatch = html.match(/"videoId":"([^"]{11})"/) ||
                        html.match(/watch\?v=([^"&]{11})/);
    if (!videoIdMatch) return null;

    // Extract title
    const titleMatch = html.match(/"videoDetails":\{[^}]*"title":"([^"]+)"/) ||
      html.match(/"title":\{"simpleText":"([^"]+)"/) ||
      html.match(/<title>([^<|]+)/);

    const title = titleMatch ? titleMatch[1].replace(/\\u0026/g, "&").trim() : "";

    return { id: videoIdMatch[1], title };
  } catch (e) {
    console.log(`[stream] Channel page check failed: ${e}`);
    return null;
  }
}

export async function GET() {
  // TESTING: Mock live stream for debugging
  if (process.env.TEST_LIVE === "true") {
    console.log("[stream] TEST_LIVE=true — returning mock live stream");
    return NextResponse.json({
      isLive: true,
      videoId: "dQw4w9WgXcQ",
      title: "Test Live Stream - Basketball",
    });
  }

  const settings = await getSettings(["stream.enabled", "stream.youtubeChannelId"]);

  const enabled = settings["stream.enabled"] === "true";
  const channelId = settings["stream.youtubeChannelId"] || "";

  if (!enabled || !channelId) {
    return NextResponse.json({ isLive: false, videoId: null });
  }

  try {
    // Try RSS first (faster, more reliable)
    let liveVideo = await getLiveViaRSS(channelId);

    // Fallback to direct channel page check
    if (!liveVideo) {
      liveVideo = await getLiveViaChannelPage(channelId);
    }

    if (liveVideo) {
      console.log(`[stream] Live detected: ${liveVideo.id} - ${liveVideo.title}`);
      return NextResponse.json({ isLive: true, videoId: liveVideo.id, title: liveVideo.title });
    }

    console.log(`[stream] No active stream detected for ${channelId}`);
    return NextResponse.json({ isLive: false, videoId: null });
  } catch (e) {
    console.error(`[stream] Unexpected error: ${e}`);
    return NextResponse.json({ isLive: false, videoId: null, error: "fetch_failed" });
  }
}
