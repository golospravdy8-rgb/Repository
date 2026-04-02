import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";
import { z } from "zod";

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

  return NextResponse.json({ ok: true });
}
