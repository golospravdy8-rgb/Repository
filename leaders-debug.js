const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const season = await prisma.season.findFirst({
    where: { ageGroup: 'older', isActive: true }
  });

  const boxScores = await prisma.boxScore.findMany({
    where: {
      game: { seasonId: season?.id, status: { in: ['FINAL', 'LIVE'] } }
    },
    include: { player: true }
  });

  console.log('Total boxScores for leaders:', boxScores.length);

  // Aggregate per player
  const playerMap = new Map();
  for (const bs of boxScores) {
    const existing = playerMap.get(bs.playerId);
    if (existing) {
      existing.points += bs.points;
      existing.rebounds += bs.rebounds;
      existing.assists += bs.assists;
      existing.games += 1;
    } else {
      playerMap.set(bs.playerId, {
        name: `${bs.player.firstName} ${bs.player.lastName}`,
        points: bs.points, rebounds: bs.rebounds, assists: bs.assists, games: 1
      });
    }
  }

  console.log('\nPer-player stats:');
  for (const [id, data] of playerMap.entries()) {
    const g = data.games;
    const rating = Math.min(99, Math.round(50 + (data.points/g)*1.8 + (data.rebounds/g)*1.2 + (data.assists/g)*1.5));
    console.log(`${data.name}: pts=${data.points} reb=${data.rebounds} ast=${data.assists} games=${g} rating=${rating}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
