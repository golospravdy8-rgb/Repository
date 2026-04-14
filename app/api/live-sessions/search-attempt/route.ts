import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface SearchAttemptRequest {
  gameId: string;
  homeTeam: string;
  awayTeam: string;
  gameTime: string; // ISO datetime
  kyivTime: string; // ISO datetime
  liveUrl?: string; // If found during this search attempt
  liveSource?: string;
}

/**
 * POST /api/live-sessions/search-attempt
 *
 * Record a live stream search attempt for a game.
 * - First call: records firstSearchAt, returns { attempt: 1, canSearchAgain: true }
 * - Second call: records secondSearchAt, sets searchCompleted = true
 * - After searchCompleted: returns { attempt: null, canSearchAgain: false }
 *
 * This implements the 10-minute search window:
 * - Attempt 1: at game start (T+0)
 * - Attempt 2: at T+10 minutes
 * - After: no more searches
 */
export async function POST(req: NextRequest) {
  try {
    const body: SearchAttemptRequest = await req.json();
    const {
      gameId,
      homeTeam,
      awayTeam,
      gameTime,
      kyivTime,
      liveUrl,
      liveSource,
    } = body;

    if (!gameId || !gameTime) {
      return NextResponse.json(
        { error: "Missing gameId or gameTime" },
        { status: 400 }
      );
    }

    // Find or create LiveSession
    let session = await prisma.liveSession.findUnique({
      where: { gameId },
    });

    if (!session) {
      // Create new session
      session = await prisma.liveSession.create({
        data: {
          gameId,
          homeTeam,
          awayTeam,
          gameTime: new Date(gameTime),
          kyivTime: new Date(kyivTime),
          firstSearchAt: new Date(),
          liveUrl: liveUrl || null,
          liveSource: liveSource || null,
          isActive: !!liveUrl, // Active if URL found
          checkCount: 1,
        },
      });

      return NextResponse.json({
        success: true,
        session,
        attempt: 1,
        canSearchAgain: true, // Can search again in 10 minutes
        message: "First search attempt recorded",
      });
    }

    // Already have a session - check if we can search again
    if (session.searchCompleted) {
      return NextResponse.json({
        success: false,
        canSearchAgain: false,
        attempt: null,
        message: "Search window closed for this game (10 minutes passed)",
      });
    }

    if (session.firstSearchAt && !session.secondSearchAt) {
      // This is the second search attempt
      const timeElapsed = Date.now() - session.firstSearchAt.getTime();
      const TEN_MINUTES = 10 * 60 * 1000;

      // Update with second search attempt
      const updated = await prisma.liveSession.update({
        where: { gameId },
        data: {
          secondSearchAt: new Date(),
          searchCompleted: true, // Close search window after second attempt
          liveUrl: liveUrl || session.liveUrl, // Use new URL if found, else keep old
          liveSource: liveSource || session.liveSource,
          isActive: !!(liveUrl || session.liveUrl), // Active if either attempt found URL
          checkCount: session.checkCount + 1,
          lastChecked: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        session: updated,
        attempt: 2,
        canSearchAgain: false, // No more searches after 2nd attempt
        timeElapsedSinceFirst: timeElapsed,
        message: "Second search attempt recorded. Search window now closed.",
      });
    }

    // firstSearchAt exists and secondSearchAt exists = searchCompleted should be true
    return NextResponse.json({
      success: false,
      canSearchAgain: false,
      attempt: null,
      message: "Search window already closed for this game",
    });
  } catch (error) {
    console.error("[/api/live-sessions/search-attempt] Error:", error);
    return NextResponse.json(
      { error: "Failed to record search attempt", details: String(error) },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
