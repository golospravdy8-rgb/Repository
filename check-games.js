const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    console.log('\n📊 GAMES WITH GROUP A (younger):');
    const gamesA = await prisma.game.findMany({
      where: { 
        group: 'A',
        season: { ageGroup: 'younger' }
      },
      select: { id: true, homeTeam: { select: { name: true } }, awayTeam: { select: { name: true } }, tourId: true, group: true }
    });
    console.log(gamesA);

    console.log('\n📊 GAMES WITH GROUP B (younger):');
    const gamesB = await prisma.game.findMany({
      where: { 
        group: 'B',
        season: { ageGroup: 'younger' }
      },
      select: { id: true, homeTeam: { select: { name: true } }, awayTeam: { select: { name: true } }, tourId: true, group: true }
    });
    console.log(gamesB);

    console.log('\n📊 TOURS (younger):');
    const tours = await prisma.tour.findMany({
      where: { ageGroup: 'younger' }
    });
    console.log(tours.length, 'tours');

    console.log('\n✅ Query complete');
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
})();
