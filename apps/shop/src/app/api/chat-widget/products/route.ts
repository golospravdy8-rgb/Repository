import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const products = await prisma.shopProduct.findMany({
    where: { inStock: true, showInChat: true },
    orderBy: [{ chatPriority: "desc" }, { sortOrder: "asc" }],
    select: {
      id: true,
      name: true,
      description: true,
      price: true,
      oldPrice: true,
      imageUrl: true,
      emoji: true,
      chatPriority: true,
    },
  });

  return NextResponse.json(
    products.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      price: p.price,
      oldPrice: p.oldPrice,
      imageUrl: p.imageUrl,
      emoji: p.emoji,
      priority: p.chatPriority,
      productPageUrl: `http://localhost:3009`,
    }))
  );
}
