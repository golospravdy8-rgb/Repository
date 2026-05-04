import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ageGroup = searchParams.get("ageGroup");

    if (!ageGroup) {
      return NextResponse.json({ error: "ageGroup required" }, { status: 400 });
    }

    const tours = await prisma.tour.findMany({
      where: { ageGroup },
      orderBy: { order: "asc" },
    });

    return NextResponse.json(tours);
  } catch (error) {
    console.error("[tours-get]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, order, ageGroup } = body;

    if (!name || !ageGroup) {
      return NextResponse.json(
        { error: "name and ageGroup required" },
        { status: 400 }
      );
    }

    const tour = await prisma.tour.create({
      data: {
        name,
        order: order ?? 0,
        ageGroup,
      },
    });

    return NextResponse.json(tour, { status: 201 });
  } catch (error) {
    console.error("[tours-post]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
