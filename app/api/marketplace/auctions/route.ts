import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
export const runtime = 'nodejs';

export const dynamic = "force-dynamic";

export async function GET() {
  const auctions = await prisma.auctionItem.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
    include: { bids: { orderBy: { amount: "desc" }, take: 20 } },
  });
  return NextResponse.json({ auctions });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { title, description, category, seller, phone, imageUrl, emoji, startPrice, minStep, durationHours } = body;

  if (!title || !startPrice || !seller) {
    return NextResponse.json({ error: "Заповніть обов'язкові поля" }, { status: 400 });
  }

  const hours = Number(durationHours) || 72;
  const endsAt = new Date(Date.now() + hours * 3600_000);

  const auction = await prisma.auctionItem.create({
    data: {
      title,
      description: description || "",
      category: category || "Інше",
      seller: seller || "Адмін",
      phone: phone || "",
      imageUrl: imageUrl || null,
      emoji: emoji || "🏀",
      startPrice: Number(startPrice),
      currentBid: Number(startPrice),
      minStep: Number(minStep) || 50,
      endsAt,
    },
    include: { bids: true },
  });
  return NextResponse.json({ auction }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await prisma.auctionBid.deleteMany({ where: { auctionId: Number(id) } });
  await prisma.auctionItem.delete({ where: { id: Number(id) } });
  return NextResponse.json({ ok: true });
}
