import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
export const runtime = 'nodejs';

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Get the most recent active poll with votes
    const poll = await prisma.chatPoll.findFirst({
      where: { isActive: true },
      include: { votes: true },
      orderBy: { createdAt: "desc" },
      take: 1,
    });

    if (!poll) {
      return NextResponse.json({ poll: null });
    }

    // Check if poll is "active" (has votes or was created less than 1 hour ago)
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 3600000);
    const hasVotes = poll.votes.length > 0;
    const isRecent = poll.createdAt >= oneHourAgo;

    if (!hasVotes && !isRecent) {
      return NextResponse.json({ poll: null });
    }

    // Format response
    const votesMap: Record<string, number> = {};
    const voteCounts = Array(poll.options.length).fill(0);

    poll.votes.forEach((vote) => {
      votesMap[vote.voterPhone] = vote.optionIdx;
      voteCounts[vote.optionIdx]++;
    });

    return NextResponse.json({
      poll: {
        id: poll.id,
        question: poll.question,
        options: poll.options,
        createdBy: poll.createdBy,
        createdAt: poll.createdAt.toISOString(),
        votes: votesMap,
        voteCounts,
      },
    });
  } catch (err) {
    console.error("[API] Get active poll failed:", err);
    return NextResponse.json({ poll: null }, { status: 500 });
  }
}
