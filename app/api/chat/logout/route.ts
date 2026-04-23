import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
export const runtime = 'nodejs';

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { phone } = await req.json().catch(() => ({}));
  if (!phone) return NextResponse.json({ error: "phone required" }, { status: 400 });

  await prisma.$executeRaw`
    UPDATE "ChatOnline"
    SET "leftAt" = NOW()
    WHERE phone = ${phone}
  `;

  return NextResponse.json({ ok: true });
}
