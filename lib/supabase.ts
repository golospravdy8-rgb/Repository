import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// Don't throw during build — let API routes handle missing env gracefully
if (!supabaseUrl || !supabaseAnonKey) {
  if (typeof window === 'undefined' && !process.env.VERCEL) {
    // Only warn if not in build environment
    console.warn("⚠️  Supabase env vars missing (expected during build)");
  }
}

// Create client with fallback to dummy values during build
// Actual requests will fail gracefully with proper error messages
export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder-key",
  {
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  }
);

/**
 * Каналу для чату: chat:room:{roomId}
 * Broadcast events:
 * - { type: 'message', message: ChatMessage }
 * - { type: 'reactions', messageId: number, reactions: Reaction[] }
 * - { type: 'delete_message', messageId: number }
 * - { type: 'pin', text: string | null }
 * - { type: 'ban', phone: string }
 * - { type: 'mute', phone: string, mutedUntil: string }
 * - { type: 'warn', phone: string, count: number, reason: string }
 */
export function getChatChannelName(roomId: string): string {
  return `chat:room:${roomId}`;
}

/**
 * Канал для TV синхронізації: tv:match:{matchId}
 * Broadcast events:
 * - { type: 'video_sync', currentTime: number, isPlaying: boolean, userName: string }
 *
 * Presence: список учасників, які дивляться матч
 */
export function getTvChannelName(matchId: string): string {
  return `tv:match:${matchId}`;
}
