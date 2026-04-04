import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const seasons = await prisma.season.findMany();
  console.log("=== SEASONS ===");
  seasons.forEach(s => {
    console.log(`ID: ${s.id}, Name: ${s.name}, Active: ${s.isActive}, AgeGroup: "${s.ageGroup}"`);
  });

  const teams = await prisma.team.findMany();
  console.log("\n=== TEAMS BY AGEGROUP ===");
  const grouped: Record<string, number> = {};
  teams.forEach(t => {
    grouped[t.ageGroup] = (grouped[t.ageGroup] || 0) + 1;
  });
  Object.entries(grouped).forEach(([ag, count]) => {
    console.log(`"${ag}": ${count} teams`);
  });

  const games = await prisma.game.findMany({ include: { season: true } });
  console.log("\n=== GAMES BY SEASON AGEGROUP ===");
  const gamesByAge: Record<string, number> = {};
  games.forEach(g => {
    const ag = g.season?.ageGroup || 'unknown';
    gamesByAge[ag] = (gamesByAge[ag] || 0) + 1;
  });
  Object.entries(gamesByAge).forEach(([ag, count]) => {
    console.log(`"${ag}": ${count} games`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
