import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Fixing PostgreSQL sequences...\n");

  try {
    // Team sequence
    const teamResult = await prisma.$queryRaw`
      SELECT setval('"Team_id_seq"', COALESCE((SELECT MAX(id) FROM "Team"), 0) + 1)
    `;
    console.log("✓ Fixed Team sequence");

    // Player sequence
    const playerResult = await prisma.$queryRaw`
      SELECT setval('"Player_id_seq"', COALESCE((SELECT MAX(id) FROM "Player"), 0) + 1)
    `;
    console.log("✓ Fixed Player sequence");

    // Game sequence
    const gameResult = await prisma.$queryRaw`
      SELECT setval('"Game_id_seq"', COALESCE((SELECT MAX(id) FROM "Game"), 0) + 1)
    `;
    console.log("✓ Fixed Game sequence");

    // BoxScore sequence
    const boxScoreResult = await prisma.$queryRaw`
      SELECT setval('"BoxScore_id_seq"', COALESCE((SELECT MAX(id) FROM "BoxScore"), 0) + 1)
    `;
    console.log("✓ Fixed BoxScore sequence");

    // Standing sequence
    const standingResult = await prisma.$queryRaw`
      SELECT setval('"Standing_id_seq"', COALESCE((SELECT MAX(id) FROM "Standing"), 0) + 1)
    `;
    console.log("✓ Fixed Standing sequence");

    console.log("\n✅ All sequences fixed!");
  } catch (error) {
    console.error("Error fixing sequences:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
