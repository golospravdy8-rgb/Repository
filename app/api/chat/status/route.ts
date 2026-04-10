import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
export const runtime = 'nodejs';

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const phone = req.nextUrl.searchParams.get("phone");
  if (!phone) return NextResponse.json({ spinDone: false, streak: 0 });

  const today = new Date().toISOString().slice(0, 10);

  const [spin, streak] = await Promise.all([
    prisma.chatDailySpin.findUnique({ where: { phone_day: { phone, day: today } } }).catch(() => null),
    prisma.chatStreak.findUnique({ where: { phone } }).catch(() => null),
  ]);

  return NextResponse.json({
    spinDone: !!spin,
    streak: streak?.currentStreak ?? 0,
  });
}
