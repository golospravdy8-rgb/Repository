import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface CreateStreamRequest {
  gameId: string;
  gameTitle: string;
  gameTime: string;
  kyivTime: string;
  streamUrl: string;
  submittedBy: string;
}

/**
 * GET /api/user-streams?gameId=xyz
 * Get all active user-submitted streams for a game
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const gameId = searchParams.get("gameId");

    const where = gameId
      ? { gameId, isActive: true }
      : { isActive: true };

    const streams = await prisma.userStream.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        gameId: true,
        gameTitle: true,
        gameTime: true,
        kyivTime: true,
        streamUrl: true,
        submittedBy: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      streams,
      count: streams.length,
    });
  } catch (error) {
    console.error("[/api/user-streams GET] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch user streams", streams: [] },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * POST /api/user-streams
 * Create a new user-submitted stream
 */
export async function POST(req: NextRequest) {
  try {
    const body: CreateStreamRequest = await req.json();
    const {
      gameId,
      gameTitle,
      gameTime,
      kyivTime,
      streamUrl,
      submittedBy,
    } = body;

    // Basic validation
    if (!gameId || !gameTitle || !gameTime || !streamUrl || !submittedBy) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate URL
    try {
      new URL(streamUrl);
    } catch {
      return NextResponse.json(
        { error: "Invalid stream URL" },
        { status: 400 }
      );
    }

    // Limit length
    if (streamUrl.length > 2048) {
      return NextResponse.json(
        { error: "Stream URL too long (max 2048 chars)" },
        { status: 400 }
      );
    }

    // Create stream
    const stream = await prisma.userStream.create({
      data: {
        gameId,
        gameTitle,
        gameTime: new Date(gameTime),
        kyivTime: new Date(kyivTime),
        streamUrl,
        submittedBy,
        isActive: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        stream,
        message: "Stream added successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[/api/user-streams POST] Error:", error);
    return NextResponse.json(
      { error: "Failed to create stream", details: String(error) },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
