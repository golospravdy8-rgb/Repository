import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const now = new Date();
    const items = await prisma.auctionItem.findMany({
      where: { isActive: true },
      include: { bids: { orderBy: { createdAt: "desc" } } },
      orderBy: { endsAt: "asc" },
    });

    const active = items.filter((i) => i.endsAt > now);
    const finished = items.filter((i) => i.endsAt <= now);

    return NextResponse.json({ active, finished });
  } catch (e) {
    console.error("[auction GET]", e);
    return NextResponse.json({ active: [], finished: [] });
  }
}
