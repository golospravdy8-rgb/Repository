const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Что реально хранится в БД для game/159
  const game = await prisma.game.findUnique({
    where: { id: 159 },
    include: { season: true, homeTeam: true, awayTeam: true }
  });

  console.log('=== GAME 159 ===');
  console.log('status:', game.status);
  console.log('stage:', game.stage);
  console.log('season.ageGroup:', game.season?.ageGroup);
  console.log('scheduledAt:', game.scheduledAt);

  // Что ищет schedule page (из кода schedule/page.tsx)
  const season = await prisma.season.findFirst({
    where: { ageGroup: 'older', isActive: true }
  });
  console.log('\n=== CURRENT SEASON FOR older ===');
  console.log('season:', season);

  if (season) {
    const games = await prisma.game.findMany({
      where: { seasonId: season.id },
      include: { homeTeam: true, awayTeam: true }
    });
    console.log('\n=== ALL GAMES IN SEASON ===');
    console.log('Total:', games.length);

    const game159 = games.find(g => g.id === 159);
    console.log('Game 159 found:', !!game159);
    if (game159) {
      // Simulate frontend filter
      const passesStage = !game159.stage || game159.stage === 'group' || game159.stage === 'groupA' || game159.stage === 'groupB';
      const passesStatus = game159.status === 'FINAL';
      console.log('Passes stage filter:', passesStage);
      console.log('Passes status filter (tab=older):', passesStatus);
      console.log('WOULD APPEAR IN SCHEDULE:', passesStage && passesStatus);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
