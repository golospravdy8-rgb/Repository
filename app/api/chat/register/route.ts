import { NextRequest, NextResponse } from "next/server";

const CHAT_URL = process.env.CHAT_URL || "http://localhost:3011";

export async function POST(req: NextRequest) {
  const body = await req.json();

  const chatRes = await fetch(`${CHAT_URL}/api/chat/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    credentials: "include",
  });

  const data = await chatRes.json();
  const response = NextResponse.json(data, { status: chatRes.status });

  // Forward Set-Cookie from chat server to browser
  const setCookie = chatRes.headers.get("set-cookie");
  if (setCookie) {
    response.headers.set("set-cookie", setCookie);
  }

  return response;
}
