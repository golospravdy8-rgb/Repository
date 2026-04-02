import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";

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
  const teamId = childTeamId ? Number(childTeamId) : null;

  const existingContact = await prisma.guestContact.findUnique({ where: { phone } }).catch(() => null);

  if (!existingContact) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO "GuestContact" ("phone", "firstName", "lastName", "role", "childTeamId", "displayName", "hp")
       VALUES ($1, $2, $3, $4, $5, $6, 25)`,
      phone, first, last, "parent", teamId, childName
    );
  } else if (existingContact.role !== "parent" && existingContact.role !== "player") {
    await prisma.$executeRawUnsafe(
      `UPDATE "GuestContact" SET "role"=$1, "firstName"=$2, "lastName"=$3, "childTeamId"=$4, "displayName"=$5 WHERE "phone"=$6`,
      "parent", first, last, teamId, childName, phone
    );
  }

  const contact = await prisma.guestContact.findUnique({ where: { phone } });

  // Session token valid for 30 days
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 30 * 24 * 3600 * 1000);

  await prisma.$executeRawUnsafe(
    `INSERT INTO "ParentSession" ("phone", "token", "name", "childTeamId", "expiresAt")
     VALUES ($1, $2, $3, $4, $5)`,
    phone, token, `${first} ${last}`, teamId, expiresAt
  );

  const origin = req.headers.get("origin") || process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://basket-lviv.com";
  const refLink = `${origin}/chat?ref=${encodeURIComponent(phone)}`;

  return NextResponse.json({ ok: true, token, contact, refLink });
}
