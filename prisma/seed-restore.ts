import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding shop products...");

  // Shop products
  const products = [
    { name: "М'яч баскетбольний Wilson NBA", description: "Офіційний м'яч NBA, розмір 7", price: 1300, oldPrice: 1500, category: "М'ячі", emoji: "🏀", badge: "ХІТ", imageUrl: "/uploads/shop-1774376894693.webp", inStock: true, sortOrder: 1, showInChat: true, chatPriority: false },
    { name: "Форма гравця ЛДБЛ (комплект)", description: "Офіційна форма — майка + шорти", price: 850, oldPrice: null, category: "Форма", emoji: "👕", badge: "ОФІЦІЙНА", imageUrl: null, inStock: true, sortOrder: 2, showInChat: true, chatPriority: false },
    { name: "Кросівки Nike Air Zoom (40-46р)", description: "Баскетбольні кросівки з амортизацією", price: 2800, oldPrice: 3500, category: "Взуття", emoji: "👟", badge: "ЗНИЖКА", imageUrl: null, inStock: true, sortOrder: 3, showInChat: true, chatPriority: false },
    { name: "Рюкзак спортивний ЛДБЛ", description: "Місткий рюкзак з логотипом ЛДБЛ", price: 650, oldPrice: null, category: "Аксесуари", emoji: "🎒", badge: null, imageUrl: null, inStock: true, sortOrder: 4, showInChat: true, chatPriority: false },
    { name: "Щиток наколінний Nike Pro", description: "Захист колін під час гри", price: 380, oldPrice: 450, category: "Захист", emoji: "🦵", badge: null, imageUrl: null, inStock: true, sortOrder: 5, showInChat: true, chatPriority: false },
    { name: "Пляшка спортивна 750мл", description: "Пляшка з логотипом ЛДБЛ", price: 220, oldPrice: null, category: "Аксесуари", emoji: "💧", badge: null, imageUrl: null, inStock: true, sortOrder: 6, showInChat: true, chatPriority: false },
    { name: "Шорти баскетбольні ЛДБЛ", description: "Офіційні ігрові шорти", price: 450, oldPrice: null, category: "Форма", emoji: "🩳", badge: "НОВІ", imageUrl: null, inStock: true, sortOrder: 7, showInChat: true, chatPriority: false },
    { name: "Конуси тренувальні (10шт)", description: "Набір конусів для тренувань", price: 300, oldPrice: 400, category: "Обладнання", emoji: "📐", badge: null, imageUrl: null, inStock: true, sortOrder: 8, showInChat: true, chatPriority: false },
    { name: "Шапка ЛДБЛ winter edition", description: "Тепла шапка з вишивкою", price: 280, oldPrice: null, category: "Аксесуари", emoji: "🧢", badge: "НОВІ", imageUrl: null, inStock: true, sortOrder: 9, showInChat: true, chatPriority: false },
    { name: "Зарядний пристрій + брелок ЛДБЛ", description: "Power bank 5000 mAh + брелок", price: 350, oldPrice: null, category: "Аксесуари", emoji: "⚡", badge: null, imageUrl: null, inStock: true, sortOrder: 10, showInChat: true, chatPriority: false },
    { name: "мяч", description: "", price: 3000, oldPrice: null, category: "М'ячі", emoji: "🏀", badge: null, imageUrl: "/uploads/shop-1774377245803.webp", inStock: true, sortOrder: 0, showInChat: true, chatPriority: false },
  ];

  for (const p of products) {
    await prisma.shopProduct.upsert({
      where: { id: products.indexOf(p) + 1 },
      update: p,
      create: p,
    }).catch(async () => {
      await prisma.shopProduct.create({ data: p });
    });
  }
  console.log(`✓ ${products.length} shop products`);

  // Marketplace listing
  await prisma.marketplaceListing.upsert({
    where: { id: 1 },
    update: {},
    create: {
      title: "Мяч",
      description: "",
      price: 1200,
      category: "М'ячі",
      condition: "Новий",
      seller: "admin",
      phone: "0931045421",
      imageUrl: "/uploads/listing-1774373551897.webp",
      emoji: "🏀",
      isActive: true,
    },
  }).catch(async () => {
    await prisma.marketplaceListing.create({
      data: {
        title: "Мяч", price: 1200, category: "М'ячі", condition: "Новий",
        seller: "admin", phone: "0931045421",
        imageUrl: "/uploads/listing-1774373551897.webp", emoji: "🏀", isActive: true,
      },
    });
  });
  console.log("✓ marketplace listing");

  // Auction item
  const auction = await prisma.auctionItem.upsert({
    where: { id: 1 },
    update: {},
    create: {
      title: "мяч",
      description: "",
      category: "М'ячі",
      seller: "admin",
      phone: "0931045421",
      imageUrl: "/uploads/listing-1774373609932.webp",
      emoji: "🏀",
      startPrice: 1200,
      currentBid: 1300,
      minStep: 50,
      endsAt: new Date(1774978443315),
      isActive: true,
    },
  }).catch(async () => {
    return prisma.auctionItem.create({
      data: {
        title: "мяч", category: "М'ячі", seller: "admin", phone: "0931045421",
        imageUrl: "/uploads/listing-1774373609932.webp", emoji: "🏀",
        startPrice: 1200, currentBid: 1300, minStep: 50,
        endsAt: new Date(1774978443315), isActive: true,
      },
    });
  });
  console.log("✓ auction item");

  // Auction bid
  await prisma.auctionBid.upsert({
    where: { id: 1 },
    update: {},
    create: { amount: 1300, bidder: "admin", phone: "0931045421", auctionId: auction.id },
  }).catch(async () => {
    await prisma.auctionBid.create({
      data: { amount: 1300, bidder: "admin", phone: "0931045421", auctionId: 1 },
    });
  });
  console.log("✓ auction bid");

  console.log("✅ Seed complete!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
