import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { code } = await req.json();
    if (!code) return NextResponse.json({ error: "Code required" }, { status: 400 });

    const userId = Number(session.user.id);

    // Перевір чи юзер вже використовував реферал
    const currentUser = await prisma.adminUser.findUnique({ where: { id: userId } });
    if (!currentUser) return NextResponse.json({ error: "User not found" }, { status: 404 });
    if (currentUser.referredBy) {
      return NextResponse.json({ error: "Referral already used" }, { status: 400 });
    }

    // Знайди власника коду
    const referrer = await prisma.adminUser.findUnique({ where: { referralCode: code } });
    if (!referrer) return NextResponse.json({ error: "Invalid code" }, { status: 404 });
    if (referrer.id === userId) {
      return NextResponse.json({ error: "Cannot use own code" }, { status: 400 });
    }

    // Нарахуй HP власнику коду +50
    await prisma.$transaction([
      prisma.adminUser.update({
        where: { id: referrer.id },
        data: {
          hp: { increment: 50 },
          referralCount: { increment: 1 },
        },
      }),
      prisma.hpLog.create({
        data: { userId: referrer.id, points: 50, reason: "referral" },
      }),
      prisma.adminUser.update({
        where: { id: userId },
        data: { referredBy: referrer.id },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: "Referral activated! Owner received +50 HP",
    });
  } catch (error) {
    console.error("Activate referral code error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
