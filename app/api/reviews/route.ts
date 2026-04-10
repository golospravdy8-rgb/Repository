import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
export const runtime = 'nodejs';

export const dynamic = 'force-dynamic';


export async function GET() {
  const reviews = await prisma.review.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(reviews);
}

export async function POST(req: Request) {
  try {
    const { author, text } = await req.json();
    if (!author?.trim() || !text?.trim())
      return NextResponse.json({ error: "Заповніть всі поля" }, { status: 400 });
    const review = await prisma.review.create({
      data: { author: author.trim(), text: text.trim() },
    });
    return NextResponse.json(review);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
