import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const season = await prisma.season.findFirst({ 
  where: { isActive: true, ageGroup: "younger" } 
});
console.log("Season:", season?.name, "id=", season?.id);

if (season) {
  const recentGames = await prisma.game.findMany({
    where: { seasonId: season.id },
    include: { homeTeam: true, awayTeam: true },
    orderBy: { scheduledAt: "desc" },
    take: 10,
  });
  console.log("Recent games:", recentGames.length);
  recentGames.forEach(g => {
    console.log(`  - Game ${g.id}: ${g.homeTeam.name} vs ${g.awayTeam.name} (status=${g.status})`);
  });
}

await prisma.$disconnect();
