const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const ballProducts = [
  {
    name: "М'яч баскетбольний Meteor Cellular",
    description: "Якісний баскетбольний м'яч Meteor Cellular коричневого кольору з кремовими вставками. Розроблений для тренування та ігор.",
    price: 1260,
    category: "М'ячі",
    emoji: "🏀",
    sizes: "5,6,7",
    imageUrl: "/images/balls/meteor-cellular.jpg",
  },
  {
    name: "Nike EVERYDAY PLAYGROUND 8P GRAPHIC",
    description: "Баскетбольний м'яч Nike з графічним принтом. Ідеальний для гри на майданчику та тренування.",
    price: 1350,
    category: "М'ячі",
    emoji: "🏀",
    sizes: "7",
    imageUrl: "/images/balls/nike-playground-8p-graphic.jpg",
  },
  {
    name: "Nike Everyday Playground 8P",
    description: "Надійний баскетбольний м'яч для гри на майданчику. Легкий та маневреність у керуванні.",
    price: 1200,
    category: "М'ячі",
    emoji: "🏀",
    sizes: "7",
    imageUrl: "/images/balls/nike-playground-8p.jpg",
  },
  {
    name: "Nike Jordan BB Ultimate 8P",
    description: "Преміум баскетбольний м'яч Nike Jordan з улучшеною тримання. Для серйозних гравців.",
    price: 1950,
    category: "М'ячі",
    emoji: "🏀",
    sizes: "7",
    imageUrl: "/images/balls/nike-jordan-bb-ultimate-8p.jpg",
  },
  {
    name: "Nike Jordan Legacy 2.0",
    description: "Класичний дизайн Nike Jordan. Надійний м'яч для тренування та змаганнь.",
    price: 1800,
    category: "М'ячі",
    emoji: "🏀",
    sizes: "7",
    imageUrl: "/images/balls/nike-jordan-legacy-2.0.jpg",
  },
  {
    name: "Nike Everyday Playground Next Nature",
    description: "Екологічно чистий матеріал. Сучасна версія улюбленого м'яча для майданчику.",
    price: 1400,
    category: "М'ячі",
    emoji: "🏀",
    sizes: "7",
    imageUrl: "/images/balls/nike-playground-next-nature.jpg",
  },
  {
    name: "Wilson FIBA 3x3 MINI",
    description: "М'яч для гри 3x3. Компактний розмір, ідеальний для молоді та тренування.",
    price: 950,
    category: "М'ячі",
    emoji: "🏀",
    sizes: "5,6",
    imageUrl: "/images/balls/wilson-fiba-3x3-mini.jpg",
  },
  {
    name: "Wilson NBA DRV PRO",
    description: "Професійний баскетбольний м'яч Wilson для NBA. Найвищої якості.",
    price: 2400,
    category: "М'ячі",
    emoji: "🏀",
    sizes: "7",
    imageUrl: "/images/balls/wilson-nba-drv-pro.jpg",
  },
  {
    name: "Wilson NCAA ELEVATE VTX",
    description: "Баскетбольний м'яч для коледжу NCAA. Висока якість та надійність.",
    price: 1850,
    category: "М'ячі",
    emoji: "🏀",
    sizes: "7",
    imageUrl: "/images/balls/wilson-ncaa-elevate-vtx.jpg",
  },
  {
    name: "Wilson NCAA ELEVATE BSKT",
    description: "Надійний м'яч для коледжу з вдосконаленою контролем.",
    price: 1700,
    category: "М'ячі",
    emoji: "🏀",
    sizes: "7",
    imageUrl: "/images/balls/wilson-ncaa-elevate-bskt.jpg",
  },
  {
    name: "Wilson REACTION Pro 295",
    description: "Вібір професійних гравців. М'яч з відмінним контролем і стійкістю.",
    price: 1550,
    category: "М'ячі",
    emoji: "🏀",
    sizes: "7",
    imageUrl: "/images/balls/wilson-reaction-pro-295.jpg",
  },
];

async function main() {
  try {
    console.log("🔄 Восстановление товаров-мячей...");

    // Удалить старые мячи
    const deleted = await prisma.shopProduct.deleteMany({
      where: { category: "М'ячі" },
    });
    console.log(`✅ Удалено ${deleted.count} старых мячей`);

    // Создать новые товары
    for (let i = 0; i < ballProducts.length; i++) {
      const ball = ballProducts[i];
      const created = await prisma.shopProduct.create({
        data: {
          name: ball.name,
          description: ball.description,
          price: ball.price,
          category: ball.category,
          emoji: ball.emoji,
          sizes: ball.sizes,
          imageUrl: ball.imageUrl,
          inStock: true,
          sortOrder: i,
        },
      });
      console.log(`✅ Создан: ${created.name} (${created.price} грн)`);
    }

    console.log("\n✨ Восстановление завершено! 11 товаров добавлено в БД");
  } catch (error) {
    console.error("❌ Ошибка:", error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
