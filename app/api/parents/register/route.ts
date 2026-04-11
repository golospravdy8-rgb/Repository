import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";
export const runtime = 'nodejs';

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  console.log("[START] Route handler called");

  try {
    console.log("[POST /api/parents/register] Request received");
    const body = await req.json().catch(() => ({}));
    const { phone, firstName, lastName, name, childTeamId, childFirstName, childLastName } = body;

    console.log("[POST /api/parents/register] Body parsed:", { phone, firstName, lastName });

    // Support both firstName+lastName and legacy name field
    const first = (firstName || (name ? name.split(" ")[0] : "")).trim();
    const last = (lastName || (name ? name.split(" ").slice(1).join(" ") : "")).trim();

    console.log("[POST /api/parents/register] First/Last names extracted:", { first, last });

    if (!phone || !first || !last) {
      return NextResponse.json({ error: "Ім'я, прізвище та телефон обов'язкові" }, { status: 400 });
    }

    // displayName stores child's full name for parent accounts
    const childName = childFirstName && childLastName ? `${childFirstName} ${childLastName}`.trim() : null;

    console.log("[POST /api/parents/register] About to query guestContact with phone:", phone);
    const existingContact = await prisma.guestContact.findUnique({ where: { phone } }).catch((err) => {
      console.error("[POST /api/parents/register] Error in findUnique:", err);
      return null;
    });

    if (!existingContact) {
      console.log("[POST /api/parents/register] Creating new guestContact");
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
      }).catch((err) => {
        console.error("[POST /api/parents/register] Error in create:", err);
        throw err;
      });
      console.log("[POST /api/parents/register] guestContact created successfully");
    } else if (existingContact.role !== "parent" && existingContact.role !== "player") {
      console.log("[POST /api/parents/register] Updating existing guestContact to parent role");
      await prisma.guestContact.update({
        where: { phone },
        data: { role: "parent", firstName: first, lastName: last, childTeamId: childTeamId ? Number(childTeamId) : null, displayName: childName },
      }).catch((err) => {
        console.error("[POST /api/parents/register] Error in update:", err);
        throw err;
      });
      console.log("[POST /api/parents/register] guestContact updated successfully");
    }

    console.log("[POST /api/parents/register] Fetching contact for response");
    const contact = await prisma.guestContact.findUnique({ where: { phone } }).catch((err) => {
      console.error("[POST /api/parents/register] Error fetching contact:", err);
      throw err;
    });

    // Session token valid for 30 days
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 30 * 24 * 3600 * 1000);

    console.log("[POST /api/parents/register] Creating parentSession with token");
    await prisma.parentSession.create({
      data: { phone, token, name: `${first} ${last}`, childTeamId: childTeamId ? Number(childTeamId) : null, expiresAt },
    }).catch((err) => {
      console.error("[POST /api/parents/register] Error creating parentSession:", err);
      throw err;
    });
    console.log("[POST /api/parents/register] parentSession created successfully");

    const origin = req.headers.get("origin") || process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://basketball.lviv.ua";
    const refLink = `${origin}/chat?ref=${encodeURIComponent(phone)}`;
    console.log("[POST /api/parents/register] Success! Returning response");

    return NextResponse.json({ ok: true, token, contact, refLink });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    const errorCode = (error as any)?.code;
    const errorSeverity = (error as any)?.severity;
    const errorHint = (error as any)?.hint;
    const errorStack = error instanceof Error ? error.stack : null;

    console.error("[POST /api/parents/register] ERROR DETAILS:", {
      timestamp: new Date().toISOString(),
      message: errorMsg,
      name: error instanceof Error ? error.name : "Unknown",
      code: errorCode,
      severity: errorSeverity,
      hint: errorHint,
      stack: errorStack,
      env: {
        NODE_ENV: process.env.NODE_ENV,
        DATABASE_URL_MASKED: process.env.DATABASE_URL ? "***SET***" : "NOT_SET",
      },
    });

    return NextResponse.json(
      { error: "Помилка при реєстрації. Спробуйте пізніше." },
      { status: 500 }
    );
  }
}
