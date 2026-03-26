import { NextRequest, NextResponse } from "next/server";

const SHOP_URL = process.env.SHOP_URL || "http://localhost:3009";

export async function GET() {
  const res = await fetch(`${SHOP_URL}/api/chat-widget/settings`, { cache: "no-store" });
  const data = await res.json();
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const res = await fetch(`${SHOP_URL}/api/chat-widget/settings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const res = await fetch(`${SHOP_URL}/api/chat-widget/settings`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return NextResponse.json(data);
}
