import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";
import { getJwtSecret } from "@/lib/auth-secret";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';


export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Missing credentials" }, { status: 400 });
    }

    const user = await prisma.adminUser.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // HP: Check if user can get daily login bonus (24h cooldown)
    const lastHpLog = await prisma.hpLog.findFirst({
      where: { userId: user.id, reason: "daily_login" },
      orderBy: { createdAt: "desc" },
    });

    const now = new Date();
    const canGetBonus = !lastHpLog || (now.getTime() - lastHpLog.createdAt.getTime()) > 24 * 60 * 60 * 1000;

    if (canGetBonus) {
      await prisma.$transaction([
        prisma.adminUser.update({
          where: { id: user.id },
          data: { hp: { increment: 15 } },
        }),
        prisma.hpLog.create({
          data: { userId: user.id, points: 15, reason: "daily_login" },
        }),
      ]);
    }

    const secret = getJwtSecret();

    // Create JWT token
    const token = await new SignJWT({
      sub: String(user.id),
      id: String(user.id),
      email: user.email,
      name: user.name,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("30d")
      .sign(secret);

    const isProd = process.env.NODE_ENV === "production";
    const cookieName = isProd
      ? "__Secure-next-auth.session-token"
      : "next-auth.session-token";

    const response = NextResponse.json({ ok: true });
    response.cookies.set(cookieName, token, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return response;
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
