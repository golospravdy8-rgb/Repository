import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';


export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr, 10);
    if (!id || isNaN(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const review = await prisma.review.findUnique({ where: { id } });
    if (!review) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

    await prisma.review.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[reviews DELETE]", e);
    return NextResponse.json(
      { error: "Failed to delete review" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr, 10);
    if (!id || isNaN(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const { text } = await req.json();
    if (!text?.trim()) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    const review = await prisma.review.findUnique({ where: { id } });
    if (!review) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

    const updated = await prisma.review.update({
      where: { id },
      data: { text: text.trim() },
    });

    return NextResponse.json(updated);
  } catch (e) {
    console.error("[reviews PUT]", e);
    return NextResponse.json(
      { error: "Failed to update review" },
      { status: 500 }
    );
  }
}
