export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getSettings } from '@/lib/site-settings'

export async function GET() {
  const envApiKey = process.env.YOUTUBE_API_KEY || 'NOT_SET'
  const envChannelId = process.env.YOUTUBE_CHANNEL_ID || 'NOT_SET'

  const settings = await getSettings(['stream.youtubeChannelId', 'stream.youtubeApiKey', 'stream.enabled'])
  const dbChannelId = settings['stream.youtubeChannelId'] || 'NOT_SET'
  const dbApiKey = settings['stream.youtubeApiKey'] || 'NOT_SET'
  const streamEnabled = settings['stream.enabled'] === 'true'

  let liveResult = null
  let error = null

  // Use env vars if available, fall back to DB
  const channelId = envChannelId !== 'NOT_SET' ? envChannelId : dbChannelId
  const apiKey = envApiKey !== 'NOT_SET' ? envApiKey : dbApiKey

  try {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&eventType=live&type=video&key=${apiKey}`,
      { cache: 'no-store' }
    )
    liveResult = await res.json()
    if (liveResult.items && liveResult.items.length > 0) {
      liveResult.firstVideo = {
        videoId: liveResult.items[0].id.videoId,
        title: liveResult.items[0].snippet.title,
        channelTitle: liveResult.items[0].snippet.channelTitle
      }
    }
  } catch(e) {
    error = String(e)
  }

  return NextResponse.json({
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_ENV: process.env.VERCEL_ENV,
    },
    config: {
      envApiKey: envApiKey !== 'NOT_SET' ? envApiKey.substring(0, 20) + '...' : 'NOT_SET',
      envChannelId,
      dbApiKey: dbApiKey !== 'NOT_SET' ? dbApiKey.substring(0, 20) + '...' : 'NOT_SET',
      dbChannelId,
      usedApiKey: apiKey !== 'NOT_SET' ? apiKey.substring(0, 20) + '...' : 'NOT_SET',
      usedChannelId: channelId,
      streamEnabled,
    },
    liveSearchResult: {
      itemsCount: liveResult?.items?.length || 0,
      firstVideo: liveResult?.firstVideo || null,
      error: error
    }
  })
}
