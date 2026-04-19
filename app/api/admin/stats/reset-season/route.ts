import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";

export async function POST(req: NextRequest) {
  try {
    await requireAuth();

    const { ag } = await req.json();
    if (!ag || !["younger", "older"].includes(ag)) {
      return NextResponse.json({ error: "Invalid age group" }, { status: 400 });
    }

    const season = await prisma.season.findFirst({
      where: { isActive: true, ageGroup: ag },
    });

    if (!season) {
      return NextResponse.json({ error: "Season not found" }, { status: 404 });
    }

    const seasonPlayers = await prisma.player.findMany({
      where: { team: { seasonId: season.id } },
      select: { id: true },
    });

    const playerIds = seasonPlayers.map((p) => p.id);

    // Reset BoxScore stats
    await prisma.boxScore.updateMany({
      where: { playerId: { in: playerIds } },
      data: {
        points: 0,
        rebounds: 0,
        assists: 0,
        blocks: 0,
        steals: 0,
        fouls: 0,
        minutes: 0,
        minutesPlayed: null,
        fgMade: 0,
        fgAttempted: 0,
        fg2Made: 0,
        fg2Attempted: 0,
        fg3Made: 0,
        fg3Attempted: 0,
        ftMade: 0,
        ftAttempted: 0,
        missedFg2: 0,
        missedFg3: 0,
        missedFt: 0,
        reboundsDef: 0,
        reboundsOff: 0,
        turnovers: 0,
        plusMinus: 0,
        efficiency: 0.0,
      },
    });

    // Delete PlayerAchievement records
    await prisma.playerAchievement.deleteMany({
      where: { playerId: { in: playerIds } },
    });

    // Reset Standing stats
    await prisma.standing.updateMany({
      where: { seasonId: season.id },
      data: {
        wins: 0,
        losses: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        gamesPlayed: 0,
        rank: 0,
      },
    });

    return NextResponse.json({
      ok: true,
      message: `Статистику успішно обнулено для ${ag === "younger" ? "U-14" : "U-16"}`,
      boxScoresReset: playerIds.length,
      playersAffected: playerIds.length,
    });
  } catch (error) {
    console.error("Reset season stats error:", error);
    return NextResponse.json(
      { error: "Failed to reset statistics" },
      { status: 500 }
    );
  }
}
