export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getSettings } from '@/lib/site-settings'

export async function GET() {
  const startTime = Date.now()
  const envApiKey = process.env.YOUTUBE_API_KEY || 'NOT_SET'
  const envChannelId = process.env.YOUTUBE_CHANNEL_ID || 'NOT_SET'

  const settings = await getSettings([
    'stream.youtubeChannelId',
    'stream.youtubeApiKey',
    'stream.enabled',
    'stream.scheduledAt',
    'stream.pollIntervalSeconds',
    'stream.countdownThresholdMinutes',
  ])

  const dbChannelId = settings['stream.youtubeChannelId'] || 'NOT_SET'
  const dbApiKey = settings['stream.youtubeApiKey'] || 'NOT_SET'
  const streamEnabled = settings['stream.enabled'] === 'true'
  const scheduledAt = settings['stream.scheduledAt'] || null
  const pollInterval = settings['stream.pollIntervalSeconds'] || '30'
  const countdownThreshold = settings['stream.countdownThresholdMinutes'] || '120'

  // Use env vars if available, fall back to DB
  const channelId = envChannelId !== 'NOT_SET' ? envChannelId : dbChannelId
  const apiKey = envApiKey !== 'NOT_SET' ? envApiKey : dbApiKey

  const isConfigValid = streamEnabled && channelId !== 'NOT_SET' && apiKey !== 'NOT_SET'

  // Estimate polling interval based on countdown
  let estimatedPollMs = parseInt(pollInterval) * 1000 || 30000
  if (scheduledAt) {
    const countdownMs = Math.max(0, new Date(scheduledAt).getTime() - Date.now())
    const countdownMinutes = countdownMs / 60 / 1000

    if (countdownMinutes <= 5) estimatedPollMs = 5000
    else if (countdownMinutes <= 15) estimatedPollMs = 10000
    else if (countdownMinutes <= 60) estimatedPollMs = 20000
  }

  let apiStrategyResult = null
  let htmlFallbackUsed = false
  let lastError = null

  if (isConfigValid) {
    try {
      // Test 1: Search for live videos
      const searchRes = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&eventType=live&type=video&key=${apiKey}`,
        { cache: 'no-store' }
      )
      const searchData = await searchRes.json()

      if (searchData.error) {
        lastError = `Search error: ${searchData.error.message}`
      } else if (searchData.items && searchData.items.length > 0) {
        const videoId = searchData.items[0].id.videoId
        const title = searchData.items[0].snippet.title

        // Test 2: Validate with videos.list
        const validateRes = await fetch(
          `https://www.googleapis.com/youtube/v3/videos?part=snippet,liveStreamingDetails&id=${videoId}&key=${apiKey}`,
          { cache: 'no-store' }
        )
        const validateData = await validateRes.json()

        if (validateData.error) {
          if (validateData.error.code === 403) {
            apiStrategyResult = {
              isLive: true,
              videoId,
              title,
              method: 'search_only (quota exceeded)',
              liveBroadcastContent: 'unknown',
              actualStartTime: null,
            }
          } else {
            lastError = `Validate error: ${validateData.error.message}`
          }
        } else {
          const video = validateData.items?.[0]
          if (video) {
            const liveStatus = video.snippet.liveBroadcastContent
            const actualStartTime = video.liveStreamingDetails?.actualStartTime

            apiStrategyResult = {
              isLive: liveStatus === 'live',
              videoId,
              title,
              method: 'search+videos',
              liveBroadcastContent: liveStatus,
              actualStartTime,
            }
          }
        }
      } else {
        apiStrategyResult = {
          isLive: false,
          videoId: null,
          title: null,
          method: 'search (no results)',
          liveBroadcastContent: null,
          actualStartTime: null,
        }
      }
    } catch (e) {
      lastError = String(e)
    }
  }

  const endTime = Date.now()
  const duration = endTime - startTime

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    duration_ms: duration,
    config: {
      streamEnabled,
      channelId: isConfigValid ? channelId : 'MISSING',
      apiKeyConfigured: apiKey !== 'NOT_SET',
      scheduledAt,
      pollIntervalSeconds: pollInterval,
      countdownThresholdMinutes: countdownThreshold,
    },
    currentStatus: {
      estimatedPollMs,
      isConfigValid,
    },
    apiStrategyResult,
    htmlFallbackUsed,
    staticEmbedUrl: channelId !== 'NOT_SET'
      ? `https://www.youtube.com/embed/live_stream?channel=${channelId}`
      : null,
    errors: lastError ? [lastError] : [],
    healthCheck: {
      hasChannelId: channelId !== 'NOT_SET',
      hasApiKey: apiKey !== 'NOT_SET',
      isEnabled: streamEnabled,
      canDetectLive: isConfigValid && apiStrategyResult?.isLive === true,
    }
  })
}
