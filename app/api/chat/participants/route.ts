import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface ParticipantRow {
  phone: string;
  firstName: string;
  lastName: string;
  hp: number;
  role: string;
  isonline: boolean;
}

export async function GET(req: NextRequest) {
  const room = req.nextUrl.searchParams.get("room") ?? "general";

  let rows: ParticipantRow[];

  if (room === "parents") {
    // Parents room: only contacts with role='parent', sorted by online then name
    rows = await prisma.$queryRaw<ParticipantRow[]>`
      SELECT
        gc.phone,
        gc."firstName",
        gc."lastName",
        gc.hp,
        gc.role,
        CASE
          WHEN co."lastSeen" > NOW() - INTERVAL '2 minutes' AND co.room = 'parents'
          THEN true
          ELSE false
        END AS isonline
      FROM "GuestContact" gc
      LEFT JOIN "ChatOnline" co ON co.phone = gc.phone
      WHERE gc.role = 'parent'
      ORDER BY isonline DESC, gc."firstName" ASC
    `;
  } else {
    // General room: everyone who has ever sent a heartbeat for general,
    // plus league players — sorted online first then by hp
    rows = await prisma.$queryRaw<ParticipantRow[]>`
      SELECT
        gc.phone,
        gc."firstName",
        gc."lastName",
        gc.hp,
        gc.role,
        CASE
          WHEN co."lastSeen" > NOW() - INTERVAL '2 minutes'
          THEN true
          ELSE false
        END AS isonline
      FROM "GuestContact" gc
      INNER JOIN "ChatOnline" co ON co.phone = gc.phone
      WHERE co.room = 'general'
      ORDER BY isonline DESC, gc.hp DESC
    `;
  }

  const mods = await prisma.chatModerator.findMany({ select: { phone: true } });
  const modSet = new Set(mods.map((m) => m.phone));

  return NextResponse.json({
    members: rows.map((r) => ({
      phone: r.phone,
      firstName: r.firstName,
      lastName: r.lastName,
      hp: r.hp,
      role: r.role,
      isMod: modSet.has(r.phone),
      isOnline: r.isonline,
    })),
  });
}
