const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const products = await prisma.shopProduct.findMany({
    where: { category: "М'ячі" },
    orderBy: { sortOrder: "asc" },
  });

  console.log(`\n📦 Товары в категории "М'ячі": ${products.length}\n`);
  products.forEach((p, i) => {
    console.log(`${i + 1}. ${p.name}`);
    console.log(`   Цена: ${p.price} грн`);
    console.log(`   Размеры: ${p.sizes}`);
    console.log(`   Изображение: ${p.imageUrl || "Отсутствует"}`);
    console.log(``);
  });

  await prisma.$disconnect();
}

main().catch((e) => console.error(e));
