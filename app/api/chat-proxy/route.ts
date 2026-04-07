import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

// Internal API proxy — routes chat admin requests to Next.js API routes directly.
// No dependency on external chat server (port 3011 is not needed).
const INTERNAL_BASE = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3006";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const path = searchParams.get("path") || "";

  const cookieStore = await cookies();
  const adminToken = cookieStore.get("admin_token")?.value ?? "";

  const res = await fetch(`${INTERNAL_BASE}${path}`, {
    headers: {
      "Cookie": `admin_token=${adminToken}`,
      "x-admin-secret": "ldbl_admin_2025",
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return NextResponse.json({ error: `Upstream ${res.status}`, detail: text }, { status: res.status });
  }

  const data = await res.json();
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const path = searchParams.get("path") || "";
  const body = await req.json();

  const cookieStore = await cookies();
  const adminToken = cookieStore.get("admin_token")?.value ?? "";

  const res = await fetch(`${INTERNAL_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Cookie": `admin_token=${adminToken}`,
      "x-admin-secret": "ldbl_admin_2025",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return NextResponse.json({ error: `Upstream ${res.status}`, detail: text }, { status: res.status });
  }

  const data = await res.json();
  return NextResponse.json(data);
}
