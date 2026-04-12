import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const news = await prisma.news.findMany({
      where: { isPublished: true },
      orderBy: { publishedAt: "desc" },
      take: 20,
    });
    return NextResponse.json({ news });
  } catch (e) {
    console.error("[news GET]", e);
    return NextResponse.json({ news: [] });
  }
}

export async function POST(req: Request) {
  try {
    const { title, slug, content, imageUrl, category } = await req.json();
    const news = await prisma.news.create({
      data: {
        title,
        slug: slug || title.toLowerCase().replace(/\s+/g, "-"),
        content,
        imageUrl,
        category,
        isPublished: true,
        publishedAt: new Date(),
      },
    });
    return NextResponse.json({ news }, { status: 201 });
  } catch (e) {
    console.error("[news POST]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
