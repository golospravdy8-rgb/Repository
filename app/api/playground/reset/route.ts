import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
export const runtime = 'nodejs';

export const dynamic = "force-dynamic";

const db = new PrismaClient();

// POST — скинути всі відмітки (адмін або модератор чату)
export async function POST(req: NextRequest) {
  const adminToken = req.cookies.get("admin_token")?.value;
  const modPhone = req.headers.get("x-mod-phone");

  const isAdmin = adminToken === "ldbl_admin_2025";

  let isMod = false;
  if (!isAdmin && modPhone) {
    try {
      const mod = await db.chatModerator.findUnique({ where: { phone: modPhone } });
      isMod = !!mod;
    } catch {}
  }

  if (!isAdmin && !isMod) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  await db.playgroundCheckin.deleteMany({});
  return NextResponse.json({ ok: true, cleared: true });
}
