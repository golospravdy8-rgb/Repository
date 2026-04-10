import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";
import { z } from "zod";
export const runtime = 'nodejs';

export const dynamic = 'force-dynamic';


const schema = z.object({
  playerId: z.number().int().positive(),
  points: z.number().int().min(0),
  rebounds: z.number().int().min(0),
  assists: z.number().int().min(0),
  blocks: z.number().int().min(0),
  steals: z.number().int().min(0),
});

export async function POST(req: NextRequest) {
  await requireAuth();
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid data" }, { status: 400 });

  const { playerId, points, rebounds, assists, blocks, steals } = parsed.data;

  try {
    await prisma.$executeRaw`
      UPDATE "Player"
      SET
        "manualPoints"   = ${points},
        "manualRebounds" = ${rebounds},
        "manualAssists"  = ${assists},
        "manualBlocks"   = ${blocks},
        "manualSteals"   = ${steals}
      WHERE id = ${playerId}
    `;
  } catch (err) {
    // Manual stats columns don't exist in database
    console.log('Manual stats columns not available in database:', err);
    return NextResponse.json({ error: "Manual stats not supported in current database" }, { status: 501 });
  }

  return NextResponse.json({ ok: true });
}
