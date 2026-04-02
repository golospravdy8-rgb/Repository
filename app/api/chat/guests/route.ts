import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";

export const dynamic = "force-dynamic";

// GET /api/chat/guests — list all chat participants for admin moderator picker
export async function GET() {
  await requireAuth();

  const guests = await prisma.guestContact.findMany({
    select: { phone: true, firstName: true, lastName: true, hp: true, role: true },
    orderBy: { hp: "desc" },
  });

  return NextResponse.json({
    guests: guests.map((g) => ({
      phone: g.phone,
      name: `${g.firstName} ${g.lastName}`.trim(),
      hp: g.hp,
      role: g.role,
    })),
  });
}
