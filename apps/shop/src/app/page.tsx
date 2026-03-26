import { prisma } from "@/lib/prisma";
import ShopClient from "./ShopClient";

export const dynamic = "force-dynamic";

export default async function ShopPage() {
  const products = await prisma.shopProduct.findMany({
    where: { inStock: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  return <ShopClient products={products} />;
}
