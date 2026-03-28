import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { auctionId, amount, bidder, phone } = body;

  if (!auctionId || !amount || !bidder) {
    return NextResponse.json({ error: "auctionId, amount, bidder required" }, { status: 400 });
  }

  const auction = await prisma.auctionItem.findUnique({ where: { id: Number(auctionId) } });
  if (!auction) return NextResponse.json({ error: "Аукціон не знайдено" }, { status: 404 });
  if (!auction.isActive) return NextResponse.json({ error: "Аукціон завершено" }, { status: 400 });
  if (auction.endsAt < new Date()) return NextResponse.json({ error: "Час аукціону вийшов" }, { status: 400 });

  const minRequired = auction.currentBid + auction.minStep;
  if (Number(amount) < minRequired) {
    return NextResponse.json({ error: `Мінімальна ставка: ${minRequired} грн` }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.auctionBid.create({
      data: { auctionId: Number(auctionId), amount: Number(amount), bidder, phone: phone ?? "" },
    }),
    prisma.auctionItem.update({
      where: { id: Number(auctionId) },
      data: { currentBid: Number(amount) },
    }),
  ]);

  return NextResponse.json({ ok: true, newBid: Number(amount) });
}
