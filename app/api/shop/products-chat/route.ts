import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
export const runtime = 'nodejs';

export const dynamic = "force-dynamic";

const DEMO_PRODUCTS = [
  {
    id: 1, name: "М'яч баскетбольний Meteor Cellular", description: "", price: 1260, oldPrice: null,
    category: "М'ячі", emoji: "🏀", badge: null,
    imageUrl: "https://basket-lviv.com.ua/wp-content/uploads/2023/01/myach-1.jpg",
    sizes: "5,6,7", inStock: true, sortOrder: 0, showInChat: true, chatPriority: false,
  },
  {
    id: 2, name: "Кросівки Nike Air Zoom BB", description: "", price: 3200, oldPrice: 3800,
    category: "Взуття", emoji: "👟", badge: "Хіт",
    imageUrl: "https://basket-lviv.com.ua/wp-content/uploads/2023/01/shoes-1.jpg",
    sizes: "40,41,42,43", inStock: true, sortOrder: 1, showInChat: true, chatPriority: true,
  },
  {
    id: 3, name: "Форма баскетбольна Adidas", description: "", price: 890, oldPrice: null,
    category: "Форма", emoji: "👕", badge: null,
    imageUrl: "https://basket-lviv.com.ua/wp-content/uploads/2023/01/jersey-1.jpg",
    sizes: "S,M,L,XL", inStock: true, sortOrder: 2, showInChat: true, chatPriority: false,
  },
  {
    id: 4, name: "Баскетбольне кільце Spalding", description: "", price: 2100, oldPrice: null,
    category: "Обладнання", emoji: "🏅", badge: null,
    imageUrl: "https://basket-lviv.com.ua/wp-content/uploads/2023/01/ring-1.jpg",
    sizes: null, inStock: true, sortOrder: 3, showInChat: true, chatPriority: false,
  },
  {
    id: 5, name: "Насос для м'яча Wilson", description: "", price: 180, oldPrice: null,
    category: "Аксесуари", emoji: "🔧", badge: null,
    imageUrl: "https://basket-lviv.com.ua/wp-content/uploads/2023/01/pump-1.jpg",
    sizes: null, inStock: true, sortOrder: 4, showInChat: true, chatPriority: false,
  },
];

export async function GET() {
  try {
    const products = await prisma.shopProduct.findMany({
      where: { showInChat: true, inStock: true },
      orderBy: [{ chatPriority: "desc" }, { sortOrder: "asc" }],
      select: {
        id: true, name: true, description: true, price: true, oldPrice: true,
        category: true, emoji: true, badge: true, imageUrl: true,
        sizes: true, inStock: true, sortOrder: true, showInChat: true, chatPriority: true,
      },
    });

    if (products.length > 0) {
      return NextResponse.json({ products });
    }
  } catch {
    // DB not available, fall through to demo
  }

  return NextResponse.json({ products: DEMO_PRODUCTS });
}
