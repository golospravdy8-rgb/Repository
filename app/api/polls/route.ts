import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const polls = await prisma.chatPoll.findMany({
      where: { isActive: true },
      include: { votes: true },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    const enriched = polls.map((p) => {
      const options = typeof p.options === "string" ? JSON.parse(p.options) : p.options;
      const voteCounts = (options as string[]).map((_, idx) =>
        p.votes.filter((v) => v.optionIdx === idx).length
      );
      const totalVotes = p.votes.length;
      return {
        ...p,
        options: options as string[],
        voteCounts,
        totalVotes,
      };
    });

    return NextResponse.json({ polls: enriched });
  } catch (e) {
    console.error("[polls GET]", e);
    return NextResponse.json({ polls: [] });
  }
}
