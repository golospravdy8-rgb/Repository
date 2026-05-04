import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/playoff?ageGroup=younger
export async function GET(req: NextRequest) {
  try {
    const ageGroup = req.nextUrl.searchParams.get("ageGroup") || "younger";

    const playoff = await prisma.playoff.findUnique({
      where: { ageGroup },
    });

    return NextResponse.json(playoff || null);
  } catch (error) {
    console.error("❌ GET /api/playoff error:", error);
    return NextResponse.json(
      { error: "Failed to fetch playoff" },
      { status: 500 }
    );
  }
}

// POST /api/playoff (upsert)
export async function POST(req: NextRequest) {
  try {
    const data = await req.json();

    const playoff = await prisma.playoff.upsert({
      where: { ageGroup: data.ageGroup },
      update: data,
      create: data,
    });

    return NextResponse.json(playoff);
  } catch (error) {
    console.error("❌ POST /api/playoff error:", error);
    return NextResponse.json(
      { error: "Failed to save playoff" },
      { status: 500 }
    );
  }
}
