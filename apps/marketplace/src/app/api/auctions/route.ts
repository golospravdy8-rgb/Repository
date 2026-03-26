import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const search = searchParams.get("search");

  const auctions = await prisma.auctionItem.findMany({
    where: {
      isActive: true,
      ...(category && category !== "Всі" ? { category } : {}),
      ...(search ? { title: { contains: search } } : {}),
    },
    include: {
      bids: { orderBy: { amount: "desc" }, take: 5 },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(auctions);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { title, description, category, seller, phone, imageUrl, emoji, startPrice, minStep, durationHours } = body;

  if (!title || !startPrice || !category || !seller) {
    return NextResponse.json({ error: "Заповніть обов'язкові поля" }, { status: 400 });
  }

  const hours = Number(durationHours) || 24;
  const endsAt = new Date(Date.now() + hours * 3600_000);

  const auction = await prisma.auctionItem.create({
    data: {
      title,
      description: description || "",
      category,
      seller,
      phone: phone || "",
      imageUrl: imageUrl || "",
      emoji: emoji || "🏀",
      startPrice: Number(startPrice),
      currentBid: Number(startPrice),
      minStep: Number(minStep) || 50,
      endsAt,
    },
    include: { bids: true },
  });
  return NextResponse.json(auction, { status: 201 });
}
