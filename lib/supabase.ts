import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Відсутні Supabase env vars: NEXT_PUBLIC_SUPABASE_URL та NEXT_PUBLIC_SUPABASE_ANON_KEY"
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

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
