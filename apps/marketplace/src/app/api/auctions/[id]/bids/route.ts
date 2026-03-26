import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auctionId = Number(params.id);
  const body = await req.json();
  const { amount, bidder } = body;

  if (!amount || !bidder) {
    return NextResponse.json({ error: "Вкажіть суму та ім'я" }, { status: 400 });
  }

  const auction = await prisma.auctionItem.findUnique({ where: { id: auctionId } });
  if (!auction) return NextResponse.json({ error: "Аукціон не знайдено" }, { status: 404 });
  if (new Date() >= auction.endsAt) return NextResponse.json({ error: "Аукціон завершено" }, { status: 400 });
  if (Number(amount) <= auction.currentBid) {
    return NextResponse.json({ error: `Ставка має бути більше ${auction.currentBid} грн` }, { status: 400 });
  }
  if (Number(amount) < auction.currentBid + auction.minStep) {
    return NextResponse.json({ error: `Мінімальний крок: ${auction.minStep} грн` }, { status: 400 });
  }

  const [bid] = await prisma.$transaction([
    prisma.bid.create({
      data: { amount: Number(amount), bidder, auctionId },
    }),
    prisma.auctionItem.update({
      where: { id: auctionId },
      data: { currentBid: Number(amount) },
    }),
  ]);

  return NextResponse.json(bid, { status: 201 });
}
