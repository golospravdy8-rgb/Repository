import { NextRequest, NextResponse } from "next/server";

const ADMIN_EMAIL = "bclvivbasketball@gmail.com";
const ADMIN_PASSWORD = "ldbl_super_secret_2025";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();
  if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
    return NextResponse.json({ ok: false, error: "Невірний email або пароль" }, { status: 401 });
  }
  const response = NextResponse.json({ ok: true });
  response.cookies.set("admin_token", "ldbl_admin_2025", {
    httpOnly: true,
    sameSite: "strict",
    path: "/",
    maxAge: 86400,
  });
  return response;
}
