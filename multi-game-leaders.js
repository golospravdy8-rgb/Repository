const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const season = await prisma.season.findFirst({ where: { ageGroup: 'older', isActive: true } });

  const allBS = await prisma.boxScore.findMany({
    where: { game: { seasonId: season.id, status: 'FINAL' } },
    include: { player: true, game: true }
  });

  console.log('Total BoxScore records across all FINAL games:', allBS.length);

  // Aggregate per player (same logic as leaders page)
  const playerMap = new Map();
  for (const bs of allBS) {
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

  // Sort by points
  const sorted = [...playerMap.entries()]
    .map(([id, d]) => ({ id, ...d, ppg: Math.round(d.points/d.games*10)/10 }))
    .sort((a, b) => b.ppg - a.ppg);

  console.log('\nTop 5 by PPG:');
  sorted.slice(0, 5).forEach((p, i) => {
    console.log(`  ${i+1}. ${p.name}: ${p.ppg} PPG (${p.points} pts / ${p.games} games)`);
  });

  const unique = new Set(sorted.map(p => p.ppg));
  console.log('\nUnique PPG values:', unique.size, '(should be >5 for varied data)');
  console.log('Result:', unique.size > 5 ? '✅ Leaders are varied' : '⚠️  Leaders still too uniform');
}

main().catch(console.error).finally(() => prisma.$disconnect());
