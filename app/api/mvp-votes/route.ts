import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
export const runtime = 'nodejs';

export const dynamic = 'force-dynamic';


export async function GET() {
  const votes = await prisma.mvpVote.groupBy({
    by: ["playerName"],
    _count: { playerName: true },
    orderBy: { _count: { playerName: "desc" } },
    take: 10,
  });

  // Fetch photos for top player
  const topName = votes[0]?.playerName ?? null;
  let topPhoto: string | null = null;
  if (topName) {
    const parts = topName.trim().split(" ");
    const lastName = parts[parts.length - 1];
    const player = await prisma.player.findFirst({
      where: { lastName: { contains: lastName } },
      select: { photoUrl: true },
    });
    topPhoto = player?.photoUrl ?? null;
  }

  return NextResponse.json({
    top10: votes.map((v, i) => ({
      rank: i + 1,
      playerName: v.playerName,
      votes: v._count.playerName,
      photo: i === 0 ? topPhoto : null,
    })),
  });
}

export async function POST(req: NextRequest) {
  const { voterPhone, playerName } = await req.json();
  if (!voterPhone || !playerName?.trim()) {
    return NextResponse.json({ error: "Заповніть всі поля" }, { status: 400 });
  }
  const vote = await prisma.mvpVote.create({
    data: { voterPhone, playerName: playerName.trim() },
  });
  return NextResponse.json(vote);
}
