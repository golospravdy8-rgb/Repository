import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/groups?ageGroup=younger
export async function GET(req: NextRequest) {
  try {
    const ageGroup = req.nextUrl.searchParams.get("ageGroup") || "younger";

    const groupTables = await prisma.groupTables.findUnique({
      where: { ageGroup },
    });

    return NextResponse.json(groupTables || null);
  } catch (error) {
    console.error("❌ GET /api/groups error:", error);
    return NextResponse.json(
      { error: "Failed to fetch groups" },
      { status: 500 }
    );
  }
}

// POST /api/groups (upsert)
export async function POST(req: NextRequest) {
  try {
    const data = await req.json();

    const groupTables = await prisma.groupTables.upsert({
      where: { ageGroup: data.ageGroup },
      update: {
        groupA: data.groupA || [],
        groupB: data.groupB || [],
      },
      create: {
        ageGroup: data.ageGroup,
        groupA: data.groupA || [],
        groupB: data.groupB || [],
      },
    });

    return NextResponse.json(groupTables);
  } catch (error) {
    console.error("❌ POST /api/groups error:", error);
    return NextResponse.json(
      { error: "Failed to save groups" },
      { status: 500 }
    );
  }
}
