import { prisma } from "@/lib/prisma";
import https from "https";
import fs from "fs";
import path from "path";

// Ball products data from sportmaydan.com.ua
const ballProducts = [
  {
    name: "М'яч баскетбольний Meteor Cellular",
    description: "Якісний баскетбольний м'яч Meteor Cellular коричневого кольору з кремовими вставками. Розроблений для тренування та ігор.",
    price: 1260,
    category: "М'ячі",
    emoji: "🏀",
    sizes: "5,6,7",
    imageUrl: "meteor-cellular.jpg",
    sourceUrl: "https://sportmaydan.com.ua/m-yach-basketbolnyj-meteor-cellular-7-korychnevyj-kremovyj",
  },
  {
    name: "Nike EVERYDAY PLAYGROUND 8P GRAPHIC",
    description: "Баскетбольний м'яч Nike з графічним принтом. Ідеальний для гри на майданчику та тренування.",
    price: 1350,
    category: "М'ячі",
    emoji: "🏀",
    sizes: "7",
    imageUrl: "nike-playground-8p-graphic.jpg",
    sourceUrl: "https://sportmaydan.com.ua/index.php?route=product/product&product_id=20483",
  },
  {
    name: "Nike Everyday Playground 8P",
    description: "Надійний баскетбольний м'яч для гри на майданчику. Легкий та маневреність у керуванні.",
    price: 1200,
    category: "М'ячі",
    emoji: "🏀",
    sizes: "7",
    imageUrl: "nike-playground-8p.jpg",
    sourceUrl: "https://sportmaydan.com.ua/m-yach-basketbolnyj-nike-everyday-playground-8p-bvv-n-100-4498-085",
  },
  {
    name: "Nike Jordan BB Ultimate 8P",
    description: "Преміум баскетбольний м'яч Nike Jordan з улучшеною тримання. Для серйозних гравців.",
    price: 1950,
    category: "М'ячі",
    emoji: "🏀",
    sizes: "7",
    imageUrl: "nike-jordan-bb-ultimate-8p.jpg",
    sourceUrl: "https://sportmaydan.com.ua/m-yach-basketbolniy-nike-jordan-bb-ultimate-8p-white-university-blue-university-red",
  },
  {
    name: "Nike Jordan Legacy 2.0",
    description: "Класичний дизайн Nike Jordan. Надійний м'яч для тренування та змаганнь.",
    price: 1800,
    category: "М'ячі",
    emoji: "🏀",
    sizes: "7",
    imageUrl: "nike-jordan-legacy-2.0.jpg",
    sourceUrl: "https://sportmaydan.com.ua/index.php?route=product/product&product_id=20430",
  },
  {
    name: "Nike Everyday Playground Next Nature",
    description: "Екологічно чистий матеріал. Сучасна версія улюбленого м'яча для майданчику.",
    price: 1400,
    category: "М'ячі",
    emoji: "🏀",
    sizes: "7",
    imageUrl: "nike-playground-next-nature.jpg",
    sourceUrl: "https://sportmaydan.com.ua/m-yach-basketbolnyj-nike-everyday-playground-next-nature-8p-n-100-7037-973",
  },
  {
    name: "Wilson FIBA 3x3 MINI",
    description: "М'яч для гри 3x3. Компактний розмір, ідеальний для молоді та тренування.",
    price: 950,
    category: "М'ячі",
    emoji: "🏀",
    sizes: "5,6",
    imageUrl: "wilson-fiba-3x3-mini.jpg",
    sourceUrl: "https://sportmaydan.com.ua/m-yach-basketbolnyj-wilson-fiba-3x3-mini-wtb1733",
  },
  {
    name: "Wilson NBA DRV PRO",
    description: "Професійний баскетбольний м'яч Wilson для NBA. Найвищої якості.",
    price: 2400,
    category: "М'ячі",
    emoji: "🏀",
    sizes: "7",
    imageUrl: "wilson-nba-drv-pro.jpg",
    sourceUrl: "https://sportmaydan.com.ua/m-yach-basketbolnyj-wilson-nba-drv-pro",
  },
  {
    name: "Wilson NCAA ELEVATE VTX",
    description: "Баскетбольний м'яч для коледжу NCAA. Висока якість та надійність.",
    price: 1850,
    category: "М'ячі",
    emoji: "🏀",
    sizes: "7",
    imageUrl: "wilson-ncaa-elevate-vtx.jpg",
    sourceUrl: "https://sportmaydan.com.ua/m-yach-basketbolnyj-wilson-ncaa-elevate-vtx-bskt-orange-blue",
  },
  {
    name: "Wilson NCAA ELEVATE BSKT",
    description: "Надійний м'яч для коледжу з вдосконаленою контролем.",
    price: 1700,
    category: "М'ячі",
    emoji: "🏀",
    sizes: "7",
    imageUrl: "wilson-ncaa-elevate-bskt.jpg",
    sourceUrl: "https://sportmaydan.com.ua/m-yach-basketbolnyj-wilson-ncaa-ncaa-elevate-bskt-wz3007001",
  },
  {
    name: "Wilson REACTION Pro 295",
    description: "Вібір професійних гравців. М'яч з відмінним контролем і стійкістю.",
    price: 1550,
    category: "М'ячі",
    emoji: "🏀",
    sizes: "7",
    imageUrl: "wilson-reaction-pro-295.jpg",
    sourceUrl: "https://sportmaydan.com.ua/m-yach-basketbolnyj-wilson-reaction-pro-295",
  },
];

async function main() {
  console.log("🔄 Восстановление товаров-мячей...");

  // Удалить старые мячи из категории "М'ячі"
  const deleted = await prisma.shopProduct.deleteMany({
    where: { category: "М'ячі" },
  });
  console.log(`✅ Удалено ${deleted.count} старых мячей`);

  // Создать новые товары
  for (const ball of ballProducts) {
    const created = await prisma.shopProduct.create({
      data: {
        name: ball.name,
        description: ball.description,
        price: ball.price,
        category: ball.category,
        emoji: ball.emoji,
        sizes: ball.sizes,
        imageUrl: ball.imageUrl ? `/images/balls/${ball.imageUrl}` : null,
        inStock: true,
        sortOrder: ballProducts.indexOf(ball),
      },
    });
    console.log(`✅ Создан товар: ${created.name} (${created.price} грн)`);
  }

  console.log("✨ Восстановление завершено!");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("❌ Ошибка:", e.message);
  process.exit(1);
});
