import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const gameId = parseInt(params.id);

  const events = await prisma.gameEvent.findMany({
    where: { gameId },
    include: {
      player: { select: { firstName: true, lastName: true, number: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json(events);
}
