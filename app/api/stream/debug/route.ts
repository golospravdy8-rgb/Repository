export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getSettings } from "@/lib/site-settings";

export async function GET() {
  const settings = await getSettings(['stream.enabled', 'stream.youtubeChannelId', 'stream.pollIntervalSeconds'])

  const enabled = settings["stream.enabled"] === "true"
  const channelId = settings["stream.youtubeChannelId"] || 'NOT_SET'
  const pollInterval = settings["stream.pollIntervalSeconds"] || '10'

  // Спробуй реальний запит до YouTube як робить основний код
  let youtubeResponse = null
  let youtubeError = null
  let htmlSnippet = null

  if (enabled && channelId !== 'NOT_SET') {
    try {
      // Одна кешь YouTube HTML для /live сторінки
      const liveUrl = `https://www.youtube.com/channel/${channelId}/live`
      const BROWSER_HEADERS = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept-Language": "uk-UA,uk;q=0.9,en;q=0.8",
      }

      const res = await fetch(liveUrl, {
        cache: "no-store",
        headers: BROWSER_HEADERS,
        redirect: "follow",
      })

      if (!res.ok) {
        youtubeError = `HTTP ${res.status}: ${res.statusText}`
      } else {
        const html = await res.text()
        htmlSnippet = html.substring(0, 500)

        const hasLiveNow = html.includes('"isLiveNow":true')
        const videoIdMatch = html.match(/"videoId":"([^"]{11})"/)

        youtubeResponse = {
          statusCode: res.status,
          hasLiveNow,
          videoIdFound: videoIdMatch ? videoIdMatch[1] : null,
          htmlLength: html.length,
        }
      }
    } catch(e) {
      youtubeError = String(e)
    }
  }

  return NextResponse.json({
    settings: {
      enabled,
      channelId,
      pollIntervalSeconds: pollInterval,
    },
    youtubeCheck: {
      response: youtubeResponse,
      error: youtubeError,
      htmlSnippet: htmlSnippet ? htmlSnippet.substring(0, 200) : null,
    },
    timestamp: new Date().toISOString(),
  })
}
