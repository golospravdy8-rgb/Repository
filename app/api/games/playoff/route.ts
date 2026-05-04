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

    // Create 4 playoff games
    const now = new Date();
    const semifinalDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // +7 days
    const finalDate = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // +14 days

    const games = await Promise.all([
      // Semifinal 1
      prisma.game.create({
        data: {
          seasonId: season.id,
          homeTeamId: 0, // Placeholder
          awayTeamId: 0, // Placeholder
          scheduledAt: semifinalDate,
          status: "SCHEDULED",
          stage: "semifinal",
          sourceA: "A1",
          sourceB: "B2",
        },
      }),
      // Semifinal 2
      prisma.game.create({
        data: {
          seasonId: season.id,
          homeTeamId: 0, // Placeholder
          awayTeamId: 0, // Placeholder
          scheduledAt: semifinalDate,
          status: "SCHEDULED",
          stage: "semifinal",
          sourceA: "B1",
          sourceB: "A2",
        },
      }),
      // Final
      prisma.game.create({
        data: {
          seasonId: season.id,
          homeTeamId: 0, // Placeholder
          awayTeamId: 0, // Placeholder
          scheduledAt: finalDate,
          status: "SCHEDULED",
          stage: "final",
          sourceA: "Winner SF1",
          sourceB: "Winner SF2",
        },
      }),
      // Third place
      prisma.game.create({
        data: {
          seasonId: season.id,
          homeTeamId: 0, // Placeholder
          awayTeamId: 0, // Placeholder
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
