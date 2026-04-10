import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { getJwtSecret } from "@/lib/auth-secret";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/site-settings";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';


async function isAdmin(req: NextRequest): Promise<boolean> {
  // 1. Simple cookie (set by /api/admin/login)
  const adminToken = req.cookies.get("admin_token")?.value;
  if (adminToken === "ldbl_admin_2025") return true;

  // 2. NextAuth JWT session cookie
  const isProd = process.env.NODE_ENV === "production";
  const cookieName = isProd ? "__Secure-next-auth.session-token" : "next-auth.session-token";
  const jwtToken = req.cookies.get(cookieName)?.value;
  if (jwtToken) {
    try {
      await jwtVerify(jwtToken, getJwtSecret());
      return true;
    } catch { /* invalid/expired */ }
  }
  return false;
}

export async function GET(req: NextRequest) {
  if (!await isAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const contacts = await prisma.guestContact.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, phone: true, firstName: true, lastName: true, refCode: true, hp: true, role: true, createdAt: true },
  });
  return NextResponse.json({ contacts });
}

export async function DELETE(req: NextRequest) {
  if (!await isAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const contact = await prisma.guestContact.findUnique({ where: { id: Number(id) } });
  if (!contact) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { phone } = contact;

  // Каскадне видалення: повідомлення, бани, мути, варни, стріки, голоси, RSVP, прогнози, модератор
  await prisma.$transaction([
    prisma.chatMessage.updateMany({
      where: { phone },
      data: { text: "[видалено]", name: "Видалений користувач" },
    }),
    prisma.chatReaction.deleteMany({ where: { phone } }),
    prisma.chatBan.deleteMany({ where: { phone } }),
    prisma.chatMute.deleteMany({ where: { phone } }),
    prisma.chatWarn.deleteMany({ where: { phone } }),
    prisma.chatStreak.deleteMany({ where: { phone } }),
    prisma.chatDailyFirstMsg.deleteMany({ where: { phone } }),
    prisma.chatMvpVote.deleteMany({ where: { voterPhone: phone } }),
    prisma.chatModerator.deleteMany({ where: { phone } }),
    prisma.gameRsvp.deleteMany({ where: { phone } }),
    prisma.matchPrediction.deleteMany({ where: { phone } }),
    prisma.chatDailySpin.deleteMany({ where: { phone } }),
    prisma.guestContact.delete({ where: { id: Number(id) } }),
  ]);

  return NextResponse.json({ ok: true });
}

// Called from chat server when user registers
export async function POST(req: NextRequest) {
  const { phone, firstName, lastName, refCode } = await req.json();
  if (!phone || !firstName || !lastName) {
    return NextResponse.json({ error: "Заповніть всі поля" }, { status: 400 });
  }

  const existing = await prisma.guestContact.findUnique({ where: { phone } });
  if (existing) {
    return NextResponse.json({ contact: existing, isNew: false });
  }

  const hpSettings = await getSettings(["chat.hp.joinBonus", "chat.hp.referralBonus"]);
  const joinBonus = Number(hpSettings["chat.hp.joinBonus"] ?? "25");
  const referralBonus = Number(hpSettings["chat.hp.referralBonus"] ?? "50");

  // Give HP to referrer if refCode provided
  if (refCode) {
    await prisma.guestContact.updateMany({
      where: { phone: refCode },
      data: { hp: { increment: referralBonus } },
    });
  }

  const contact = await prisma.guestContact.create({
    data: { phone, firstName, lastName, refCode: refCode || null, hp: joinBonus },
  });
  return NextResponse.json({ contact, isNew: true });
}
