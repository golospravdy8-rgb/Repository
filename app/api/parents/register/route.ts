// FORCE ERROR TO TEST IF MODULE IS LOADED
if (process.env.NODE_ENV === "production") {
  const testError = new Error("[VERCEL_DEBUG] Module loaded at " + new Date().toISOString());
  console.error(testError);
  // Don't throw yet, just log to see if it appears
}

/* Debug: Runtime check */
if (typeof global === 'undefined' || !global.crypto) {
  console.error("[FATAL] Running on Edge Runtime! This route requires Node.js runtime.");
  throw new Error("Edge runtime detected — route requires nodejs");
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";
export const runtime = 'nodejs';

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    runtime: "nodejs",
    timestamp: new Date().toISOString()
  });
}

export async function POST(req: NextRequest) {
  console.log("[PARENTS/REGISTER] POST handler STARTED at", new Date().toISOString());
  console.log("[PARENTS/REGISTER] Runtime confirmed: nodejs");

  try {
    const body = await req.json().catch(() => ({}));
    console.log("[PARENTS/REGISTER] Body parsed:", Object.keys(body));

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

    const origin = req.headers.get("origin") || process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://basketball.lviv.ua";
    const refLink = `${origin}/chat?ref=${encodeURIComponent(phone)}`;

    return NextResponse.json({ ok: true, token, contact, refLink });
  } catch (error) {
    console.error("[POST /api/parents/register] ========== EXCEPTION START ==========");
    console.error("[POST /api/parents/register] Error Type:", typeof error);
    console.error("[POST /api/parents/register] Error instanceof Error:", error instanceof Error);
    console.error("[POST /api/parents/register] Error message:", error instanceof Error ? error.message : String(error));
    console.error("[POST /api/parents/register] Error name:", error instanceof Error ? error.name : "Unknown");
    console.error("[POST /api/parents/register] Error code:", (error as any)?.code);
    console.error("[POST /api/parents/register] Error severity:", (error as any)?.severity);
    console.error("[POST /api/parents/register] Error hint:", (error as any)?.hint);
    if (error instanceof Error) {
      console.error("[POST /api/parents/register] Stack:", error.stack);
    }
    console.error("[POST /api/parents/register] ========== EXCEPTION END ==========");

    return NextResponse.json(
      { error: "Помилка при реєстрації. Спробуйте пізніше." },
      { status: 500 }
    );
  }
}
