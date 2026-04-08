import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, durationDays = 30 } = body;

    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    const updated = await prisma.guestContact.update({
      where: { id: Number(userId) },
      data: {
        role: "vip",
      },
    });

    return NextResponse.json({
      success: true,
      message: `✅ VIP активовано для ${updated.firstName} ${updated.lastName}`,
      admin: {
        id: updated.id,
        phone: updated.phone,
        role: updated.role,
        name: `${updated.firstName} ${updated.lastName}`,
      },
    });
  } catch (error) {
    console.error("POST /api/admin/vip-activate-manual error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 }
    );
  }
}
