import { NextRequest, NextResponse } from "next/server";

export const runtime = 'nodejs';
export const dynamic = "force-dynamic";

export async function GET() {
  return new Response("GET ok", { status: 200 });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    return NextResponse.json({ ok: true, received: body });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
