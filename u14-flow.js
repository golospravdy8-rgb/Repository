const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const u14season = await prisma.season.findFirst({ where: { ageGroup: 'younger', isActive: true } });
  console.log('U-14 season:', u14season?.id, '— games:', u14season ? 'checking...' : 'NO SEASON');

  if (!u14season) {
    console.log('❌ U-14 season not found — this means U-14 schedule/leaders will be empty');
    return;
  }

  const games = await prisma.game.count({ where: { seasonId: u14season.id } });
  const standings = await prisma.standing.count({ where: { seasonId: u14season.id } });
  console.log('U-14 games:', games);
  console.log('U-14 standings records:', standings);
  console.log('U-14 ready:', games > 0 ? '✅' : '⚠️  No games yet');
}

main().catch(console.error).finally(() => prisma.$disconnect());
