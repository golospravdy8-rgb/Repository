import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ageGroup } = body;

    if (!ageGroup || !["younger", "older"].includes(ageGroup)) {
      return NextResponse.json({ error: "Valid ageGroup required" }, { status: 400 });
    }

    // Find active season for this age group
    const season = await prisma.season.findFirst({
      where: { isActive: true, ageGroup },
    });

    if (!season) {
      return NextResponse.json({ error: "Season not found" }, { status: 404 });
    }

    // Check if playoff games already exist
    const existingPlayoff = await prisma.game.findFirst({
      where: {
        seasonId: season.id,
        stage: { not: null },
      },
    });

    if (existingPlayoff) {
      return NextResponse.json(
        { error: "Playoff games already exist for this season" },
        { status: 409 }
      );
    }

    // Get standings sorted by rank (best teams first)
    const standings = await prisma.standing.findMany({
      where: { seasonId: season.id },
      orderBy: { rank: "asc" },
      include: { team: true },
    });

    if (standings.length < 4) {
      return NextResponse.json(
        { error: "Need at least 4 teams to create playoff" },
        { status: 400 }
      );
    }

    // Take top 4 teams from standings: ranks 1-2 are A1/A2, ranks 3-4 are B1/B2
    // This is the most reliable way without matching name strings
    const A1 = standings[0];
    const A2 = standings[1];
    const B1 = standings[2];
    const B2 = standings[3];

    if (!A1 || !A2 || !B1 || !B2) {
      return NextResponse.json(
        { error: "Could not determine playoff teams" },
        { status: 400 }
      );
    }

    // Create 4 playoff games with real team IDs
    const now = new Date();
    const semifinalDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // +7 days
    const finalDate = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // +14 days

    const games = await Promise.all([
      // Semifinal 1: A1 vs B2
      prisma.game.create({
        data: {
          seasonId: season.id,
          homeTeamId: A1.teamId,
          awayTeamId: B2.teamId,
          scheduledAt: semifinalDate,
          status: "SCHEDULED",
          stage: "semifinal",
          sourceA: "A1",
          sourceB: "B2",
        },
      }),
      // Semifinal 2: B1 vs A2
      prisma.game.create({
        data: {
          seasonId: season.id,
          homeTeamId: B1.teamId,
          awayTeamId: A2.teamId,
          scheduledAt: semifinalDate,
          status: "SCHEDULED",
          stage: "semifinal",
          sourceA: "B1",
          sourceB: "A2",
        },
      }),
      // Final: Winners (placeholder, will be filled after semifinals)
      prisma.game.create({
        data: {
          seasonId: season.id,
          homeTeamId: A1.teamId, // Placeholder, will be updated after semifinals
          awayTeamId: B1.teamId, // Placeholder, will be updated after semifinals
          scheduledAt: finalDate,
          status: "SCHEDULED",
          stage: "final",
          sourceA: "Winner SF1",
          sourceB: "Winner SF2",
        },
      }),
      // Third place: Losers (placeholder, will be filled after semifinals)
      prisma.game.create({
        data: {
          seasonId: season.id,
          homeTeamId: A2.teamId, // Placeholder, will be updated after semifinals
          awayTeamId: B2.teamId, // Placeholder, will be updated after semifinals
          scheduledAt: finalDate,
          status: "SCHEDULED",
          stage: "third_place",
          sourceA: "Loser SF1",
          sourceB: "Loser SF2",
        },
      }),
    ]);

    return NextResponse.json({ success: true, games }, { status: 201 });
  } catch (error) {
    console.error("[playoff-post]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
