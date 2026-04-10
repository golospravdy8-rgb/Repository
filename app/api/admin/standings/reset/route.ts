import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";
export const runtime = 'nodejs';

export const dynamic = 'force-dynamic';


export async function POST(req: NextRequest) {
  await requireAuth();
  const { ag } = await req.json();
  const season = await prisma.season.findFirst({ where: { isActive: true, ageGroup: ag } });
  if (!season) return NextResponse.json({ error: "No season" }, { status: 404 });

  await prisma.standing.updateMany({
    where: { seasonId: season.id },
    data: { wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0, gamesPlayed: 0 },
  });

  return NextResponse.json({ ok: true });
}
