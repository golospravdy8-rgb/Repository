import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function serializeMsg(msg: any, isMod?: boolean) {
  return {
    id: msg.id,
    phone: msg.phone,
    name: msg.name,
    text: msg.text,
    roomId: msg.roomId,
    isMod: isMod ? 1 : 0,
    createdAt: msg.createdAt,
    replyTo: msg.replyTo
      ? {
          id: msg.replyTo.id,
          name: msg.replyTo.name,
          text: msg.replyTo.text?.substring(0, 100),
        }
      : null,
    reactions: msg.reactions || [],
  };
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const lastId = parseInt(url.searchParams.get("lastId") || "0", 10);
    const room = url.searchParams.get("room") || "general";

    // Fetch new messages since lastId
    const messages = await prisma.chatMessage.findMany({
      where: {
        id: { gt: lastId },
        roomId: room === "parents" ? "parents" : "general",
      },
      orderBy: { id: "asc"  },
      take: 50,
      include: { replyTo: true, reactions: true },
    });

    const serialized = messages.map((msg) => serializeMsg(msg, false));

    return Response.json({
      messages: serialized,
      events: [],
    });
  } catch (error) {
    console.error("Poll error:", error);
    return Response.json({ messages: [], events: [] }, { status: 500 });
  }
}
