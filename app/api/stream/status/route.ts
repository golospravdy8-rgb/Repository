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
 * RSS shows recent videos but doesn't indicate live status
 * Try to validate via API, but skip if quota exceeded
 */
async function getLiveViaRSS(channelId: string, apiKey?: string): Promise<{ id: string; title: string } | null> {
  try {
    const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
    const res = await fetch(rssUrl, { cache: "no-store" });
    if (!res.ok) return null;

    const xml = await res.text();

    // Extract video ID from most recent entry: <yt:videoId>XXXXXXXXXX</yt:videoId>
    const videoIdMatch = xml.match(/<yt:videoId>([^<]+)<\/yt:videoId>/);
    if (!videoIdMatch) return null;

    const videoId = videoIdMatch[1].trim();
    console.log(`[stream] RSS detected videoId: ${videoId}`);

    // Try to validate via YouTube API videos endpoint
    if (apiKey) {
      try {
        const checkRes = await fetch(
          `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${apiKey}`,
          { cache: "no-store" }
        );
        const checkData = await checkRes.json();

        // If API returned error
        if (checkData.error) {
          if (checkData.error.code === 403) {
            console.log(`[stream] RSS: API quota exceeded (403), skipping to HTML method`);
          } else {
            console.log(`[stream] RSS: API error ${checkData.error.code}`);
          }
          return null; // Let HTML method try
        }

        // API succeeded
        const video = checkData.items?.[0];
        if (!video) {
          console.log(`[stream] RSS video ${videoId} not found in API`);
          return null;
        }

        // Only return if liveBroadcastContent is 'live'
        if (video.snippet.liveBroadcastContent !== "live") {
          console.log(`[stream] RSS video ${videoId} not live: ${video.snippet.liveBroadcastContent}`);
          return null;
        }

        // Verify channel
        if (video.snippet.channelId !== channelId) {
          console.log(`[stream] RSS video from wrong channel: ${video.snippet.channelId}`);
          return null;
        }

        console.log(`[stream] ✅ Live found via RSS (validated): ${videoId}`);
        return {
          id: videoId,
          title: video.snippet.title,
        };
      } catch (e) {
        console.log(`[stream] RSS validation error: ${e}`);
        return null;
      }
    }

    return null;
  } catch (e) {
    console.log(`[stream] RSS fetch failed: ${e}`);
    return null;
  }
}

/**
 * Check for live stream via HTML page:
 * 1. Direct /live page with improved detection
 * 2. Try to validate via YouTube API if quota available
 * 3. Fall back to trusting HTML signals if API quota exceeded (403)
 */
