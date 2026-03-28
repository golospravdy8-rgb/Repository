import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const auctions = await prisma.auctionItem.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
    include: { bids: { orderBy: { createdAt: "desc" }, take: 5 } },
  });
  return NextResponse.json({ auctions });
}
