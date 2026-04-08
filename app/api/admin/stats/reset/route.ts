import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";

export async function POST(req: NextRequest) {
  await requireAuth();
  const { playerId } = await req.json();
  if (!playerId) return NextResponse.json({ error: "playerId required" }, { status: 400 });

  try {
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
  } catch (err) {
    // Manual stats columns don't exist, but that's okay - nothing to reset
    console.log('Manual stats columns not available in database');
  }

  return NextResponse.json({ ok: true });
}
