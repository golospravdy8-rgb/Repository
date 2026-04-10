import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
export const runtime = 'nodejs';

export const dynamic = 'force-dynamic';


export async function GET() {
  try {
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    // Optimized: Use groupBy to count votes by playerName
    const voteCounts = await prisma.chatMvpVote.groupBy({
      by: ["playerName"],
      where: { month },
      _count: {
        id: true,
      },
    });

    // Build results
    const results = voteCounts
      .map((vc) => ({
        playerName: vc.playerName,
        votes: vc._count.id,
      }))
      .sort((a, b) => b.votes - a.votes);

    return NextResponse.json({ results });
  } catch (error) {
    console.error("MVP results error:", error);
    return NextResponse.json({ results: [] });
  }
}
