import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get("limit") ?? 50), 100);
  const room = searchParams.get("room") ?? "general";

  // Guard parents room: require parent_token or admin_token
  if (room === "parents") {
    const adminToken = req.cookies.get("admin_token")?.value;
    const isAdmin = !!adminToken && adminToken.length > 10;
    if (!isAdmin) {
      const authHeader = req.headers.get("authorization") ?? "";
      const parentToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
      if (parentToken) {
        const session = await prisma.parentSession.findUnique({ where: { token: parentToken } });
        if (!session || (session.expiresAt && session.expiresAt < new Date())) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }
      } else {
        const phone = searchParams.get("phone");
        if (phone) {
          const contact = await prisma.guestContact.findUnique({ where: { phone } });
          if (!contact || (contact.role !== "parent" && contact.role !== "player")) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
          }
        } else {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }
      }
    }
  }

  // Build where filter: general catches NULL and "general"; parents catches "parents"
  const roomWhere: Prisma.ChatMessageWhereInput =
    room === "general"
      ? { OR: [{ roomId: "general" }, { roomId: undefined }] }
      : { roomId: room };

  const [messages, pinned, mods] = await Promise.all([
    prisma.chatMessage.findMany({
      take: limit,
      where: roomWhere,
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
      roomId: m.roomId,
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
