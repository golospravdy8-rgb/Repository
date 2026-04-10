import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
export const runtime = 'nodejs';

export const dynamic = "force-dynamic";

// Use a module-level client to avoid the global singleton caching issue
// when new models are added without full server restart
const db = new PrismaClient();

// GET — повернути всіх хто відмітився (скидається вручну)
export async function GET() {
  try {
    const list = await db.playgroundCheckin.findMany({
      orderBy: { checkinAt: "asc" },
    });

    return NextResponse.json({
      checkins: list.map((c) => ({
        phone: c.phone,
        name: c.name,
        status: c.status,
        checkinAt: c.checkinAt.toISOString(),
      })),
    });
  } catch (err) {
    console.error("[playground/checkin GET]", err);
    return NextResponse.json({ checkins: [] });
  }
}

// POST — зберегти / оновити відмітку
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.phone || !body?.name || !body?.status) {
    return NextResponse.json({ error: "phone, name, status required" }, { status: 400 });
  }

  const allowed = ["їду", "їду_20", "потрібен_1"];
  if (!allowed.includes(body.status)) {
    return NextResponse.json({ error: "invalid status" }, { status: 400 });
  }

  try {
    const checkin = await db.playgroundCheckin.upsert({
      where: { phone: body.phone },
      update: { name: body.name, status: body.status, checkinAt: new Date() },
      create: { phone: body.phone, name: body.name, status: body.status },
    });

    return NextResponse.json({
      checkin: {
        phone: checkin.phone,
        name: checkin.name,
        status: checkin.status,
        checkinAt: checkin.checkinAt.toISOString(),
      },
    });
  } catch (err) {
    console.error("[playground/checkin POST]", err);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}

// DELETE — видалити власну відмітку (деселект)
export async function DELETE(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.phone) return NextResponse.json({ error: "phone required" }, { status: 400 });

  try {
    await db.playgroundCheckin.deleteMany({ where: { phone: body.phone } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[playground/checkin DELETE]", err);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}
