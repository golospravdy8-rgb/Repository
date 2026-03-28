import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get("limit") ?? 50), 100);

  const [messages, pinned, mods] = await Promise.all([
    prisma.chatMessage.findMany({
      take: limit,
      orderBy: { createdAt: "desc" },
      include: { replyTo: true, reactions: true },
    }),
    prisma.chatPinnedMessage.findFirst(),
    prisma.chatModerator.findMany({ select: { phone: true } }),
  ]);

  const modPhones = new Set(mods.map((m) => m.phone));

  return Response.json({
    messages: messages.reverse().map((m) => ({
      id: m.id,
      phone: m.phone,
      name: m.name,
      text: m.text,
      createdAt: m.createdAt.toISOString(),
      isMod: modPhones.has(m.phone),
      replyTo: m.replyTo
        ? { id: m.replyTo.id, name: m.replyTo.name, text: m.replyTo.text }
        : null,
      reactions: m.reactions,
    })),
    pinnedMessage: pinned?.text ?? null,
  });
}
