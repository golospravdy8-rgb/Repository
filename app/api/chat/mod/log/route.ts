import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";

export const dynamic = "force-dynamic";

// GET /api/chat/mod/log — moderation action log
export async function GET() {
  await requireAuth();

  const log = await prisma.chatModAction.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({
    log: log.map((e) => ({
      id: e.id,
      action: e.action,
      modName: e.modName,
      targetName: e.targetName,
      details: e.details,
      createdAt: e.createdAt.toISOString(),
    })),
  });
}
