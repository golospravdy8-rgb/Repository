import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";
export const runtime = 'nodejs';

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { phone, firstName, lastName, name, childTeamId, childFirstName, childLastName } = body;

  // Support both firstName+lastName and legacy name field
  const first = (firstName || (name ? name.split(" ")[0] : "")).trim();
  const last = (lastName || (name ? name.split(" ").slice(1).join(" ") : "")).trim();

  if (!phone || !first || !last) {
    return NextResponse.json({ error: "Ім'я, прізвище та телефон обов'язкові" }, { status: 400 });
  }

  // displayName stores child's full name for parent accounts
  const childName = childFirstName && childLastName ? `${childFirstName} ${childLastName}`.trim() : null;

  const existingContact = await prisma.guestContact.findUnique({ where: { phone } }).catch(() => null);

  if (!existingContact) {
    await prisma.guestContact.create({
      data: {
        phone,
        firstName: first,
        lastName: last,
        hp: 25,
        role: "parent",
        childTeamId: childTeamId ? Number(childTeamId) : null,
        displayName: childName,
      },
    });
  } else if (existingContact.role !== "parent" && existingContact.role !== "player") {
    await prisma.guestContact.update({
      where: { phone },
      data: { role: "parent", firstName: first, lastName: last, childTeamId: childTeamId ? Number(childTeamId) : null, displayName: childName },
    });
  }

  const contact = await prisma.guestContact.findUnique({ where: { phone } });

  // Session token valid for 30 days
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 30 * 24 * 3600 * 1000);

  await prisma.parentSession.create({
    data: { phone, token, name: `${first} ${last}`, childTeamId: childTeamId ? Number(childTeamId) : null, expiresAt },
  });

  const origin = req.headers.get("origin") || process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://basket-lviv.com";
  const refLink = `${origin}/chat?ref=${encodeURIComponent(phone)}`;

  return NextResponse.json({ ok: true, token, contact, refLink });
}
