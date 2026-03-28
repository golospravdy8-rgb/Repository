import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const listings = await prisma.marketplaceListing.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ listings });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { title, description, price, category, condition, seller, phone, imageUrl, emoji } = body;

  if (!title || !price || !category || !condition || !seller || !phone) {
    return NextResponse.json({ error: "Заповніть всі обов'язкові поля" }, { status: 400 });
  }

  const listing = await prisma.marketplaceListing.create({
    data: {
      title,
      description: description ?? "",
      price: Number(price),
      category,
      condition,
      seller,
      phone,
      imageUrl: imageUrl ?? null,
      emoji: emoji ?? "🏀",
      isActive: true,
    },
  });
  return NextResponse.json({ listing });
}
