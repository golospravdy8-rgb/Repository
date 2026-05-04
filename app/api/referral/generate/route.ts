import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { customAlphabet } from "nanoid";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const nanoid = customAlphabet("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ", 8);

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number(session.user.id);

    const user = await prisma.adminUser.findUnique({ where: { id: userId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    if (user.referralCode) {
      return NextResponse.json({ code: user.referralCode });
    }

    const code = nanoid();
    const updated = await prisma.adminUser.update({
      where: { id: userId },
      data: { referralCode: code },
    });

    return NextResponse.json({ code: updated.referralCode });
  } catch (error) {
    console.error("Generate referral code error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
