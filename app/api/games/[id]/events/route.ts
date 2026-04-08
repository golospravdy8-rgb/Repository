import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';


export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gameId = parseInt(id);

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
