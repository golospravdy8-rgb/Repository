import { NextResponse } from "next/server";

export async function POST() {
  const isProd = process.env.NODE_ENV === "production";
  const jwtCookieName = isProd
    ? "__Secure-next-auth.session-token"
    : "next-auth.session-token";

  const response = NextResponse.json({ ok: true });
  response.cookies.set("admin_token", "", { httpOnly: true, path: "/", maxAge: 0 });
  response.cookies.set(jwtCookieName, "", { httpOnly: true, path: "/", maxAge: 0 });
  return response;
}
