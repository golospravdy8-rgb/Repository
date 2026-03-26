import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const search = searchParams.get("search");

  const listings = await prisma.listing.findMany({
    where: {
      isActive: true,
      ...(category && category !== "Всі" ? { category } : {}),
      ...(search ? { title: { contains: search } } : {}),
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(listings);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { title, description, price, category, condition, seller, phone, imageUrl, emoji } = body;

  if (!title || !price || !category || !condition || !seller) {
    return NextResponse.json({ error: "Заповніть обов'язкові поля" }, { status: 400 });
  }

  const listing = await prisma.listing.create({
    data: {
      title,
      description: description || "",
      price: Number(price),
      category,
      condition,
      seller,
      phone: phone || "",
      imageUrl: imageUrl || "",
      emoji: emoji || "🏀",
    },
  });
  return NextResponse.json(listing, { status: 201 });
}
