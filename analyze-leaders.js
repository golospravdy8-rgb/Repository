const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const season = await prisma.season.findFirst({ where: { ageGroup: 'older', isActive: true } });
  const allBS = await prisma.boxScore.findMany({ where: { game: { seasonId: season.id } } });

  console.log('All BoxScore records:');
  allBS.forEach(bs => {
    console.log(`  player ${bs.playerId}: pts=${bs.points} reb=${bs.rebounds} ast=${bs.assists}`);
  });

  const unique = new Set(allBS.map(b => `${b.points}-${b.rebounds}-${b.assists}`));
  console.log('\nUnique combinations:');
  [...unique].forEach(u => console.log(`  ${u}`));

  console.log('\nAnalysis:');
  console.log('Total BoxScore rows:', allBS.length);
  console.log('Unique combinations:', unique.size);
  console.log('Reason for uniformity:', allBS.length === 20 && unique.size === 3 ? 'All 20 players from same game with similar stats' : 'Unknown');
}

main().catch(console.error).finally(() => prisma.$disconnect());
