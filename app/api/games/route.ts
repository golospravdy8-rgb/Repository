import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const seasonId = searchParams.get("seasonId");
    const status = searchParams.get("status");

    let where: any = {};
    if (id) where.id = parseInt(id);
    if (seasonId) where.seasonId = parseInt(seasonId);
    if (status) where.status = status;

    const games = await prisma.game.findMany({
      where,
      include: {
        homeTeam: true,
        awayTeam: true,
        season: true,
        boxScores: { include: { player: true } },
        events: { include: { player: true } },
      },
      orderBy: { scheduledAt: "desc" },
      take: 50,
    });

    return NextResponse.json({ games });
  } catch (e) {
    console.error("[games GET]", e);
    return NextResponse.json({ games: [] });
  }
}
