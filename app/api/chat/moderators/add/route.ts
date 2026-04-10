import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";
export const runtime = 'nodejs';

export const dynamic = 'force-dynamic';


export async function POST(req: NextRequest) {
  await requireAuth();
  const { phone } = await req.json();
  if (!phone) return NextResponse.json({ error: "phone required" }, { status: 400 });

  // Resolve name from GuestContact
  const guest = await prisma.guestContact.findUnique({ where: { phone } });
  const name = guest
    ? `${guest.firstName} ${guest.lastName}`.trim()
    : phone;

  await prisma.$executeRaw`
    INSERT INTO "ChatModerator" (phone, name, "assignedBy", "addedAt")
    VALUES (${phone}, ${name}, ${"admin"}, NOW())
    ON CONFLICT (phone) DO UPDATE SET name = ${name}
  `;

  await prisma.chatModAction.create({
    data: {
      action: "addMod",
      modPhone: "admin",
      modName: "Адміністратор",
      targetPhone: phone,
      targetName: name,
      details: "Призначено модератором",
    },
  });

  return NextResponse.json({ ok: true, name });
}
