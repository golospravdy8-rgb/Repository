import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const gameId = parseInt(params.id);
    if (isNaN(gameId)) {
      return NextResponse.json({ error: "Invalid game ID" }, { status: 400 });
    }

    const body = await req.json();
    if (!Array.isArray(body)) {
      return NextResponse.json({ error: "Body must be an array of BoxScore entries" }, { status: 400 });
    }

    // Verify game exists
    const game = await prisma.game.findUnique({ where: { id: gameId } });
    if (!game) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 });
    }

    // Delete existing BoxScores for this game
    await prisma.boxScore.deleteMany({ where: { gameId } });

    // Create new BoxScore entries
    const results = await prisma.boxScore.createMany({
      data: body.map((entry: any) => ({
        gameId,
        playerId: entry.playerId,
        teamId: entry.teamId,
        points: entry.points ?? 0,
        rebounds: entry.rebounds ?? 0,
        assists: entry.assists ?? 0,
        steals: entry.steals ?? 0,
        blocks: entry.blocks ?? 0,
        fouls: entry.fouls ?? 0,
        minutes: entry.minutes ?? 0,
        isStarter: entry.isStarter ?? false,
      })),
    });

    return NextResponse.json({
      success: true,
      count: results.count,
      message: `Saved ${results.count} BoxScore entries`,
    });
  } catch (error) {
    console.error("BoxScore save error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const gameId = parseInt(params.id);
    if (isNaN(gameId)) {
      return NextResponse.json({ error: "Invalid game ID" }, { status: 400 });
    }

    const boxScores = await prisma.boxScore.findMany({
      where: { gameId },
      include: {
        player: { select: { id: true, firstName: true, lastName: true, number: true } },
        team: { select: { id: true, name: true } },
      },
      orderBy: { player: { number: "asc" } },
    });

    return NextResponse.json(boxScores);
  } catch (error) {
    console.error("BoxScore fetch error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
