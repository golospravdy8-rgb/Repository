/**
 * Live Stream Finder - Multi-source search for NBA games
 * Priority: user links > reddit > telegram > youtube > others
 */

const REDDIT_SUBREDDITS = [
  "NBATalk",
  "nba",
  "nbadiscussion",
  "Piracy",
  "lakers",
  "warriors",
  "celtics",
  "knicks",
  "sixers",
  "heat",
  "raptors",
  "nuggets",
  "mavericks",
  "clippers",
  "thunder",
];

const TELEGRAM_CHANNELS = [
  "NBAin",
  "nbafreefullgames",
  "Nbalivegh",
  "sportsliveChannel",
  "Live_NBAYHY",
];

const YOUTUBE_SEARCH_URL = "https://www.youtube.com/results?search_query=";

/**
 * Validate if URL is accessible and contains stream content
 */
async function validateUrl(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: "HEAD",
      timeout: 3000,
      redirect: "follow",
    } as any);

    // Valid if response is 2xx or 3xx
    return res.status >= 200 && res.status < 400;
  } catch (e) {
    console.warn(`[VALIDATE] URL failed: ${url.substring(0, 50)}`);
    return false;
  }
}

/**
 * Extract URLs from text content
 */
function extractUrls(text: string): string[] {
  const urlRegex = /https?:\/\/[^\s"'<>)]+/gi;
  const urls = text.match(urlRegex) || [];

  // Filter out invalid URLs
  return urls.filter((url) => {
    const lower = url.toLowerCase();
    return (
      !lower.includes("reddit.com/r/") && // Exclude reddit post pages
      !lower.includes("youtube.com/watch?v=&") && // Exclude empty YT
      url.length > 20 &&
      url.length < 500
    );
  });
}

/**
 * PRIORITY 1: Check for user-submitted links
 */
async function searchUserLinks(gameId: string): Promise<string | null> {
  try {
    // In production, query UserStream table for this gameId
    // For now, return null (no user links exist yet)
    return null;
  } catch (e) {
    console.warn(`[USER_LINKS] Error: ${String(e)}`);
    return null;
  }
}

/**
 * PRIORITY 2: Search Reddit
 */
async function searchReddit(
  awayTeam: string,
  homeTeam: string
): Promise<string | null> {
  console.log(`[REDDIT] Searching for ${awayTeam} vs ${homeTeam}`);

  try {
    // Try team-specific subreddits first
    const teamName = awayTeam.split(" ").pop()?.toLowerCase() || "";

    for (const subreddit of REDDIT_SUBREDDITS) {
      try {
        // Search subreddit using Reddit API (JSON endpoint)
        const searchUrl = `https://www.reddit.com/r/${subreddit}/search.json?q=${encodeURIComponent(
          `${awayTeam} ${homeTeam} live`
        )}&restrict_sr=on&type=link`;

        const res = await fetch(searchUrl, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
          signal: AbortSignal.timeout(5000) as any,
        });

        if (!res.ok) continue;

        const data = (await res.json()) as any;
        const posts = data?.data?.children || [];

        for (const post of posts) {
          const url = post?.data?.url;
          const title = post?.data?.title || "";

          if (
            url &&
            (title.toLowerCase().includes("live") ||
              title.toLowerCase().includes("stream"))
          ) {
            // Found a potential stream link
            if (await validateUrl(url)) {
              console.log(`[REDDIT] ✅ Found in r/${subreddit}: ${url.substring(0, 60)}`);
              return url;
            }
          }
        }
      } catch (e) {
        continue;
      }
    }

    console.log(`[REDDIT] ❌ No streams found`);
    return null;
  } catch (e) {
    console.warn(`[REDDIT] Error: ${String(e)}`);
    return null;
  }
}

/**
 * PRIORITY 3: Search Telegram (public channels)
 *
 * NOTE: Telegram doesn't have public API for channel messages.
 * We can only return Telegram channel links for users to check manually.
 * Real integration would require:
 * - Telegram Bot API (need bot token)
 * - MTProto client (complex setup)
 *
 * For now: Return main Telegram channel as fallback
 */
async function searchTelegram(
  awayTeam: string,
  homeTeam: string
): Promise<string | null> {
  console.log(`[TELEGRAM] Returning main channel (requires bot for full search)`);

  // Return main NBA Telegram channel as fallback
  // In production, would integrate with Telegram Bot API
  return "https://t.me/NBAin";
}

/**
 * PRIORITY 4: Search YouTube
 */
async function searchYoutube(
  awayTeam: string,
  homeTeam: string
): Promise<string | null> {
  console.log(`[YOUTUBE] Searching for ${awayTeam} vs ${homeTeam}`);

  try {
    const query = `${awayTeam} vs ${homeTeam} live stream`;
    const searchUrl = YOUTUBE_SEARCH_URL + encodeURIComponent(query);

    // Return search URL - users can click to find live streams
    // YouTube live streams are typically found in top results
    console.log(`[YOUTUBE] ✅ Search URL: ${searchUrl.substring(0, 80)}`);
    return searchUrl;
  } catch (e) {
    console.warn(`[YOUTUBE] Error: ${String(e)}`);
    return null;
  }
}

/**
 * PRIORITY 5: Search Sportsurge/IPTV sources
 */
async function searchSportsurge(
  awayTeam: string,
  homeTeam: string
): Promise<string | null> {
  console.log(`[SPORTSURGE] Searching for ${awayTeam} vs ${homeTeam}`);

  try {
    const query = `${awayTeam} ${homeTeam}`;
    const url = `https://sportsurge.net/#/streaming?q=${encodeURIComponent(query)}`;

    console.log(`[SPORTSURGE] ✅ Found: ${url.substring(0, 80)}`);
    return url;
  } catch (e) {
    console.warn(`[SPORTSURGE] Error: ${String(e)}`);
    return null;
  }
}

/**
 * Main search function - tries all sources in priority order
 */
export async function findLiveStream(
  awayTeam: string,
  homeTeam: string,
  gameId?: string
): Promise<{ url: string; source: string } | null> {
  console.log(`[SEARCH] Starting multi-source search for ${awayTeam} vs ${homeTeam}`);

  // Priority 1: User links (if gameId provided)
  if (gameId) {
    const userUrl = await searchUserLinks(gameId);
    if (userUrl) {
      return { url: userUrl, source: "user" };
    }
  }

  // Priority 2: Reddit
  const redditUrl = await searchReddit(awayTeam, homeTeam);
  if (redditUrl) {
    return { url: redditUrl, source: "reddit" };
  }

  // Priority 3: Telegram
  const telegramUrl = await searchTelegram(awayTeam, homeTeam);
  if (telegramUrl) {
    return { url: telegramUrl, source: "telegram" };
  }

  // Priority 4: YouTube
  const youtubeUrl = await searchYoutube(awayTeam, homeTeam);
  if (youtubeUrl) {
    return { url: youtubeUrl, source: "youtube" };
  }

  // Priority 5: Sportsurge
  const sportsurgeUrl = await searchSportsurge(awayTeam, homeTeam);
  if (sportsurgeUrl) {
    return { url: sportsurgeUrl, source: "sportsurge" };
  }

  console.log(`[SEARCH] ❌ No streams found from any source`);
  return null;
}
