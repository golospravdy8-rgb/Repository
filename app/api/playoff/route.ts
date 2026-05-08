import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/playoff?ageGroup=younger
export async function GET(req: NextRequest) {
  try {
    const ageGroup = req.nextUrl.searchParams.get("ageGroup") || "younger";

    // First try to get stored playoff data
    let playoff = await prisma.playoff.findUnique({
      where: { ageGroup },
    });

    // If no stored data, fetch from games with playoff stages
    if (!playoff) {
      const season = await prisma.season.findFirst({
        where: { isActive: true, ageGroup },
      });

      if (season) {
        const [semifinal1, semifinal2, final, thirdPlace] = await Promise.all([
          prisma.game.findFirst({
            where: { seasonId: season.id, stage: "semifinal", sourceA: "A1" },
            include: { homeTeam: true, awayTeam: true },
            orderBy: { scheduledAt: "asc" },
          }),
          prisma.game.findFirst({
            where: { seasonId: season.id, stage: "semifinal", sourceA: "B1" },
            include: { homeTeam: true, awayTeam: true },
            orderBy: { scheduledAt: "asc" },
          }),
          prisma.game.findFirst({
            where: { seasonId: season.id, stage: "final" },
            include: { homeTeam: true, awayTeam: true },
            orderBy: { scheduledAt: "asc" },
          }),
          prisma.game.findFirst({
            where: { seasonId: season.id, stage: "third_place" },
            include: { homeTeam: true, awayTeam: true },
            orderBy: { scheduledAt: "asc" },
          }),
        ]);

        playoff = {
          id: "generated",
          ageGroup,
          semifinal1TeamA: semifinal1?.homeTeam.name || null,
          semifinal1TeamB: semifinal1?.awayTeam.name || null,
          semifinal1ScoreA: semifinal1?.status === "FINAL" ? semifinal1.homeScore : null,
          semifinal1ScoreB: semifinal1?.status === "FINAL" ? semifinal1.awayScore : null,
          semifinal2TeamA: semifinal2?.homeTeam.name || null,
          semifinal2TeamB: semifinal2?.awayTeam.name || null,
          semifinal2ScoreA: semifinal2?.status === "FINAL" ? semifinal2.homeScore : null,
          semifinal2ScoreB: semifinal2?.status === "FINAL" ? semifinal2.awayScore : null,
          finalTeamA: final?.homeTeam.name || null,
          finalTeamB: final?.awayTeam.name || null,
          finalScoreA: final?.status === "FINAL" ? final.homeScore : null,
          finalScoreB: final?.status === "FINAL" ? final.awayScore : null,
          thirdPlaceTeamA: thirdPlace?.homeTeam.name || null,
          thirdPlaceTeamB: thirdPlace?.awayTeam.name || null,
          thirdPlaceScoreA: thirdPlace?.status === "FINAL" ? thirdPlace.homeScore : null,
          thirdPlaceScoreB: thirdPlace?.status === "FINAL" ? thirdPlace.awayScore : null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      }
    }

    return NextResponse.json(playoff || null);
  } catch (error) {
    console.error("❌ GET /api/playoff error:", error);
    return NextResponse.json(
      { error: "Failed to fetch playoff" },
      { status: 500 }
    );
  }
}

// POST /api/playoff (upsert)
export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    console.log("📤 POST /api/playoff called with:", JSON.stringify(data, null, 2));

    const playoff = await prisma.playoff.upsert({
      where: { ageGroup: data.ageGroup },
      update: {
        semifinal1TeamA: data.semifinal1TeamA,
        semifinal1TeamB: data.semifinal1TeamB,
        semifinal1ScoreA: data.semifinal1ScoreA,
        semifinal1ScoreB: data.semifinal1ScoreB,
        semifinal2TeamA: data.semifinal2TeamA,
        semifinal2TeamB: data.semifinal2TeamB,
        semifinal2ScoreA: data.semifinal2ScoreA,
        semifinal2ScoreB: data.semifinal2ScoreB,
        finalTeamA: data.finalTeamA,
        finalTeamB: data.finalTeamB,
        finalScoreA: data.finalScoreA,
        finalScoreB: data.finalScoreB,
        thirdPlaceTeamA: data.thirdPlaceTeamA,
        thirdPlaceTeamB: data.thirdPlaceTeamB,
        thirdPlaceScoreA: data.thirdPlaceScoreA,
        thirdPlaceScoreB: data.thirdPlaceScoreB,
      },
      create: {
        ageGroup: data.ageGroup,
        semifinal1TeamA: data.semifinal1TeamA,
        semifinal1TeamB: data.semifinal1TeamB,
        semifinal1ScoreA: data.semifinal1ScoreA,
        semifinal1ScoreB: data.semifinal1ScoreB,
        semifinal2TeamA: data.semifinal2TeamA,
        semifinal2TeamB: data.semifinal2TeamB,
        semifinal2ScoreA: data.semifinal2ScoreA,
        semifinal2ScoreB: data.semifinal2ScoreB,
        finalTeamA: data.finalTeamA,
        finalTeamB: data.finalTeamB,
        finalScoreA: data.finalScoreA,
        finalScoreB: data.finalScoreB,
        thirdPlaceTeamA: data.thirdPlaceTeamA,
        thirdPlaceTeamB: data.thirdPlaceTeamB,
        thirdPlaceScoreA: data.thirdPlaceScoreA,
        thirdPlaceScoreB: data.thirdPlaceScoreB,
      },
    });

    console.log("✅ Playoff saved:", JSON.stringify(playoff, null, 2));
    return NextResponse.json(playoff);
  } catch (error) {
    console.error("❌ POST /api/playoff error:", error);
    return NextResponse.json(
      { error: "Failed to save playoff" },
      { status: 500 }
    );
  }
}
