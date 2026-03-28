import { NextRequest, NextResponse } from "next/server";

const CHAT_URL = process.env.CHAT_URL || "http://localhost:3011";

export async function GET(req: NextRequest) {
  const cookie = req.headers.get("cookie") || "";

  const chatRes = await fetch(`${CHAT_URL}/api/chat/me`, {
    headers: { cookie },
  });

  if (!chatRes.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: chatRes.status });
  }

  const data = await chatRes.json();
  return NextResponse.json(data);
}
