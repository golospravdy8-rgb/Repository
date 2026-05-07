import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { seasonId, homeTeamId, awayTeamId, status = "LIVE" } = await req.json();

    // Create game
    const game = await prisma.game.create({
      data: {
        seasonId,
        homeTeamId,
        awayTeamId,
        scheduledAt: new Date(),
        status,
        homeScore: 0,
        awayScore: 0,
      },
      include: {
        homeTeam: { include: { players: true } },
        awayTeam: { include: { players: true } },
      },
    });

    // PHASE 1: Auto-initialize BoxScore for ALL players
    const allPlayers = [...game.homeTeam.players, ...game.awayTeam.players];
    const boxScoreOps = allPlayers.map((p) =>
      prisma.boxScore.upsert({
        where: { gameId_playerId: { gameId: game.id, playerId: p.id } },
        update: {},
        create: {
          gameId: game.id,
          playerId: p.id,
          teamId: p.teamId,
          points: 0,
          rebounds: 0,
          reboundsOff: 0,
          reboundsDef: 0,
          assists: 0,
          steals: 0,
          blocks: 0,
          fouls: 0,
          turnovers: 0,
        },
      })
    );

    await prisma.$transaction(boxScoreOps);

    return NextResponse.json({ id: game.id, status: "success" });
  } catch (error) {
    console.error("Game creation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
