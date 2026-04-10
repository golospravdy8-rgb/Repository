"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export interface ChatPollData {
  id: number;
  question: string;
  options: string[];
  createdBy: string;
  createdAt: string;
  votes: Record<string, number>; // { voterPhone: optionIdx }
  voteCounts: number[]; // counts per option
}

/**
 * Create a new poll in the chat
 */
export async function createChatPoll(
  question: string,
  options: string[],
  createdByPhone: string,
  createdByName: string
): Promise<ChatPollData | null> {
  if (!question.trim() || options.length < 2 || options.some((o) => !o.trim())) {
    return null;
  }

  try {
    const poll = await prisma.chatPoll.create({
      data: {
        question: question.trim(),
        options: options.map((o) => o.trim()),
        createdBy: createdByName,
      },
      include: {
        votes: true,
      },
    });

    revalidatePath("/chat");

    return formatPollData(poll);
  } catch (err) {
    console.error("[ChatPoll] Create failed:", err);
    return null;
  }
}

/**
 * Vote on a poll option
 */
export async function voteOnChatPoll(
  pollId: number,
  optionIdx: number,
  voterPhone: string
): Promise<ChatPollData | null> {
  if (optionIdx < 0) {
    return null;
  }

  try {
    // Check if poll exists and optionIdx is valid
    const poll = await prisma.chatPoll.findUnique({
      where: { id: pollId },
    });

    if (!poll || optionIdx >= poll.options.length) {
      return null;
    }

    // Check if user already voted
    const existing = await prisma.chatPollVote.findUnique({
      where: {
        pollId_voterPhone: {
          pollId,
          voterPhone,
        },
      },
    });

    if (existing) {
      // Return current poll state without voting again
      const updated = await prisma.chatPoll.findUnique({
        where: { id: pollId },
        include: { votes: true },
      });
      return updated ? formatPollData(updated) : null;
    }

    // Record the vote
    await prisma.chatPollVote.create({
      data: {
        pollId,
        voterPhone,
        optionIdx,
      },
    });

    // Fetch updated poll
    const updated = await prisma.chatPoll.findUnique({
      where: { id: pollId },
      include: { votes: true },
    });

    revalidatePath("/chat");

    return updated ? formatPollData(updated) : null;
  } catch (err) {
    console.error("[ChatPoll] Vote failed:", err);
    return null;
  }
}

/**
 * Finish/close an active poll
 */
export async function finishChatPoll(pollId: number): Promise<boolean> {
  try {
    await prisma.chatPoll.update({
      where: { id: pollId },
      data: { isActive: false },
    });

    revalidatePath("/chat");
    return true;
  } catch (err) {
    console.error("[ChatPoll] Finish failed:", err);
    return false;
  }
}

/**
 * Get the most active poll (has votes and is recent)
 */
export async function getActiveChatPoll(): Promise<ChatPollData | null> {
  try {
    // Get the most recent active poll with votes
    const poll = await prisma.chatPoll.findFirst({
      where: { isActive: true },
      include: { votes: true },
      orderBy: { createdAt: "desc" },
      take: 1,
    });

    if (!poll) return null;

    // Check if poll is "active" (has votes or was created less than 1 hour ago)
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 3600000);
    const hasVotes = poll.votes.length > 0;
    const isRecent = poll.createdAt >= oneHourAgo;

    if (!hasVotes && !isRecent) {
      return null;
    }

    return formatPollData(poll);
  } catch (err) {
    console.error("[ChatPoll] Get active failed:", err);
    return null;
  }
}

/**
 * Format poll data for frontend
 */
function formatPollData(poll: {
  id: number;
  question: string;
  options: string[];
  createdBy: string;
  createdAt: Date;
  votes: Array<{ voterPhone: string; optionIdx: number }>;
}): ChatPollData {
  const votesMap: Record<string, number> = {};
  const voteCounts = Array(poll.options.length).fill(0);

  poll.votes.forEach((vote) => {
    votesMap[vote.voterPhone] = vote.optionIdx;
    voteCounts[vote.optionIdx]++;
  });

  return {
    id: poll.id,
    question: poll.question,
    options: poll.options,
    createdBy: poll.createdBy,
    createdAt: poll.createdAt.toISOString(),
    votes: votesMap,
    voteCounts,
  };
}
