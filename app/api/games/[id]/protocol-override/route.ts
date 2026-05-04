import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAuth } from "@/lib/require-auth";

export const runtime = "nodejs";

const protocolOverrideSchema = z.object({
  fieldPath: z.string().min(1),
  oldValue: z.string().optional(),
  newValue: z.string().optional(),
  reason: z.string().default(""),
}).strict();

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAuth();

    const gameId = parseInt(params.id);
    if (isNaN(gameId)) {
      return NextResponse.json({ error: "Invalid game ID" }, { status: 400 });
    }

    const body = await request.json();
    const validData = protocolOverrideSchema.parse(body);

    // Create both override record and audit log
    await prisma.$transaction([
      prisma.protocolOverride.create({
        data: {
          gameId,
          fieldPath: validData.fieldPath,
          oldValue: validData.oldValue || null,
          newValue: validData.newValue || null,
          reason: validData.reason,
          createdBy: "admin", // TODO: get from session
        },
      }),
      prisma.protocolAuditLog.create({
        data: {
          gameId,
          action: "override",
          details: `${validData.fieldPath}: "${validData.oldValue}" → "${validData.newValue}"`,
          createdBy: "admin", // TODO: get from session
        },
      }),
    ]);

    revalidatePath(`/game/${gameId}/secretarial-protocol`);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request body", issues: error.issues }, { status: 400 });
    }
    console.error("[protocol-override]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
