import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auction = await prisma.auctionItem.findUnique({
    where: { id: Number(params.id) },
    include: { bids: { orderBy: { amount: "desc" } } },
  });
  if (!auction) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(auction);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  await prisma.auctionItem.update({
    where: { id: Number(params.id) },
    data: { isActive: false },
  });
  return NextResponse.json({ ok: true });
}
