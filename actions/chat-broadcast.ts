"use server";

import { supabase, getChatChannelName } from "@/lib/supabase";

/**
 * Broadcast повідомлення на всіх клієнтів у кімнаті
 * Називається зі сервера (Server Action) або з API route
 */
export async function broadcastChatMessage(
  roomId: string,
  message: any
) {
  try {
    const channelName = getChatChannelName(roomId);
    const channel = supabase.channel(channelName);

    await channel.send({
      type: "broadcast",
      event: "message",
      payload: { message },
    });

    return { ok: true };
  } catch (error) {
    console.error("[broadcastChatMessage]", error);
    return { ok: false, error: String(error) };
  }
}

export async function broadcastChatReactions(
  roomId: string,
  messageId: number,
  reactions: any[]
) {
  try {
    const channelName = getChatChannelName(roomId);
    const channel = supabase.channel(channelName);

    await channel.send({
      type: "broadcast",
      event: "reactions",
      payload: { messageId, reactions },
    });

    return { ok: true };
  } catch (error) {
    console.error("[broadcastChatReactions]", error);
    return { ok: false, error: String(error) };
  }
}

export async function broadcastDeleteMessage(
  roomId: string,
  messageId: number
) {
  try {
    const channelName = getChatChannelName(roomId);
    const channel = supabase.channel(channelName);

    await channel.send({
      type: "broadcast",
      event: "delete_message",
      payload: { messageId },
    });

    return { ok: true };
  } catch (error) {
    console.error("[broadcastDeleteMessage]", error);
    return { ok: false, error: String(error) };
  }
}

export async function broadcastPin(roomId: string, text: string | null) {
  try {
    const channelName = getChatChannelName(roomId);
    const channel = supabase.channel(channelName);

    await channel.send({
      type: "broadcast",
      event: "pin",
      payload: { text },
    });

    return { ok: true };
  } catch (error) {
    console.error("[broadcastPin]", error);
    return { ok: false, error: String(error) };
  }
}

export async function broadcastBan(roomId: string, phone: string) {
  try {
    const channelName = getChatChannelName(roomId);
    const channel = supabase.channel(channelName);

    await channel.send({
      type: "broadcast",
      event: "ban",
      payload: { phone },
    });

    return { ok: true };
  } catch (error) {
    console.error("[broadcastBan]", error);
    return { ok: false, error: String(error) };
  }
}

export async function broadcastMute(
  roomId: string,
  phone: string,
  mutedUntil: string
) {
  try {
    const channelName = getChatChannelName(roomId);
    const channel = supabase.channel(channelName);

    await channel.send({
      type: "broadcast",
      event: "mute",
      payload: { phone, mutedUntil },
    });

    return { ok: true };
  } catch (error) {
    console.error("[broadcastMute]", error);
    return { ok: false, error: String(error) };
  }
}

export async function broadcastWarn(
  roomId: string,
  phone: string,
  count: number,
  reason: string
) {
  try {
    const channelName = getChatChannelName(roomId);
    const channel = supabase.channel(channelName);

    await channel.send({
      type: "broadcast",
      event: "warn",
      payload: { phone, count, reason },
    });

    return { ok: true };
  } catch (error) {
    console.error("[broadcastWarn]", error);
    return { ok: false, error: String(error) };
  }
}
