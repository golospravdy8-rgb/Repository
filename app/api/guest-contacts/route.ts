import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const contacts = await prisma.guestContact.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ contacts });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await prisma.guestContact.delete({ where: { id: Number(id) } });
  return NextResponse.json({ ok: true });
}

// Called from chat server when user registers
export async function POST(req: NextRequest) {
  const { phone, firstName, lastName, refCode } = await req.json();
  if (!phone || !firstName || !lastName) {
    return NextResponse.json({ error: "Заповніть всі поля" }, { status: 400 });
  }

  const existing = await prisma.guestContact.findUnique({ where: { phone } });
  if (existing) {
    return NextResponse.json({ contact: existing, isNew: false });
  }

  // Give +50 HP to referrer if refCode provided
  if (refCode) {
    await prisma.guestContact.updateMany({
      where: { phone: refCode },
      data: { hp: { increment: 50 } },
    });
  }

  const contact = await prisma.guestContact.create({
    data: { phone, firstName, lastName, refCode: refCode || null, hp: 25 },
  });
  return NextResponse.json({ contact, isNew: true });
}
