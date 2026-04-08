import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const gameId = Number(req.nextUrl.searchParams.get("gameId"));
  if (!gameId) return NextResponse.json({ fact: null });

  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: { homeTeam: true, awayTeam: true },
  }).catch(() => null);
  if (!game || game.status !== "FINAL") return NextResponse.json({ fact: null });

  const topScorer = await prisma.boxScore.findFirst({
    where: { gameId },
    orderBy: { points: "desc" },
    include: { player: true },
  }).catch(() => null);

  const winner = game.homeScore > game.awayScore ? game.homeTeam : game.awayTeam;
  const margin = Math.abs(game.homeScore - game.awayScore);

  let fact = `${winner.shortName} перемогли з різницею ${margin} очок`;
  if (topScorer && topScorer.points >= 15) {
    fact = `${topScorer.player.firstName} ${topScorer.player.lastName} набрав ${topScorer.points} очок — найкращий гравець матчу`;
  }
  if (margin <= 3) fact = `Драматична перемога! ${winner.shortName} виграли лише ${margin} очки`;

  return NextResponse.json({ fact });
}