async function getLiveViaChannelPage(channelId: string, apiKey?: string): Promise<{ id: string; title: string } | null> {
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
      console.log(`[stream] No live signals in HTML page`);
      return null;
    }

    // Extract video ID — try multiple patterns
    const videoIdMatch = html.match(/"videoId":"([^"]{11})"/) ||
                        html.match(/"video_id":"([^"]{11})"/) ||
                        html.match(/watch\?v=([^"&]{11})/) ||
                        html.match(/\/watch\?v=([A-Za-z0-9_-]{11})/);

    if (!videoIdMatch) return null;

    const videoId = videoIdMatch[1];
    console.log(`[stream] HTML page detected videoId: ${videoId}`);

    // Try to validate via YouTube API videos endpoint (cheaper than search)
    if (apiKey) {
      try {
        const checkRes = await fetch(
          `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${apiKey}`,
          { cache: "no-store" }
        );
        const checkData = await checkRes.json();

        // If API returned an error
        if (checkData.error) {
          // If quota exceeded (403) — trust HTML signals
          if (checkData.error.code === 403) {
            console.log(`[stream] ⚠️ API quota exceeded (403), trusting HTML live signals for ${videoId}`);
            const titleMatch = html.match(/"title":"([^"]+)".*?"isLive/) ||
                              html.match(/"simpleText":"([^"]+)"/) ||
                              html.match(/<title>([^<|]+)/);
            const title = titleMatch ? titleMatch[1].replace(/\\u0026/g, "&").trim() : "Live Stream";
            return { id: videoId, title };
          }
          console.log(`[stream] API error (${checkData.error.code}), skipping validation`);
          return null;
        }

        // API succeeded — validate data
        const video = checkData.items?.[0];
        if (!video) {
          console.log(`[stream] Video ${videoId} not found in API`);
          return null;
        }

        // Only return if liveBroadcastContent is 'live'
        if (video.snippet.liveBroadcastContent !== "live") {
          console.log(`[stream] Video ${videoId} is not live: ${video.snippet.liveBroadcastContent}`);
          return null;
        }

        // Verify it's from our channel
        if (video.snippet.channelId !== channelId) {
          console.log(`[stream] Video ${videoId} from wrong channel: ${video.snippet.channelId}`);
          return null;
        }

        console.log(`[stream] ✅ Live found via HTML + API validation: ${videoId}`);
        return {
          id: videoId,
          title: video.snippet.title,
        };
      } catch (e) {
        console.log(`[stream] API validation error: ${e}, trusting HTML signals`);
        // On network error, trust HTML signals
        const titleMatch = html.match(/"title":"([^"]+)".*?"isLive/) ||
                          html.match(/"simpleText":"([^"]+)"/) ||
                          html.match(/<title>([^<|]+)/);
        const title = titleMatch ? titleMatch[1].replace(/\\u0026/g, "&").trim() : "Live Stream";
        return { id: videoId, title };
      }
    }

    // No API key — trust HTML signals
    console.log(`[stream] ⚠️ No API key, trusting HTML live signals: ${videoId}`);
    const titleMatch = html.match(/"title":"([^"]+)".*?"isLive/) ||
                      html.match(/"simpleText":"([^"]+)"/) ||
                      html.match(/<title>([^<|]+)/);
    const title = titleMatch ? titleMatch[1].replace(/\\u0026/g, "&").trim() : "Live Stream";
    return { id: videoId, title };
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
  const channelId = (settings["stream.youtubeChannelId"] || "").trim();
  const apiKey = (settings["stream.youtubeApiKey"] || process.env.YOUTUBE_API_KEY || "").trim();

  if (!enabled || !channelId) {
    return NextResponse.json({ isLive: false, videoId: null });
  }

  try {
    console.log(`[stream] Starting detection for ${channelId}`);
    let liveVideo = null;

    // Strategy 1: YouTube Data API v3 search (MOST RELIABLE if quota available)
    if (apiKey) {
      console.log(`[stream] Attempting YouTube API search...`);
      liveVideo = await checkWithYouTubeAPI(channelId, apiKey);
      if (liveVideo) {
        console.log(`[stream] ✅ Live stream DETECTED via API: ${liveVideo.id} - ${liveVideo.title}`);
        return NextResponse.json({ isLive: true, videoId: liveVideo.id, title: liveVideo.title });
      }
      console.log(`[stream] API search returned nothing (quota issue or no stream)`);
    } else {
      console.warn(`[stream] ⚠️ YouTube API key not configured`);
    }

    // Strategy 2: HTML channel page (WORKS WITHOUT API QUOTA)
    // This is now PRIMARY fallback when API is down/quota exceeded
    console.log(`[stream] Attempting HTML channel page detection...`);
    liveVideo = await getLiveViaChannelPage(channelId, apiKey);
    if (liveVideo) {
      console.log(`[stream] ✅ Live stream DETECTED via HTML page: ${liveVideo.id} - ${liveVideo.title}`);
      return NextResponse.json({ isLive: true, videoId: liveVideo.id, title: liveVideo.title });
    }

    // Strategy 3: Try RSS with API validation
    console.log(`[stream] Attempting RSS detection...`);
    liveVideo = await getLiveViaRSS(channelId, apiKey);
    if (liveVideo) {
      console.log(`[stream] ✅ Live stream DETECTED via RSS: ${liveVideo.id} - ${liveVideo.title}`);
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
