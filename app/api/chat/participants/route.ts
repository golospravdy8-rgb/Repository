import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
export const runtime = 'nodejs';

export const dynamic = "force-dynamic";

interface ParticipantRow {
  phone: string;
  firstName: string;
  lastName: string;
  hp: number;
  role: string;
  isonline: boolean;
  joinedat: Date | null;
  leftat: Date | null;
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
        END AS isonline,
        co."joinedAt" AS joinedat,
        co."leftAt" AS leftat
      FROM "GuestContact" gc
      LEFT JOIN "ChatOnline" co ON co.phone = gc.phone
      WHERE gc.role = 'parent'
      ORDER BY isonline DESC, gc."firstName" ASC
    `;
  } else {
    // General room: all GuestContact users, sorted by online status then hp
    rows = await prisma.$queryRaw<ParticipantRow[]>`
      SELECT
        gc.phone,
        gc."firstName",
        gc."lastName",
        gc.hp,
        gc.role,
        CASE
          WHEN co."lastSeen" > NOW() - INTERVAL '2 minutes' AND co.room = 'general'
          THEN true
          ELSE false
        END AS isonline,
        co."joinedAt" AS joinedat,
        co."leftAt" AS leftat
      FROM "GuestContact" gc
      LEFT JOIN "ChatOnline" co ON co.phone = gc.phone
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
      joinedAt: r.joinedat,
      leftAt: r.leftat,
    })),
  });
}
