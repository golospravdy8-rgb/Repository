import { prisma } from "@/lib/prisma";

async function main() {
  console.log("=== GAMES DATA ===");
  const games = await prisma.game.findMany({
    include: { 
      homeTeam: { select: { id: true, name: true, ageGroup: true } },
      awayTeam: { select: { id: true, name: true, ageGroup: true } },
      season: { select: { id: true, name: true, ageGroup: true } }
    },
    take: 50
  });
  
  console.log(`Total games: ${games.length}`);
  games.slice(0, 20).forEach((g: any) => {
    console.log(`ID: ${g.id}, Season: ${g.season?.ageGroup ?? 'null'}, HomeTeam: ${g.homeTeam.name} (${g.homeTeam.ageGroup}), AwayTeam: ${g.awayTeam.name} (${g.awayTeam.ageGroup}), Status: ${g.status}`);
  });
  
  console.log("\n=== SEASONS ===");
  const seasons = await prisma.season.findMany({
    include: { _count: { select: { games: true } } }
  });
  seasons.forEach((s: any) => {
    console.log(`ID: ${s.id}, Name: ${s.name}, AgeGroup: ${s.ageGroup}, Active: ${s.isActive}, GameCount: ${s._count.games}`);
  });
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
