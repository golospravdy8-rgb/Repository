export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getSettings } from "@/lib/site-settings";

const BROWSER_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept-Language": "uk-UA,uk;q=0.9,en;q=0.8",
};

/**
 * Check for live stream using YouTube Data API v3
 * MOST RELIABLE: Validates that video is from our channel
 */
async function checkWithYouTubeAPI(
  channelId: string,
  apiKey: string
): Promise<{ id: string; title: string } | null> {
  try {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&eventType=live&type=video&key=${apiKey}`,
      { cache: "no-store" }
    );
    const data = await res.json();

    if (data.error) {
      console.error(`[stream] YouTube API error: ${data.error.message}`);
      return null;
    }

    if (data.items && data.items.length > 0) {
      const item = data.items[0];

      // CRITICAL: Verify video is from OUR channel
      if (item.snippet.channelId !== channelId) {
        console.error(`[stream] ⚠️ WARNING: Found video from WRONG channel! Expected ${channelId}, got ${item.snippet.channelId}`);
        return null;
      }

      console.log(`[stream] ✅ Live found via API: ${item.id.videoId}`);
      return {
        id: item.id.videoId,
        title: item.snippet.title,
      };
    }

    return null;
  } catch (e) {
    console.error(`[stream] YouTube API failed: ${e}`);
    return null;
  }
}

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
 * Check for live stream via multiple methods:
 * 1. Direct /live page with improved detection
 * 2. Check for common broadcast patterns in JSON
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

    // Enhanced live detection — multiple patterns YouTube uses
    const isLiveNow = html.includes('"isLiveNow":true');
    const isLiveStatus = html.includes('"status":"LIVE"') || html.includes('isLiveContent":true');
    const hasLiveKeyword = html.includes('"isLive":true') || html.includes('liveNow');
    const hasLiveHeader = html.includes('data-app-index="3"');

    // Check for livestream data in initialData
    const hasBroadcastData = html.includes('broadcastStatus') &&
                            (html.includes('"LIVE"') || html.includes('currentBroadcastMonitor'));

    if (!isLiveNow && !isLiveStatus && !hasLiveKeyword && !hasLiveHeader && !hasBroadcastData) {
      return null;
    }

    // Extract video ID — try multiple patterns
    const videoIdMatch = html.match(/"videoId":"([^"]{11})"/) ||
                        html.match(/"video_id":"([^"]{11})"/) ||
                        html.match(/watch\?v=([^"&]{11})/) ||
                        html.match(/\/watch\?v=([A-Za-z0-9_-]{11})/);

    if (!videoIdMatch) return null;

    // Extract title — try multiple patterns
    const titleMatch = html.match(/"videoDetails":\{[^}]*"title":"([^"]+)"/) ||
      html.match(/"title":\{"simpleText":"([^"]+)"/) ||
      html.match(/"title":"([^"]+)".*?"isLive/) ||
      html.match(/<title>([^<|]+)/);

    const title = titleMatch ? titleMatch[1].replace(/\\u0026/g, "&").trim() : "";

    console.log(`[stream] Live detected via channel page: ${videoIdMatch[1]} - ${title}`);
    return { id: videoIdMatch[1], title };
  } catch (e) {
    console.log(`[stream] Channel page check failed: ${e}`);
    return null;
  }
}

/**
 * Additional check: monitor YouTube's /live page for redirect
 * If /channel/ID/live redirects to a video page, stream is likely active
 */
async function checkLivePageRedirect(channelId: string): Promise<{ id: string; title: string } | null> {
  try {
    const response = await fetch(
      `https://www.youtube.com/channel/${channelId}/live`,
      {
        cache: "no-store",
        headers: BROWSER_HEADERS,
        redirect: "manual", // Don't follow redirects automatically
      }
    );

    // If response is 302/303/307/308, user was redirected to active stream
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (location) {
        console.log(`[stream] Redirect detected: ${location}`);
        const videoIdMatch = location.match(/v=([A-Za-z0-9_-]{11})/);
        if (videoIdMatch) {
          return { id: videoIdMatch[1], title: "Live Stream" };
        }
      }
    }

    return null;
  } catch (e) {
    console.log(`[stream] Redirect check failed: ${e}`);
    return null;
  }
}

export async function GET() {
  const settings = await getSettings(["stream.enabled", "stream.youtubeChannelId", "stream.youtubeApiKey"]);

  const enabled = settings["stream.enabled"] === "true";
  const channelId = settings["stream.youtubeChannelId"] || "";
  const apiKey = settings["stream.youtubeApiKey"] || process.env.YOUTUBE_API_KEY || "";

  if (!enabled || !channelId) {
    return NextResponse.json({ isLive: false, videoId: null });
  }

  try {
    console.log(`[stream] Starting detection for ${channelId}`);
    let liveVideo = null;

    // Strategy 1: YouTube Data API v3 (MOST RELIABLE — validates channel ID)
    if (apiKey) {
      console.log(`[stream] Attempting YouTube API detection...`);
      liveVideo = await checkWithYouTubeAPI(channelId, apiKey);
      if (liveVideo) {
        console.log(`[stream] ✅ Live stream DETECTED via API: ${liveVideo.id} - ${liveVideo.title}`);
        return NextResponse.json({ isLive: true, videoId: liveVideo.id, title: liveVideo.title });
      }
    } else {
      console.warn(`[stream] ⚠️ YouTube API key not configured, falling back to RSS/HTML methods`);
    }

    // Strategy 2: Try RSS (fast, no API key needed)
    console.log(`[stream] Attempting RSS detection...`);
    liveVideo = await getLiveViaRSS(channelId);
    if (liveVideo) {
      console.log(`[stream] ✅ Live stream DETECTED via RSS: ${liveVideo.id} - ${liveVideo.title}`);
      return NextResponse.json({ isLive: true, videoId: liveVideo.id, title: liveVideo.title });
    }

    // Strategy 3: Direct channel page check with enhanced detection
    console.log(`[stream] Attempting channel page detection...`);
    liveVideo = await getLiveViaChannelPage(channelId);
    if (liveVideo) {
      console.log(`[stream] ✅ Live stream DETECTED via channel page: ${liveVideo.id} - ${liveVideo.title}`);
      return NextResponse.json({ isLive: true, videoId: liveVideo.id, title: liveVideo.title });
    }

    // Strategy 4: Check for /live page redirect (indicates active stream)
    console.log(`[stream] Attempting redirect detection...`);
    liveVideo = await checkLivePageRedirect(channelId);
    if (liveVideo) {
      console.log(`[stream] ✅ Live stream DETECTED via redirect: ${liveVideo.id} - ${liveVideo.title}`);
      return NextResponse.json({ isLive: true, videoId: liveVideo.id, title: liveVideo.title });
    }

    console.log(`[stream] ❌ No active stream detected for ${channelId}`);
    return NextResponse.json({ isLive: false, videoId: null });
  } catch (e) {
    console.error(`[stream] ❌ Unexpected error: ${e}`);
    return NextResponse.json({ isLive: false, videoId: null, error: "fetch_failed" });
  }
}
