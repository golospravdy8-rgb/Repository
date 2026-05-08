const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    console.log('\n🔍 Checking PRODUCTION DB (connected via DATABASE_URL)...\n');
    
    const gamesA = await prisma.game.findMany({
      where: { 
        group: 'A',
        season: { ageGroup: 'younger', isActive: true }
      },
      select: { id: true, homeTeam: { select: { name: true } }, awayTeam: { select: { name: true } }, tourId: true, group: true, status: true }
    });
    console.log('📊 Games with group A (younger):', gamesA.length);
    gamesA.forEach(g => console.log('  -', g.homeTeam.name, 'vs', g.awayTeam.name, '| group:', g.group, '| tourId:', g.tourId));

    const seasons = await prisma.season.findMany({
      where: { isActive: true }
    });
    console.log('\n📊 Active seasons:', seasons.length);
    seasons.forEach(s => console.log('  -', s.ageGroup, ':', s.name));

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
})();
