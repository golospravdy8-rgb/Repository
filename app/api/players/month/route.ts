import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const season = await prisma.season.findFirst({
      where: { isActive: true },
      orderBy: { id: "desc" },
    });
    if (!season) return NextResponse.json({ players: [] });

    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const honorPlayers = await prisma.boxScore.groupBy({
      by: ["playerId"],
      where: {
        game: {
          seasonId: season.id,
          scheduledAt: { gte: monthStart },
          status: "FINAL",
        },
      },
      _sum: { points: true },
      _count: { gameId: true },
    });

    const top3 = await Promise.all(
      honorPlayers
        .map((r) => ({
          playerId: r.playerId,
          total: r._sum.points ?? 0,
          games: r._count.gameId,
        }))
        .filter((r) => r.games > 0)
        .sort((a, b) => b.total / b.games - a.total / a.games)
        .slice(0, 3)
        .map(async (r) => {
          const p = await prisma.player.findUnique({
            where: { id: r.playerId },
            select: {
              id: true,
              firstName: true,
              lastName: true,
              photoUrl: true,
              position: true,
              team: { select: { name: true } },
            },
          });
          return {
            player: p,
            avgPoints: Math.round((r.total / r.games) * 10) / 10,
            gamesPlayed: r.games,
            totalPoints: r.total,
          };
        })
    );

    return NextResponse.json({ players: top3 });
  } catch (e) {
    console.error("[players/month GET]", e);
    return NextResponse.json({ players: [] });
  }
}
