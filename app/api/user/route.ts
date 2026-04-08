import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // Отримай phone з cookies або query
    const phone = req.cookies.get("user_phone")?.value || req.nextUrl.searchParams.get("phone");

    if (!phone) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Знайди користувача
    const user = await prisma.guestContact.findUnique({
      where: { phone },
      select: {
        phone: true,
        firstName: true,
        lastName: true,
        displayName: true,
        role: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      phone: user.phone,
      name: user.displayName || `${user.firstName} ${user.lastName}`,
      email: user.phone, // Use phone as email placeholder
      role: user.role,
    });
  } catch (error) {
    console.error("GET /api/user error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
