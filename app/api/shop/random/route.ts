import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
export const runtime = 'nodejs';

export const dynamic = "force-dynamic";

const DEMO_PRODUCTS = [
  { id: 1, name: "М'яч баскетбольний Meteor Cellular", category: "М'ячі", price: 1260, image: "https://basket-lviv.com.ua/wp-content/uploads/2023/01/myach-1.jpg", sizes: ["5", "6", "7"], slug: "myach-meteor" },
  { id: 2, name: "Кросівки Nike Air Zoom BB", category: "Взуття", price: 3200, image: "https://basket-lviv.com.ua/wp-content/uploads/2023/01/shoes-1.jpg", sizes: ["40", "41", "42", "43"], slug: "nike-air-zoom" },
  { id: 3, name: "Форма баскетбольна Adidas", category: "Форма", price: 890, image: "https://basket-lviv.com.ua/wp-content/uploads/2023/01/jersey-1.jpg", sizes: ["S", "M", "L", "XL"], slug: "forma-adidas" },
  { id: 4, name: "Баскетбольне кільце Spalding", category: "Обладнання", price: 2100, image: "https://basket-lviv.com.ua/wp-content/uploads/2023/01/ring-1.jpg", sizes: [], slug: "kilce-spalding" },
  { id: 5, name: "Насос для м'яча Wilson", category: "Аксесуари", price: 180, image: "https://basket-lviv.com.ua/wp-content/uploads/2023/01/pump-1.jpg", sizes: [], slug: "nasos-wilson" },
];

export async function GET() {
  try {
    const count = await prisma.shopProduct.count({ where: { showInChat: true, inStock: true } });
    if (count > 0) {
      const skip = Math.floor(Math.random() * count);
      const product = await prisma.shopProduct.findFirst({
        where: { showInChat: true, inStock: true },
        skip,
        select: { id: true, name: true, category: true, price: true, imageUrl: true, sizes: true },
      });
      if (product) {
        return NextResponse.json({
          id: product.id,
          name: product.name,
          category: product.category,
          price: product.price,
          image: product.imageUrl?.split("|")[0] ?? null,
          sizes: product.sizes ? product.sizes.split(",").map(s => s.trim()).filter(Boolean) : [],
          slug: `product-${product.id}`,
        });
      }
    }
  } catch {
    // fall through
  }

  const item = DEMO_PRODUCTS[Math.floor(Math.random() * DEMO_PRODUCTS.length)];
  return NextResponse.json(item);
}
