import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";

export const dynamic = "force-dynamic";

// GET /api/chat/moderators — list all moderators
export async function GET() {
  await requireAuth();

  const mods = await prisma.chatModerator.findMany({ orderBy: { addedAt: "desc" } });

  return NextResponse.json({
    moderators: mods.map((m) => ({
      id: m.id,
      phone: m.phone,
      name: m.name,
      assignedBy: m.assignedBy,
      addedAt: m.addedAt.toISOString(),
    })),
  });
}
