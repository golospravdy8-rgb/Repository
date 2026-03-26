import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const reviews = await prisma.review.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ reviews });
}

export async function POST(req: NextRequest) {
  const { author, text } = await req.json();
  if (!author?.trim() || !text?.trim()) {
    return NextResponse.json({ error: "Заповніть всі поля" }, { status: 400 });
  }
  const review = await prisma.review.create({
    data: { author: author.trim().slice(0, 100), text: text.trim().slice(0, 1000) },
  });
  return NextResponse.json(review);
}
