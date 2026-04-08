import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { phone, plan } = body;

    if (!phone || !plan) {
      return NextResponse.json({ error: "phone and plan required" }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: "VIP purchase request received",
      request: { phone, plan },
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
