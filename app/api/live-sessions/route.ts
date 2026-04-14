import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/live-sessions
 * Returns all active live NBA game sessions
 */
export async function GET() {
  try {
    const now = new Date();

    // Fetch active live sessions (last updated within the last 5 minutes)
    const sessions = await prisma.liveSession.findMany({
      where: {
        isActive: true,
        lastChecked: {
          gte: new Date(now.getTime() - 5 * 60 * 1000), // Last checked within 5 minutes
        },
      },
      select: {
        id: true,
        gameId: true,
        homeTeam: true,
        awayTeam: true,
        gameTime: true,
        kyivTime: true,
        liveUrl: true,
        liveSource: true,
        isActive: true,
        lastChecked: true,
      },
      orderBy: { gameTime: "asc" },
    });

    return NextResponse.json({
      success: true,
      sessions,
      count: sessions.length,
    });
  } catch (e) {
    console.error("[/api/live-sessions] Error:", e);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch live sessions",
        sessions: [],
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
