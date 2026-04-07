import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const scoreSchema = z.object({
  teamId: z.number().int(),
  playerId: z.number().int(),
  points: z.union([z.literal(1), z.literal(2), z.literal(3)]),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gameId = parseInt(id);
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    select: {
      id: true,
      homeScore: true,
      awayScore: true,
      quarter: true,
      status: true,
      homeTeam: { select: { id: true, name: true, shortName: true } },
      awayTeam: { select: { id: true, name: true, shortName: true } },
    },
  });

  if (!game) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(game);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gameId = parseInt(id);
  const body = await req.json();
  const parsed = scoreSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { teamId, playerId, points } = parsed.data;

  const game = await prisma.game.findUnique({ where: { id: gameId } });
  if (!game || game.status !== "LIVE") {
    return NextResponse.json({ error: "Game not live" }, { status: 400 });
  }

  const isHome = game.homeTeamId === teamId;

  await prisma.game.update({
    where: { id: gameId },
    data: isHome ? { homeScore: { increment: points } } : { awayScore: { increment: points } },
  });

  await prisma.gameEvent.create({
    data: { gameId, teamId, playerId, type: "POINTS", points, quarter: game.quarter },
  });

  const updated = await prisma.game.findUnique({
    where: { id: gameId },
    select: { homeScore: true, awayScore: true },
  });

  return NextResponse.json(updated);
}
