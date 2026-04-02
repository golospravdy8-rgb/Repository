import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const listings = await prisma.marketplaceListing.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ listings });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { title, description, price, category, condition, seller, phone, imageUrl, emoji } = body;

  if (!title || !price || !category || !condition || !seller || !phone) {
    return NextResponse.json({ error: "Заповніть всі обов'язкові поля" }, { status: 400 });
  }

  const listing = await prisma.marketplaceListing.create({
    data: {
      title,
      description: description ?? "",
      price: Number(price),
      category,
      condition,
      seller,
      phone,
      imageUrl: imageUrl ?? null,
      emoji: emoji ?? "🏀",
      isActive: true,
    },
  });
  return NextResponse.json({ listing });
}

export async function DELETE(req: NextRequest) {
  const { id, phone } = await req.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const listing = await prisma.marketplaceListing.findUnique({ where: { id: Number(id) } });
  if (!listing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Check rights: owner (by phone) or admin (via cookie)
  const adminToken = req.cookies.get("admin_token")?.value;
  const isAdmin = adminToken === "ldbl_admin_2025";
  const isOwner = phone && listing.phone === phone;

  if (!isAdmin && !isOwner) {
    return NextResponse.json({ error: "Немає прав для видалення" }, { status: 403 });
  }

  await prisma.marketplaceListing.delete({ where: { id: Number(id) } });
  return NextResponse.json({ ok: true });
}
