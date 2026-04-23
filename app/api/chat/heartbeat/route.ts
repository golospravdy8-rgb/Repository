import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
export const runtime = 'nodejs';

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { phone, name, role, room } = await req.json().catch(() => ({}));
  if (!phone) return NextResponse.json({ error: "phone required" }, { status: 400 });

  const safeRoom = room === "parents" ? "parents" : "general";
  const safeRole = role || "player";
  const safeName = name || "";

  await prisma.$executeRaw`
    INSERT INTO "ChatOnline" (phone, room, "lastSeen", name, role, "joinedAt")
    VALUES (${phone}, ${safeRoom}, NOW(), ${safeName}, ${safeRole}, COALESCE((SELECT "joinedAt" FROM "ChatOnline" WHERE phone = ${phone}), NOW()))
    ON CONFLICT (phone) DO UPDATE
    SET room = ${safeRoom}, "lastSeen" = NOW(), name = ${safeName}, role = ${safeRole}, "leftAt" = NULL
  `;

  return NextResponse.json({ ok: true });
}
