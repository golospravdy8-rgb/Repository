import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";

export async function GET(req: NextRequest) {
  await requireAuth();
  const ag = req.nextUrl.searchParams.get("ag") || "younger";
  const season = await prisma.season.findFirst({ where: { isActive: true, ageGroup: ag } });
  if (!season) return NextResponse.json({ players: [] });

  // Get players with box scores
  const players = await prisma.player.findMany({
    where: { team: { seasonId: season.id } },
    include: {
      boxScores: {
        select: { points: true, rebounds: true, assists: true, blocks: true, steals: true },
      },
    },
    orderBy: [{ lastName: "asc" }],
  });

  // Get manual overrides via raw SQL (bypasses stale Prisma client cache)
  const manualRows = await prisma.$queryRaw<
    { id: number; manualPoints: number | null; manualRebounds: number | null; manualAssists: number | null; manualBlocks: number | null; manualSteals: number | null }[]
  >`
    SELECT id, "manualPoints", "manualRebounds", "manualAssists", "manualBlocks", "manualSteals"
    FROM "Player"
    WHERE "teamId" IN (SELECT id FROM "Team" WHERE "seasonId" = ${season.id})
  `;
  const manualMap = new Map(manualRows.map(r => [r.id, r]));

  const result = players.map(p => {
    const bs = p.boxScores;
    const bsPoints   = bs.reduce((s, b) => s + (b.points   || 0), 0);
    const bsRebounds = bs.reduce((s, b) => s + (b.rebounds || 0), 0);
    const bsAssists  = bs.reduce((s, b) => s + (b.assists  || 0), 0);
    const bsBlocks   = bs.reduce((s, b) => s + (b.blocks   || 0), 0);
    const bsSteals   = bs.reduce((s, b) => s + (b.steals   || 0), 0);

    const m = manualMap.get(p.id);
    // hasManualOverride only when at least one field is explicitly set (not NULL)
    const hasManual = !!(m && (
      m.manualPoints   !== null ||
      m.manualRebounds !== null ||
      m.manualAssists  !== null ||
      m.manualBlocks   !== null ||
      m.manualSteals   !== null
    ));

    return {
      id: p.id,
      firstName: p.firstName,
      lastName: p.lastName,
      points:   hasManual && m?.manualPoints   !== null ? Number(m!.manualPoints)   : bsPoints,
      rebounds: hasManual && m?.manualRebounds !== null ? Number(m!.manualRebounds) : bsRebounds,
      assists:  hasManual && m?.manualAssists  !== null ? Number(m!.manualAssists)  : bsAssists,
      blocks:   hasManual && m?.manualBlocks   !== null ? Number(m!.manualBlocks)   : bsBlocks,
      steals:   hasManual && m?.manualSteals   !== null ? Number(m!.manualSteals)   : bsSteals,
    };
  });

  return NextResponse.json({ players: result });
}
