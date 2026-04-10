import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
export const runtime = 'nodejs';

export const dynamic = 'force-dynamic';

// Helper: Calculate voting period (1st-10th of current month)
function getVotingPeriod(now: Date) {
  const year = now.getFullYear();
  const month = now.getMonth();

  // Start: 1st of current month at 00:00:00
  const votingStartsAt = new Date(year, month, 1, 0, 0, 0);

  // End: 10th of current month at 23:59:59
  const votingEndsAt = new Date(year, month, 10, 23, 59, 59);

  return { votingStartsAt, votingEndsAt };
}

// Helper: Determine voting status
function getMvpStatus(now: Date, hasAnyVotes: boolean, userHasVoted: boolean) {
  const { votingStartsAt, votingEndsAt } = getVotingPeriod(now);
  const isVotingActive = now >= votingStartsAt && now <= votingEndsAt;

  if (!isVotingActive) {
    return "finished"; // Outside voting window
  }

  if (userHasVoted) {
    return "active_voted";
  }

  if (hasAnyVotes) {
    return "active_not_voted";
  }

  // Voting is active but nobody voted yet
  return "active_not_voted";
}

export async function GET(req: NextRequest) {
  try {
    const phone = req.nextUrl.searchParams.get("phone");
    if (!phone) {
      return NextResponse.json(
        { error: "Phone parameter required" },
        { status: 400 }
      );
    }

    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const { votingStartsAt, votingEndsAt } = getVotingPeriod(now);

    // Step 1: Get all active seasons
    const activeSeasons = await prisma.season.findMany({
      where: { isActive: true },
      select: { id: true },
    });

    if (activeSeasons.length === 0) {
      return NextResponse.json({
        currentLeader: null,
        allResults: [],
        userVote: null,
        month,
        status: "not_started",
        totalVotes: 0,
        votingStartsAt: votingStartsAt.toISOString(),
        votingEndsAt: votingEndsAt.toISOString(),
      });
    }

    const seasonIds = activeSeasons.map((s) => s.id);

    // Step 2: Get ALL ELIGIBLE PLAYERS
    const allEligiblePlayers = await prisma.player.findMany({
      where: {
        team: {
          seasonId: { in: seasonIds },
        },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        photoUrl: true,
        number: true,
        team: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
          },
        },
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    });

    // Step 3: Get vote counts for current month (by playerName)
    const voteCounts = await prisma.chatMvpVote.groupBy({
      by: ["playerName"],
      where: { month },
      _count: { id: true },
    });

    const voteMap = new Map(voteCounts.map((vc) => [vc.playerName, vc._count.id]));

    // Step 4: Build results with all players
    const allResults = allEligiblePlayers
      .map((player) => ({
        playerId: player.id,
        firstName: player.firstName,
        lastName: player.lastName,
        photoUrl: player.photoUrl,
        number: player.number,
        teamName: player.team.name,
        teamLogo: player.team.logoUrl,
        votes: voteMap.get(`${player.firstName} ${player.lastName}`) || 0,
      }))
      .sort((a, b) => {
        if (b.votes !== a.votes) return b.votes - a.votes;
        if (a.lastName !== b.lastName) return a.lastName.localeCompare(b.lastName);
        return a.firstName.localeCompare(b.firstName);
      });

    const currentLeader = allResults[0] || null;

    // Total votes = count of unique voters (voterPhone) for this month
    const uniqueVoters = await prisma.chatMvpVote.findMany({
      where: { month },
      select: { voterPhone: true },
      distinct: ["voterPhone"],
    });
    const totalVotes = uniqueVoters.length;
    const hasAnyVotes = totalVotes > 0;

    // Step 5: Get user's current vote
    const userVote = await prisma.chatMvpVote.findUnique({
      where: {
        voterPhone_month: {
          voterPhone: phone,
          month,
        },
      },
    });

    const userHasVoted = !!userVote;
    const status = getMvpStatus(now, hasAnyVotes, userHasVoted);

    return NextResponse.json({
      currentLeader,
      allResults,
      userVote: userVote
        ? {
            playerName: userVote.playerName,
          }
        : null,
      month,
      status,
      totalVotes,
      votingStartsAt: votingStartsAt.toISOString(),
      votingEndsAt: votingEndsAt.toISOString(),
    });
  } catch (error) {
    console.error("MVP vote GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch MVP votes" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { phone, playerId } = body;

    if (!phone || !playerId) {
      return NextResponse.json(
        { error: "Phone and playerId required" },
        { status: 400 }
      );
    }

    // Fetch player to get full name
    const player = await prisma.player.findUnique({
      where: { id: playerId },
    });

    if (!player) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }

    const playerName = `${player.firstName} ${player.lastName}`;

    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const { votingStartsAt, votingEndsAt } = getVotingPeriod(now);

    // Check if voting is active
    if (now < votingStartsAt || now > votingEndsAt) {
      return NextResponse.json(
        { error: "Voting is not active right now. Voting period is 1st-10th of each month." },
        { status: 403 }
      );
    }

    // Check if player's season is active
    const playerWithSeason = await prisma.player.findUnique({
      where: { id: playerId },
      include: {
        team: {
          include: {
            season: true,
          },
        },
      },
    });

    if (!playerWithSeason || !playerWithSeason.team.season.isActive) {
      return NextResponse.json({ error: "Player's season is not active" }, { status: 400 });
    }

    // Upsert vote (one vote per phone per month)
    await prisma.chatMvpVote.upsert({
      where: {
        voterPhone_month: {
          voterPhone: phone,
          month,
        },
      },
      update: {
        playerName,
      },
      create: {
        voterPhone: phone,
        playerName,
        month,
      },
    });

    return NextResponse.json({
      success: true,
      month,
    });
  } catch (error) {
    console.error("MVP vote POST error:", error);
    return NextResponse.json(
      { error: "Failed to submit MVP vote" },
      { status: 500 }
    );
  }
}
