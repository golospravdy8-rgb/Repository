const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    console.log('=== DATABASE DIAGNOSTIC ===\n');

    // 1. Count all games
    const gameCount = await prisma.game.count();
    console.log('Total games in DB:', gameCount);

    // 2. List all games
    const games = await prisma.game.findMany({
      select: { id: true, homeTeamId: true, awayTeamId: true, status: true, quarter: true },
      orderBy: { id: 'desc' },
      take: 20,
    });
    console.log('\nRecent games:');
    games.forEach(g => {
      console.log(`  Game ${g.id}: home=${g.homeTeamId}, away=${g.awayTeamId}, status=${g.status}, quarter=${g.quarter}`);
    });

    // 3. Check game 239 specifically
    console.log('\n=== GAME 239 DETAILED ===');
    const game239 = await prisma.game.findUnique({
      where: { id: 239 },
      include: { homeTeam: true, awayTeam: true }
    });
    if (game239) {
      console.log('✓ Game 239 EXISTS');
      console.log(`  Home: Team ${game239.homeTeamId} (${game239.homeTeam?.name})`);
      console.log(`  Away: Team ${game239.awayTeamId} (${game239.awayTeam?.name})`);
      console.log(`  Status: ${game239.status}, Quarter: ${game239.quarter}`);
      console.log(`  Score: ${game239.homeScore} - ${game239.awayScore}`);
    } else {
      console.log('✗ Game 239 NOT FOUND');
    }

    // 4. Check related data for game 239
    const events239 = await prisma.gameEvent.count({ where: { gameId: 239 } });
    const boxScores239 = await prisma.boxScore.count({ where: { gameId: 239 } });
    const onCourt239 = await prisma.gameOnCourt.count({ where: { gameId: 239 } });

    console.log(`\nGame 239 related records:`);
    console.log(`  GameEvents: ${events239}`);
    console.log(`  BoxScores: ${boxScores239}`);
    console.log(`  GameOnCourt: ${onCourt239}`);

    // 5. Test the query used in page.tsx
    console.log('\n=== TESTING page.tsx QUERY ===');
    try {
      const gameForPage = await prisma.game.findUnique({
        where: { id: 239 },
        include: {
          homeTeam: { include: { players: { orderBy: { number: "asc" } } } },
          awayTeam: { include: { players: { orderBy: { number: "asc" } } } },
          events: {
            include: { player: { select: { firstName: true, lastName: true, number: true } } },
            orderBy: { createdAt: "desc" },
            take: 50,
          },
          boxScores: {
            include: { player: true },
          },
          substitutions: true,
        },
      });

      if (gameForPage) {
        console.log('✓ page.tsx query WORKS (without onCourt)');
        console.log(`  Players on home team: ${gameForPage.homeTeam.players.length}`);
        console.log(`  Players on away team: ${gameForPage.awayTeam.players.length}`);
        console.log(`  Events: ${gameForPage.events.length}`);
        console.log(`  BoxScores: ${gameForPage.boxScores.length}`);
      } else {
        console.log('✗ Query returned null');
      }
    } catch (err) {
      console.log('✗ page.tsx query FAILED:', err.message);
    }

    // 6. Try with onCourt
    console.log('\n=== TESTING WITH onCourt ===');
    try {
      const gameWithOnCourt = await prisma.game.findUnique({
        where: { id: 239 },
        include: { onCourt: true },
      });
      console.log('✓ onCourt query WORKS');
      console.log(`  onCourt records: ${gameWithOnCourt?.onCourt?.length || 0}`);
    } catch (err) {
      console.log('✗ onCourt query FAILED:', err.message);
    }

  } catch (err) {
    console.error('Diagnostic error:', err.message);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
})();
