import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";

export async function POST(req: NextRequest) {
  await requireAuth();
  const { playerId } = await req.json();
  if (!playerId) return NextResponse.json({ error: "playerId required" }, { status: 400 });

  await prisma.$executeRaw`
    UPDATE "Player"
    SET
      "manualPoints"   = NULL,
      "manualRebounds" = NULL,
      "manualAssists"  = NULL,
      "manualBlocks"   = NULL,
      "manualSteals"   = NULL
    WHERE id = ${playerId}
  `;

  return NextResponse.json({ ok: true });
}
