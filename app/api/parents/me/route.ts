import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const session = await prisma.parentSession.findUnique({ where: { token } }).catch(() => null);
  if (!session) return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  if (session.expiresAt && session.expiresAt < new Date()) {
    await prisma.parentSession.delete({ where: { token } }).catch(() => {});
    return NextResponse.json({ error: "Token expired" }, { status: 401 });
  }

  const contact = await prisma.guestContact.findUnique({ where: { phone: session.phone } }).catch(() => null);
  if (!contact) return NextResponse.json({ error: "Contact not found" }, { status: 404 });

  return NextResponse.json({ contact });
}
