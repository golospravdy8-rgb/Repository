import { NextRequest, NextResponse } from "next/server";

const SHOP_URL = process.env.SHOP_URL || "http://localhost:3009";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const res = await fetch(`${SHOP_URL}/api/chat-widget/push`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return NextResponse.json(data);
}
