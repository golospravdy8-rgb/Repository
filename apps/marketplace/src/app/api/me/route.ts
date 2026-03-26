import { NextRequest, NextResponse } from "next/server";
import * as jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "ldbl_super_secret_2025";

export async function GET(req: NextRequest) {
  // Priority 1: chat token (ldbl_chat_token) — has full name from registration
  const chatToken = req.cookies.get("ldbl_chat_token")?.value;
  if (chatToken) {
    try {
      const p = jwt.verify(chatToken, JWT_SECRET) as { phone: string; name: string };
      return NextResponse.json({ name: p.name, phone: p.phone });
    } catch {}
  }

  // Priority 2: main site auth token (ldbl_token)
  const authToken = req.cookies.get("ldbl_token")?.value;
  if (authToken) {
    try {
      const p = jwt.verify(authToken, JWT_SECRET) as { sub: number; email: string; name: string; role: string };
      return NextResponse.json({ id: p.sub, name: p.name, email: p.email, role: p.role });
    } catch {}
  }

  return NextResponse.json(null);
}
