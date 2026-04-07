import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    // Optimized: Use groupBy to count votes
    const voteCounts = await prisma.chatMvpVote.groupBy({
      by: ["playerId"],
      where: { month },
      _count: {
        id: true,
      },
    });

    // Get player details
    const playerIds = voteCounts
      .map((vc) => vc.playerId)
      .filter((id): id is number => id !== null);

    const players = await prisma.player.findMany({
      where: { id: { in: playerIds } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        photoUrl: true,
      },
    });

    // Build results
    const playerMap = new Map(players.map((p) => [p.id, p]));
    const results = voteCounts
      .map((vc) => {
        const player = playerMap.get(vc.playerId!);
        if (!player) return null;
        return {
          playerName: `${player.firstName} ${player.lastName}`,
          votes: vc._count.id,
          photoUrl: player.photoUrl,
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null)
      .sort((a, b) => b.votes - a.votes);

    return NextResponse.json({ results });
  } catch (error) {
    console.error("MVP results error:", error);
    return NextResponse.json({ results: [] });
  }
}
