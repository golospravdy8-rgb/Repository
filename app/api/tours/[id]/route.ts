import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tourId = parseInt(params.id);
    if (isNaN(tourId)) {
      return NextResponse.json({ error: "Invalid tour ID" }, { status: 400 });
    }

    const body = await request.json();
    const { name, order } = body;

    const tour = await prisma.tour.update({
      where: { id: tourId },
      data: {
        ...(name && { name }),
        ...(order !== undefined && { order }),
      },
    });

    return NextResponse.json(tour);
  } catch (error) {
    console.error("[tours-patch]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tourId = parseInt(params.id);
    if (isNaN(tourId)) {
      return NextResponse.json({ error: "Invalid tour ID" }, { status: 400 });
    }

    await prisma.tour.delete({
      where: { id: tourId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[tours-delete]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
