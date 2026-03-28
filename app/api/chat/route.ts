import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ── SSE client registry ────────────────────────────────────────────────────
declare global {
  // eslint-disable-next-line no-var
  var chatClients: ReadableStreamDefaultController[];
}
global.chatClients = global.chatClients || [];

function broadcast(payload: object) {
  const chunk = new TextEncoder().encode(`data: ${JSON.stringify(payload)}\n\n`);
  const dead: ReadableStreamDefaultController[] = [];
  for (const ctrl of global.chatClients) {
    try { ctrl.enqueue(chunk); } catch { dead.push(ctrl); }
  }
  global.chatClients = global.chatClients.filter((c) => !dead.includes(c));
}

// ── GET — SSE stream ──────────────────────────────────────────────────────
export async function GET() {
  const stream = new ReadableStream({
    start(ctrl) {
      global.chatClients.push(ctrl);
      ctrl.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ type: "connected" })}\n\n`));
    },
    cancel(ctrl) {
      global.chatClients = global.chatClients.filter((c) => c !== ctrl);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

// ── POST — send message / reaction / pin / mod action ─────────────────────
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || !body.action) return Response.json({ error: "action required" }, { status: 400 });

  const { action, phone, name } = body;

  // ── register / login ────────────────────────────────────────────────────
  if (action === "register") {
    const { firstName, lastName } = body;
    if (!phone || !firstName || !lastName)
      return Response.json({ error: "Заповніть всі поля" }, { status: 400 });

    // Check ban
    const ban = await prisma.chatBan.findUnique({ where: { phone } });
    if (ban) {
      if (!ban.bannedUntil || ban.bannedUntil > new Date()) {
        return Response.json({
          error: `Ви заблоковані${ban.reason ? ": " + ban.reason : ""}`,
          banned: true,
        }, { status: 403 });
      }
      await prisma.chatBan.delete({ where: { phone } });
    }

    const guest = await prisma.guestContact.upsert({
      where: { phone },
      update: { firstName, lastName },
      create: { phone, firstName, lastName, hp: 25 },
    });
    const isMod = !!(await prisma.chatModerator.findUnique({ where: { phone } }));
    const warns = await prisma.chatWarn.count({ where: { phone } });
    const pinned = await prisma.chatPinnedMessage.findFirst();
    return Response.json({ ok: true, guest, isMod, warns, pinnedMessage: pinned?.text ?? null });
  }

  // ── send message ─────────────────────────────────────────────────────────
  if (action === "message") {
    const { text, replyToId } = body;
    if (!phone || !name || !text?.trim())
      return Response.json({ error: "phone, name, text required" }, { status: 400 });

    // Check ban / mute
    const ban = await prisma.chatBan.findUnique({ where: { phone } });
    if (ban && (!ban.bannedUntil || ban.bannedUntil > new Date()))
      return Response.json({ error: "Ви заблоковані" }, { status: 403 });

    const mute = await prisma.chatMute.findUnique({ where: { phone } });
    if (mute && mute.mutedUntil > new Date())
      return Response.json({ error: "Ви замовчані до " + mute.mutedUntil.toLocaleString("uk-UA") }, { status: 403 });

    const isMod = !!(await prisma.chatModerator.findUnique({ where: { phone } }));

    const msg = await prisma.chatMessage.create({
      data: { phone, name, text: text.trim().slice(0, 500), replyToId: replyToId ?? null },
      include: { replyTo: true, reactions: true },
    });

    // +1 HP for activity
    await prisma.guestContact.updateMany({ where: { phone }, data: { hp: { increment: 1 } } });

    broadcast({ type: "message", message: serializeMsg(msg, isMod) });
    return Response.json({ ok: true });
  }

  // ── reaction ─────────────────────────────────────────────────────────────
  if (action === "react") {
    const { messageId, emoji } = body;
    if (!phone || !messageId || !emoji)
      return Response.json({ error: "phone, messageId, emoji required" }, { status: 400 });

    const existing = await prisma.chatReaction.findUnique({
      where: { messageId_phone_emoji: { messageId: Number(messageId), phone, emoji } },
    });
    if (existing) {
      await prisma.chatReaction.delete({ where: { id: existing.id } });
    } else {
      await prisma.chatReaction.create({ data: { messageId: Number(messageId), phone, emoji } });
    }

    const reactions = await prisma.chatReaction.findMany({ where: { messageId: Number(messageId) } });
    broadcast({ type: "reactions", messageId: Number(messageId), reactions });
    return Response.json({ ok: true });
  }

  // ── mod: pin ─────────────────────────────────────────────────────────────
  if (action === "pin") {
    const isMod = await isModOrAdmin(phone);
    if (!isMod) return Response.json({ error: "Недостатньо прав" }, { status: 403 });
    const { text } = body;
    if (text) {
      await prisma.chatPinnedMessage.deleteMany();
      await prisma.chatPinnedMessage.create({ data: { text } });
    } else {
      await prisma.chatPinnedMessage.deleteMany();
    }
    broadcast({ type: "pin", text: text ?? null });
    return Response.json({ ok: true });
  }

  // ── mod: delete message ───────────────────────────────────────────────────
  if (action === "delete_message") {
    const { messageId } = body;
    const msg = await prisma.chatMessage.findUnique({ where: { id: Number(messageId) } });
    if (!msg) return Response.json({ error: "Не знайдено" }, { status: 404 });

    const isMod = await isModOrAdmin(phone);
    if (!isMod && msg.phone !== phone)
      return Response.json({ error: "Недостатньо прав" }, { status: 403 });

    await prisma.chatMessage.delete({ where: { id: Number(messageId) } });
    broadcast({ type: "delete_message", messageId: Number(messageId) });
    return Response.json({ ok: true });
  }

  // ── mod: ban ──────────────────────────────────────────────────────────────
  if (action === "ban") {
    const isMod = await isModOrAdmin(phone);
    if (!isMod) return Response.json({ error: "Недостатньо прав" }, { status: 403 });
    const { targetPhone, reason, hours } = body;
    const bannedUntil = hours ? new Date(Date.now() + hours * 3600_000) : null;
    await prisma.chatBan.upsert({
      where: { phone: targetPhone },
      update: { reason: reason ?? "", bannedUntil },
      create: { phone: targetPhone, reason: reason ?? "", bannedUntil },
    });
    broadcast({ type: "banned", phone: targetPhone });
    return Response.json({ ok: true });
  }

  // ── mod: unban ────────────────────────────────────────────────────────────
  if (action === "unban") {
    const isMod = await isModOrAdmin(phone);
    if (!isMod) return Response.json({ error: "Недостатньо прав" }, { status: 403 });
    await prisma.chatBan.deleteMany({ where: { phone: body.targetPhone } });
    return Response.json({ ok: true });
  }

  // ── mod: mute ─────────────────────────────────────────────────────────────
  if (action === "mute") {
    const isMod = await isModOrAdmin(phone);
    if (!isMod) return Response.json({ error: "Недостатньо прав" }, { status: 403 });
    const { targetPhone, minutes } = body;
    const mutedUntil = new Date(Date.now() + (minutes ?? 10) * 60_000);
    await prisma.chatMute.upsert({
      where: { phone: targetPhone },
      update: { mutedUntil },
      create: { phone: targetPhone, mutedUntil },
    });
    broadcast({ type: "muted", phone: targetPhone, mutedUntil });
    return Response.json({ ok: true });
  }

  // ── mod: warn ─────────────────────────────────────────────────────────────
  if (action === "warn") {
    const isMod = await isModOrAdmin(phone);
    if (!isMod) return Response.json({ error: "Недостатньо прав" }, { status: 403 });
    const { targetPhone, reason } = body;
    await prisma.chatWarn.create({ data: { phone: targetPhone, reason: reason ?? "" } });
    const warnCount = await prisma.chatWarn.count({ where: { phone: targetPhone } });
    broadcast({ type: "warn", phone: targetPhone, count: warnCount, reason: reason ?? "" });
    return Response.json({ ok: true, warnCount });
  }

  return Response.json({ error: "Unknown action" }, { status: 400 });
}

// ── Helpers ───────────────────────────────────────────────────────────────
async function isModOrAdmin(phone: string): Promise<boolean> {
  if (!phone) return false;
  const mod = await prisma.chatModerator.findUnique({ where: { phone } });
  return !!mod;
}

function serializeMsg(msg: {
  id: number; phone: string; name: string; text: string; createdAt: Date;
  replyTo: { id: number; name: string; text: string } | null;
  reactions: { id: number; phone: string; emoji: string }[];
}, isMod: boolean) {
  return {
    id: msg.id,
    phone: msg.phone,
    name: msg.name,
    text: msg.text,
    createdAt: msg.createdAt.toISOString(),
    isMod,
    replyTo: msg.replyTo ? { id: msg.replyTo.id, name: msg.replyTo.name, text: msg.replyTo.text } : null,
    reactions: msg.reactions,
  };
}
