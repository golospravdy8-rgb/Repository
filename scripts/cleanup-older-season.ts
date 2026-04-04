import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Cleaning up older season data...");

  const olderSeason = await prisma.season.findFirst({
    where: { ageGroup: "older" },
  });

  if (!olderSeason) {
    console.log("No older season found");
    await prisma.$disconnect();
    return;
  }

  // Delete box scores
  const bsDeleted = await prisma.boxScore.deleteMany({
    where: { game: { seasonId: olderSeason.id } },
  });
  console.log(`✓ Deleted ${bsDeleted.count} box scores`);

  // Delete games
  const gamesDeleted = await prisma.game.deleteMany({
    where: { seasonId: olderSeason.id },
  });
  console.log(`✓ Deleted ${gamesDeleted.count} games`);

  // Delete standings
  const standingsDeleted = await prisma.standing.deleteMany({
    where: { seasonId: olderSeason.id },
  });
  console.log(`✓ Deleted ${standingsDeleted.count} standings`);

  console.log("\n✅ Cleanup complete! Ready to re-create with correct dates.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
