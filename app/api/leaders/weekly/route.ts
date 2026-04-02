import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const leaders = await prisma.boxScore.groupBy({
    by: ["playerId"],
    where: { game: { scheduledAt: { gte: weekStart }, status: "FINAL" } },
    _sum: { points: true, rebounds: true, assists: true },
    orderBy: { _sum: { points: "desc" } },
    take: 5,
  }).catch(() => []);

  const result = await Promise.all(
    leaders.map(async (l) => {
      const player = await prisma.player.findUnique({
        where: { id: l.playerId },
        include: { team: { select: { name: true, shortName: true } } },
      });
      return { player, stats: l._sum };
    })
  );

  return NextResponse.json(result.filter(r => r.player));
}
