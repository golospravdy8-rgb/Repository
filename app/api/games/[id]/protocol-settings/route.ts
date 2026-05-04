import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

export const runtime = "nodejs";

const protocolSettingsSchema = z.object({
  referee: z.string().optional(),
  umpire1: z.string().optional(),
  umpire2: z.string().optional(),
  scorer: z.string().optional(),
  assistantScorer: z.string().optional(),
  timer: z.string().optional(),
  shotClockOperator: z.string().optional(),
  gameNumber: z.string().optional(),
  protest: z.boolean().optional(),
  protestNote: z.string().optional(),
}).strict();

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const gameId = parseInt(params.id);
    if (isNaN(gameId)) {
      return NextResponse.json({ error: "Invalid game ID" }, { status: 400 });
    }

    const body = await request.json();
    const validData = protocolSettingsSchema.parse(body);

    // Build update object, only include non-undefined fields
    const updateData: any = {};
    if (validData.referee !== undefined) updateData.referee = validData.referee || null;
    if (validData.umpire1 !== undefined) updateData.umpire1 = validData.umpire1 || null;
    if (validData.umpire2 !== undefined) updateData.umpire2 = validData.umpire2 || null;
    if (validData.scorer !== undefined) updateData.scorer = validData.scorer || null;
    if (validData.assistantScorer !== undefined) updateData.assistantScorer = validData.assistantScorer || null;
    if (validData.timer !== undefined) updateData.timer = validData.timer || null;
    if (validData.shotClockOperator !== undefined) updateData.shotClockOperator = validData.shotClockOperator || null;
    if (validData.gameNumber !== undefined) updateData.gameNumber = validData.gameNumber || null;
    if (validData.protest !== undefined) updateData.protest = validData.protest;
    if (validData.protestNote !== undefined) updateData.protestNote = validData.protestNote || null;

    await prisma.game.update({
      where: { id: gameId },
      data: updateData,
    });

    revalidatePath(`/game/${gameId}/secretarial-protocol`);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request body", issues: error.issues }, { status: 400 });
    }
    console.error("[protocol-settings]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
