// Admin login route
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
export const runtime = 'nodejs';

export const dynamic = 'force-dynamic';


export async function POST(req: NextRequest) {
  const { email, password } = await req.json();
  if (!email || !password) {
    return NextResponse.json({ ok: false, error: "Введіть email і пароль" }, { status: 400 });
  }

  const user = await prisma.adminUser.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json({ ok: false, error: "Невірний email або пароль" }, { status: 401 });
  }

  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) {
    return NextResponse.json({ ok: false, error: "Невірний email або пароль" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set("admin_token", "ldbl_admin_2025", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 86400 * 7, // 7 days
    // No secure: true — works on HTTP localhost
  });
  return response;
}
