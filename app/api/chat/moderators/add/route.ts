import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";

export async function POST(req: NextRequest) {
  await requireAuth();
  const { phone } = await req.json();
  if (!phone) return NextResponse.json({ error: "phone required" }, { status: 400 });

  // Resolve name from GuestContact
  const guest = await prisma.guestContact.findUnique({ where: { phone } });
  const name = guest
    ? `${guest.firstName} ${guest.lastName}`.trim()
    : phone;

  await prisma.chatModerator.upsert({
    where: { phone },
    update: { name },
    create: { phone, name, assignedBy: "admin" },
  });

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
