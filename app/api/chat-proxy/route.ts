import { NextRequest, NextResponse } from "next/server";

const CHAT_URL = process.env.CHAT_URL || "https://chat.basketball.lviv.ua";
const ADMIN_SECRET = process.env.CHAT_ADMIN_SECRET || "ldbl_admin_2025";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const path = searchParams.get("path") || "";

  const headers: Record<string, string> = { "x-admin-secret": ADMIN_SECRET };

  const res = await fetch(`${CHAT_URL}${path}`, { headers });
  const data = await res.json();
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const path = searchParams.get("path") || "";
  const body = await req.json();

  const res = await fetch(`${CHAT_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-admin-secret": ADMIN_SECRET },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return NextResponse.json(data);
}
