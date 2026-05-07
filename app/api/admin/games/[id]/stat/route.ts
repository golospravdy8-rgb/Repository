import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const gameId = parseInt(params.id);
    const { playerId, stat, value = 1 } = await req.json();

    // Update BoxScore
    const boxScore = await prisma.boxScore.update({
      where: { gameId_playerId: { gameId, playerId } },
      data: {
        [stat]: {
          increment: value,
        },
      },
    });

    // Revalidate cache
    return NextResponse.json({ ok: true, boxScore });
  } catch (error) {
    console.error("Stat update error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
