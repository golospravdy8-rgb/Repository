export const runtime = 'nodejs';
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
// TEMP: All other imports commented out for minimal test
// import { prisma } from "@/lib/prisma";
// import { randomBytes } from "crypto";

export async function GET() {
  return NextResponse.json({ status: "ok", message: "GET minimal route" });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    return NextResponse.json({
      ok: true,
      message: "Minimal route success - no db, no extra imports",
      received: body,
      timestamp: new Date().toISOString()
    });
  } catch (e: any) {
    console.error("Minimal route error:", e?.message || e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
