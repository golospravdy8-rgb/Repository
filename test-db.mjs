import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

try {
  const seasons = await prisma.season.findMany();
  console.log("✅ SEASONS found:", seasons.length);
  seasons.forEach(s => console.log(`  - ${s.name} (${s.ageGroup}) active=${s.isActive}`));
  
  const games = await prisma.game.findMany({ take: 3 });
  console.log("\n✅ GAMES found:", games.length);
  
  await prisma.$disconnect();
} catch (e) {
  console.error("❌ Error:", e.message);
}
