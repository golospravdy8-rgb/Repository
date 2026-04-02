import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";

export async function POST(req: NextRequest) {
  await requireAuth();
  const { phone } = await req.json();
  if (!phone) return NextResponse.json({ error: "phone required" }, { status: 400 });

  const mod = await prisma.chatModerator.findUnique({ where: { phone }, select: { name: true } });
  const name = mod?.name ?? phone;

  await prisma.chatModerator.deleteMany({ where: { phone } });

  await prisma.chatModAction.create({
    data: {
      action: "removeMod",
      modPhone: "admin",
      modName: "Адміністратор",
      targetPhone: phone,
      targetName: name,
      details: "Знято повноваження модератора",
    },
  });

  return NextResponse.json({ ok: true });
}
