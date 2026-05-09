const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    console.log('=== SEASONS & GAMES DIAGNOSTIC ===\n');

    // 1. List all seasons
    const seasons = await prisma.season.findMany({ orderBy: { id: 'desc' } });
    console.log('All seasons:');
    seasons.forEach(s => {
      console.log(`  ID ${s.id}: ${s.name}, active=${s.isActive}, ageGroup=${s.ageGroup}`);
    });

    // 2. Find active season
    const activeSeason = await prisma.season.findFirst({ where: { isActive: true } });
    console.log('\nActive season:', activeSeason ? `ID ${activeSeason.id} (${activeSeason.name})` : 'NONE');

    // 3. List all games with season info
    console.log('\n=== ALL GAMES WITH SEASON ===');
    const allGames = await prisma.game.findMany({
      include: { season: true, homeTeam: true, awayTeam: true },
      orderBy: { id: 'desc' },
    });

    allGames.forEach(g => {
      console.log(`  Game ${g.id}: Season ${g.seasonId} (${g.season?.name}), ${g.homeTeam?.name || 'Unknown'} vs ${g.awayTeam?.name || 'Unknown'}, status=${g.status}`);
    });

    // 4. If active season exists, check games in that season
    if (activeSeason) {
      console.log(`\n=== GAMES IN ACTIVE SEASON (${activeSeason.name}) ===`);
      const seasonGames = await prisma.game.findMany({
        where: { seasonId: activeSeason.id },
        include: { homeTeam: true, awayTeam: true },
        orderBy: { scheduledAt: 'desc' },
      });
      console.log(`Found ${seasonGames.length} games in active season`);
      seasonGames.forEach(g => {
        console.log(`  Game ${g.id}: ${g.homeTeam?.name} vs ${g.awayTeam?.name}, status=${g.status}`);
      });
    }

    // 5. Teams count
    const teamCount = await prisma.team.count();
    const playerCount = await prisma.player.count();
    console.log(`\n=== SUMMARY ===`);
    console.log(`Total teams: ${teamCount}`);
    console.log(`Total players: ${playerCount}`);
    console.log(`Total games: ${allGames.length}`);

  } catch (err) {
    console.error('Diagnostic error:', err.message);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
})();
