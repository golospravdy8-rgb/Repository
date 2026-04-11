import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/site-settings";

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

// ── POST ──────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || !body.action) return Response.json({ error: "action required" }, { status: 400 });

    const { action, phone, name } = body;

    // ── register / login ────────────────────────────────────────────────────
    if (action === "register") {
      const { firstName, lastName, refCode } = body;
      if (!phone || !firstName || !lastName)
        return Response.json({ error: "Заповніть всі поля" }, { status: 400 });

    const ban = await prisma.chatBan.findUnique({ where: { phone } });
    if (ban) {
      if (!ban.bannedUntil || ban.bannedUntil > new Date()) {
        return Response.json({ error: `Ви заблоковані${ban.reason ? ": " + ban.reason : ""}`, banned: true }, { status: 403 });
      }
      await prisma.chatBan.delete({ where: { phone } });
    }

    // Check if phone belongs to a league player
    const isLeaguePlayer = !!(await prisma.player.findFirst({
      where: { OR: [{ firstName: { contains: firstName }, lastName: { contains: lastName } }] },
    }).catch(() => null));

    const existing = await prisma.guestContact.findUnique({ where: { phone } });

    if (!existing) {
      // New registration — apply HP bonuses from settings
      const hpSettings = await getSettings(["chat.hp.joinBonus", "chat.hp.referralBonus"]);
      const joinBonus = Number(hpSettings["chat.hp.joinBonus"] ?? "25");
      const referralBonus = Number(hpSettings["chat.hp.referralBonus"] ?? "50");

      if (refCode) {
        await prisma.guestContact.updateMany({
          where: { phone: refCode },
          data: { hp: { increment: referralBonus } },
        });
      }

      // role: "player" для гравців ліги, інакше "guest"
      // Батьки реєструються через /api/parents/register і мають role="parent"
      const newRole = isLeaguePlayer ? "player" : "guest";

      await prisma.guestContact.create({
        data: { phone, firstName, lastName, hp: joinBonus, isLeaguePlayer, role: newRole, refCode: refCode || null },
      });
    }

    const guest = await prisma.guestContact.upsert({
      where: { phone },
      update: {
        firstName, lastName,
        ...(isLeaguePlayer ? { isLeaguePlayer: true, role: "player" } : {}),
      },
      create: { phone, firstName, lastName, hp: 25, isLeaguePlayer, role: isLeaguePlayer ? "player" : "guest" },
    });

    const [isMod, warns, pinned, room] = await Promise.all([
      prisma.chatModerator.findUnique({ where: { phone } }),
      prisma.chatWarn.count({ where: { phone } }),
      prisma.chatPinnedMessage.findFirst(),
      prisma.$queryRaw<{ slowMode: boolean }[]>`SELECT "slowMode" FROM "ChatRoom" WHERE id = 'general' LIMIT 1`,
    ]);

    // Current month MVP vote
    const month = new Date().toISOString().slice(0, 7);
    const mvpVote = await prisma.chatMvpVote.findUnique({ where: { voterPhone_month: { voterPhone: phone, month } } }).catch(() => null);

    const origin = req.headers.get("origin") || process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://basket-lviv.com";
    const refLink = `${origin}/chat?ref=${encodeURIComponent(phone)}`;

    return Response.json({
      ok: true,
      guest,
      isMod: !!isMod,
      warns,
      pinnedMessage: pinned?.text ?? null,
      mvpVote: mvpVote ? mvpVote.playerName : null,
      refLink,
      isNewUser: !existing,
      slowMode: room[0]?.slowMode ?? false,
    });
  }

  // ── send message ─────────────────────────────────────────────────────────
  if (action === "message") {
    const { text, replyToId, roomId: msgRoomId } = body;
    if (!phone || !name || !text?.trim())
      return Response.json({ error: "phone, name, text required" }, { status: 400 });

    const ban = await prisma.chatBan.findUnique({ where: { phone } });
    if (ban && (!ban.bannedUntil || ban.bannedUntil > new Date()))
      return Response.json({ error: "Ви заблоковані" }, { status: 403 });

    const mute = await prisma.chatMute.findUnique({ where: { phone } });
    if (mute && mute.mutedUntil > new Date())
      return Response.json({ error: "Ви замовчані до " + mute.mutedUntil.toLocaleString("uk-UA") }, { status: 403 });

    // Check parents room access
    const roomId = msgRoomId === "parents" ? "parents" : "general";
    if (roomId === "parents") {
      const adminToken = req.cookies.get("admin_token")?.value;
      const isAdmin = !!adminToken && adminToken.length > 10;
      if (!isAdmin) {
        const contact = await prisma.guestContact.findUnique({ where: { phone } });
        if (!contact || (contact.role !== "parent" && contact.role !== "player")) {
          return Response.json({ error: "Тільки для батьків та гравців" }, { status: 403 });
        }
      }
    }

    const isMod = !!(await prisma.chatModerator.findUnique({ where: { phone } }));

    const msg = await prisma.chatMessage.create({
      data: { phone, name, text: text.trim().slice(0, 500), replyToId: replyToId ?? null, roomId },
      include: { replyTo: true, reactions: true },
    });

    // HP logic per message:
    // +25 HP — first message of the day (першим написав після 00:00)
    // +15 HP — first message of this user today (щодобовий бонус за вхід + повідомлення)
    // +0 — subsequent messages today
    const today = new Date().toISOString().slice(0, 10);
    let hpGained = 0;
    let isFirstEverToday = false;
    try {
      // chatDailyFirstMsg unique on (phone, day) — throws on duplicate
      await prisma.chatDailyFirstMsg.create({ data: { phone, day: today } });
      // This user's first message today → +15 HP daily bonus
      hpGained = 15;
      // Check if this is also the very first message from anyone today → +25 HP
      const totalToday = await prisma.chatDailyFirstMsg.count({ where: { day: today } });
      if (totalToday === 1) {
        isFirstEverToday = true;
        hpGained = 25; // first-of-day bonus overrides daily bonus
      }
    } catch {
      // already sent a message today — no HP
    }
    const updated = await prisma.guestContact.updateMany({ where: { phone }, data: { hp: { increment: hpGained } } });
    const newHp = updated.count > 0
      ? (await prisma.guestContact.findUnique({ where: { phone }, select: { hp: true } }))?.hp ?? null
      : null;

    broadcast({ type: "message", message: serializeMsg(msg, isMod) });
    return Response.json({ ok: true, hpGained, newHp });
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

  // ── MVP vote ──────────────────────────────────────────────────────────────
  if (action === "mvp_vote") {
    const { voterPhone, playerName } = body;
    if (!voterPhone || !playerName)
      return Response.json({ error: "voterPhone, playerName required" }, { status: 400 });

    const month = new Date().toISOString().slice(0, 7);
    try {
      await prisma.chatMvpVote.create({ data: { voterPhone, playerName, month } });
      broadcast({ type: "mvp_vote", voterPhone, playerName });
      return Response.json({ ok: true, playerName });
    } catch {
      // unique constraint — already voted this month
      const existing = await prisma.chatMvpVote.findUnique({ where: { voterPhone_month: { voterPhone, month } } });
      return Response.json({ ok: false, alreadyVoted: true, playerName: existing?.playerName ?? "" });
    }
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
    const { targetPhone, reason, hours, minutes: banMinutes } = body;
    const durationMs = hours ? hours * 3600_000 : banMinutes ? banMinutes * 60_000 : null;
    const bannedUntil = durationMs ? new Date(Date.now() + durationMs) : null;
    await prisma.chatBan.upsert({
      where: { phone: targetPhone },
      update: { reason: reason ?? "", bannedUntil },
      create: { phone: targetPhone, reason: reason ?? "", bannedUntil },
    });
    const modInfo = await prisma.guestContact.findUnique({ where: { phone }, select: { firstName: true, lastName: true } });
    const modName = modInfo ? `${modInfo.firstName} ${modInfo.lastName}`.trim() : phone;
    const targetInfo = await prisma.guestContact.findUnique({ where: { phone: targetPhone }, select: { firstName: true, lastName: true } });
    const targetName = targetInfo ? `${targetInfo.firstName} ${targetInfo.lastName}`.trim() : targetPhone;
    const durLabel = hours ? `${hours}г` : banMinutes ? `${banMinutes}хв` : "назавжди";
    await prisma.chatModAction.create({
      data: { action: "ban", modPhone: phone, modName, targetPhone, targetName, details: `Бан ${durLabel}: ${reason ?? ""}` },
    });
    broadcast({ type: "banned", phone: targetPhone });
    return Response.json({ ok: true });
  }

  // ── mod: unban ────────────────────────────────────────────────────────────
  if (action === "unban") {
    const isMod = await isModOrAdmin(phone);
    if (!isMod) return Response.json({ error: "Недостатньо прав" }, { status: 403 });
    const { targetPhone } = body;
    await prisma.chatBan.deleteMany({ where: { phone: targetPhone } });
    const modInfo = await prisma.guestContact.findUnique({ where: { phone }, select: { firstName: true, lastName: true } });
    const modName = modInfo ? `${modInfo.firstName} ${modInfo.lastName}`.trim() : phone;
    const targetInfo = await prisma.guestContact.findUnique({ where: { phone: targetPhone }, select: { firstName: true, lastName: true } });
    const targetName = targetInfo ? `${targetInfo.firstName} ${targetInfo.lastName}`.trim() : targetPhone;
    await prisma.chatModAction.create({
      data: { action: "unban", modPhone: phone, modName, targetPhone, targetName, details: "Знято бан" },
    });
    return Response.json({ ok: true });
  }

  // ── mod: mute ─────────────────────────────────────────────────────────────
  if (action === "mute") {
    const isMod = await isModOrAdmin(phone);
    if (!isMod) return Response.json({ error: "Недостатньо прав" }, { status: 403 });
    const { targetPhone, minutes } = body;
    const muteMins = minutes ?? 30;
    const mutedUntil = new Date(Date.now() + muteMins * 60_000);
    await prisma.chatMute.upsert({
      where: { phone: targetPhone },
      update: { mutedUntil },
      create: { phone: targetPhone, mutedUntil },
    });
    const modInfo = await prisma.guestContact.findUnique({ where: { phone }, select: { firstName: true, lastName: true } });
    const modName = modInfo ? `${modInfo.firstName} ${modInfo.lastName}`.trim() : phone;
    const targetInfo = await prisma.guestContact.findUnique({ where: { phone: targetPhone }, select: { firstName: true, lastName: true } });
    const targetName = targetInfo ? `${targetInfo.firstName} ${targetInfo.lastName}`.trim() : targetPhone;
    await prisma.chatModAction.create({
      data: { action: "mute", modPhone: phone, modName, targetPhone, targetName, details: `Мют ${muteMins} хв` },
    });
    broadcast({ type: "muted", phone: targetPhone, mutedUntil });
    return Response.json({ ok: true });
  }

  // ── mod: warn (3 warns = auto-ban 24h) ───────────────────────────────────
  if (action === "warn") {
    const isMod = await isModOrAdmin(phone);
    if (!isMod) return Response.json({ error: "Недостатньо прав" }, { status: 403 });
    const { targetPhone, reason } = body;
    const modInfo = await prisma.guestContact.findUnique({ where: { phone }, select: { firstName: true, lastName: true } });
    const modName = modInfo ? `${modInfo.firstName} ${modInfo.lastName}`.trim() : phone;
    const targetInfo = await prisma.guestContact.findUnique({ where: { phone: targetPhone }, select: { firstName: true, lastName: true } });
    const targetName = targetInfo ? `${targetInfo.firstName} ${targetInfo.lastName}`.trim() : targetPhone;

    await prisma.chatWarn.create({ data: { phone: targetPhone, reason: reason ?? "" } });
    const warnCount = await prisma.chatWarn.count({ where: { phone: targetPhone } });

    await prisma.chatModAction.create({
      data: { action: "warn", modPhone: phone, modName, targetPhone, targetName, details: `Варн ${warnCount}/3: ${reason ?? ""}` },
    });

    // Auto-ban after 3 warnings
    if (warnCount >= 3) {
      const bannedUntil = new Date(Date.now() + 24 * 3600_000);
      await prisma.chatBan.upsert({
        where: { phone: targetPhone },
        update: { reason: "3 попередження (автобан)", bannedUntil },
        create: { phone: targetPhone, reason: "3 попередження (автобан)", bannedUntil },
      });
      await prisma.chatModAction.create({
        data: { action: "autoban", modPhone: "system", modName: "Система", targetPhone, targetName, details: "Автобан після 3 варнів" },
      });
      broadcast({ type: "banned", phone: targetPhone });
    }

    broadcast({ type: "warn", phone: targetPhone, count: warnCount, reason: reason ?? "" });
    return Response.json({ ok: true, warnCount, autoBanned: warnCount >= 3 });
  }

  // ── mod: slow_mode toggle ─────────────────────────────────────────────────
  if (action === "slow_mode") {
    const isMod = await isModOrAdmin(phone);
    if (!isMod) return Response.json({ error: "Недостатньо прав" }, { status: 403 });
    const { roomId: slowRoomId, enabled } = body;
    const roomKey = slowRoomId === "parents" ? "parents" : "general";

    await prisma.$executeRaw`
      INSERT INTO "ChatRoom" (id, "slowMode", "updatedAt")
      VALUES (${roomKey}, ${!!enabled}, NOW())
      ON CONFLICT (id) DO UPDATE SET "slowMode" = ${!!enabled}, "updatedAt" = NOW()
    `;

    const modInfo = await prisma.guestContact.findUnique({ where: { phone }, select: { firstName: true, lastName: true } });
    const modName = modInfo ? `${modInfo.firstName} ${modInfo.lastName}`.trim() : phone;
    await prisma.chatModAction.create({
      data: { action: "slowMode", modPhone: phone, modName, targetPhone: "", targetName: "", details: enabled ? "Увімкнено повільний режим" : "Вимкнено повільний режим" },
    });

    broadcast({ type: "slow_mode", roomId: roomKey, enabled: !!enabled });
    return Response.json({ ok: true, slowMode: !!enabled });
  }

  // ── mod: log_action (log any mod action with details) ─────────────────────
  if (action === "log_action") {
    const { modAction, targetPhone: ta, details } = body;
    const modInfo = await prisma.guestContact.findUnique({ where: { phone }, select: { firstName: true, lastName: true } });
    const modName = modInfo ? `${modInfo.firstName} ${modInfo.lastName}`.trim() : phone;
    const targetInfo = ta ? await prisma.guestContact.findUnique({ where: { phone: ta }, select: { firstName: true, lastName: true } }) : null;
    const targetName = targetInfo ? `${targetInfo.firstName} ${targetInfo.lastName}`.trim() : (ta ?? "");
    await prisma.chatModAction.create({
      data: { action: modAction ?? "unknown", modPhone: phone, modName, targetPhone: ta ?? "", targetName, details: details ?? "" },
    });
    return Response.json({ ok: true });
  }

  // ── daily spin ───────────────────────────────────────────────────────────
  if (action === "spin") {
    if (!phone) return Response.json({ error: "phone required" }, { status: 400 });

    const today = new Date().toISOString().slice(0, 10);
    const existing = await prisma.chatDailySpin.findUnique({ where: { phone_day: { phone, day: today } } });
    if (existing) {
      return Response.json({ ok: false, alreadySpun: true, hpGained: existing.hpGained });
    }

    // Random HP: 5, 10, 15, 20, 25, 30, 50
    const prizes = [5, 5, 10, 10, 15, 15, 20, 25, 30, 50];
    const hpGained = prizes[Math.floor(Math.random() * prizes.length)];

    await prisma.chatDailySpin.create({ data: { phone, day: today, hpGained } });
    await prisma.guestContact.updateMany({ where: { phone }, data: { hp: { increment: hpGained } } });
    const guest = await prisma.guestContact.findUnique({ where: { phone }, select: { hp: true } });

    return Response.json({ ok: true, hpGained, newHp: guest?.hp ?? null });
  }

  // ── streak checkin ────────────────────────────────────────────────────────
  if (action === "checkin") {
    if (!phone) return Response.json({ error: "phone required" }, { status: 400 });

    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400_000).toISOString().slice(0, 10);

    const streak = await prisma.chatStreak.findUnique({ where: { phone } });
    let currentStreak = 1;

    if (streak) {
      if (streak.lastVisit === today) {
        return Response.json({ ok: true, streak: streak.currentStreak, alreadyChecked: true });
      }
      currentStreak = streak.lastVisit === yesterday ? streak.currentStreak + 1 : 1;
      await prisma.chatStreak.update({ where: { phone }, data: { currentStreak, lastVisit: today } });
    } else {
      await prisma.chatStreak.create({ data: { phone, currentStreak: 1, lastVisit: today } });
    }

    return Response.json({ ok: true, streak: currentStreak });
  }

  return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    const errorCode = (error as any)?.code;

    console.error("[POST /api/chat] REGISTRATION ERROR:", {
      timestamp: new Date().toISOString(),
      message: errorMsg,
      name: error instanceof Error ? error.name : "Unknown",
      code: errorCode,
      stack: error instanceof Error ? error.stack : null,
      env: {
        NODE_ENV: process.env.NODE_ENV,
        DATABASE_URL_MASKED: process.env.DATABASE_URL ? "***SET***" : "NOT_SET",
      },
    });

    return Response.json(
      { error: "Помилка при реєстрації. Спробуйте пізніше." },
      { status: 500 }
    );
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────
async function isModOrAdmin(phone: string): Promise<boolean> {
  if (!phone) return false;
  return !!(await prisma.chatModerator.findUnique({ where: { phone } }));
}

function serializeMsg(msg: {
  id: number; phone: string; name: string; text: string; createdAt: Date; roomId?: string;
  replyTo: { id: number; name: string; text: string } | null;
  reactions: { id: number; phone: string; emoji: string }[];
}, isMod: boolean) {
  return {
    id: msg.id,
    phone: msg.phone,
    name: msg.name,
    text: msg.text,
    roomId: msg.roomId ?? "general",
    createdAt: msg.createdAt.toISOString(),
    isMod,
    replyTo: msg.replyTo ? { id: msg.replyTo.id, name: msg.replyTo.name, text: msg.replyTo.text } : null,
    reactions: msg.reactions,
  };
}
