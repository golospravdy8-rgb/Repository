import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
export const runtime = 'nodejs';

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const reviews = await prisma.review.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(reviews);
  } catch (error) {
    console.error("[GET /api/v1/reviews]", error);
    return NextResponse.json(
      { error: "Failed to fetch reviews" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { author, text } = body;

    if (!author?.trim() || !text?.trim()) {
      return NextResponse.json(
        { error: "Заповніть всі поля" },
        { status: 400 }
      );
    }

    const review = await prisma.review.create({
      data: {
        author: author.trim(),
        text: text.trim(),
      },
    });

    return NextResponse.json(review, { status: 201 });
  } catch (error) {
    console.error("[POST /api/v1/reviews]", error);
    return NextResponse.json(
      { error: "Failed to create review" },
      { status: 500 }
    );
  }
}
