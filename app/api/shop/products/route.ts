import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";
export const runtime = 'nodejs';

export const dynamic = "force-dynamic";

export async function GET() {
  const products = await prisma.shopProduct.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return NextResponse.json({ products });
}

export async function POST(req: NextRequest) {
  try { await requireAuth(); } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const data = await req.json();
  const product = await prisma.shopProduct.create({ data });
  return NextResponse.json({ product });
}

export async function PUT(req: NextRequest) {
  try { await requireAuth(); } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id, ...data } = await req.json();
  const product = await prisma.shopProduct.update({ where: { id: Number(id) }, data });
  return NextResponse.json({ product });
}

export async function DELETE(req: NextRequest) {
  try { await requireAuth(); } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await req.json();
  await prisma.shopProduct.delete({ where: { id: Number(id) } });
  return NextResponse.json({ ok: true });
}
