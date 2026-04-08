import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';


/**
 * POST /api/admin/vip-activate
 * Активує VIP статус для користувача
 *
 * Body:
 * {
 *   "phone": "+380XXX123456",
 *   "durationDays": 30 // або 90, 365
 * }
 *
 * Note: У реальному додатку потрібна перевірка адмін доступу!
 */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { phone, durationDays = 30 } = body;

    if (!phone) {
      return NextResponse.json(
        { error: "Phone number required" },
        { status: 400 }
      );
    }

    // Оновлення або створення користувача
    const user = await prisma.guestContact.upsert({
      where: { phone },
      update: {
        role: "vip",
      },
      create: {
        phone,
        firstName: "VIP",
        lastName: "User",
        role: "vip",
      },
    });

    return NextResponse.json({
      success: true,
      phone: user.phone,
      role: user.role,
      message: `VIP активовано на ${durationDays} днів`,
    });
  } catch (error) {
    console.error("POST /api/admin/vip-activate error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
