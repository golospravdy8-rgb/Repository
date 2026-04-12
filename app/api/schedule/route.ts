import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const seasonId = searchParams.get("seasonId") ? parseInt(searchParams.get("seasonId")!) : undefined;
    const ageGroup = searchParams.get("ageGroup") || "younger";

    const season = seasonId
      ? await prisma.season.findUnique({ where: { id: seasonId } })
      : await prisma.season.findFirst({
          where: { isActive: true, ageGroup },
          orderBy: { id: "desc" },
        });

    if (!season) return NextResponse.json({ games: [] });

    const games = await prisma.game.findMany({
      where: { seasonId: season.id },
      include: {
        homeTeam: true,
        awayTeam: true,
        season: true,
        events: true,
      },
      orderBy: { scheduledAt: "asc" },
    });

    return NextResponse.json({ games, season });
  } catch (e) {
    console.error("[schedule GET]", e);
    return NextResponse.json({ games: [], season: null });
  }
}
