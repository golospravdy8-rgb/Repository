import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const CHAT_URL = process.env.CHAT_SERVER_URL || "http://localhost:3011";
const CHAT_SECRET = process.env.CHAT_ADMIN_SECRET || "ldbl_admin_2025";

export async function POST(req: NextRequest) {
  const { productId } = await req.json();
  if (!productId) return NextResponse.json({ error: "productId required" }, { status: 400 });

  const product = await prisma.shopProduct.findUnique({
    where: { id: Number(productId) },
    select: { id: true, name: true, description: true, price: true, oldPrice: true, imageUrl: true, emoji: true, chatPriority: true },
  });
  if (!product) return NextResponse.json({ error: "not found" }, { status: 404 });

  try {
    await fetch(`${CHAT_URL}/api/widget/push`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-secret": CHAT_SECRET },
      body: JSON.stringify({
        id: product.id,
        name: product.name,
        description: product.description,
        price: product.price,
        oldPrice: product.oldPrice,
        imageUrl: product.imageUrl,
        emoji: product.emoji,
        priority: product.chatPriority,
        productPageUrl: `http://localhost:3009`,
      }),
    });
  } catch {
    // chat server may be down — not a fatal error
  }

  return NextResponse.json({ ok: true });
}
