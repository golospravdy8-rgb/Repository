const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    console.log('=== TESTING page.tsx QUERY FOR GAME 240 ===\n');

    // Exact query from page.tsx
    const game = await prisma.game.findUnique({
      where: { id: 240 },
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

    if (game) {
      console.log('✓ QUERY SUCCESSFUL');
      console.log(`  Game ID: ${game.id}`);
      console.log(`  Status: ${game.status}`);
      console.log(`  Home team: ${game.homeTeam?.name} (${game.homeTeam?.players?.length} players)`);
      console.log(`  Away team: ${game.awayTeam?.name} (${game.awayTeam?.players?.length} players)`);
      console.log(`  Events: ${game.events?.length}`);
      console.log(`  BoxScores: ${game.boxScores?.length}`);
      console.log(`  Substitutions: ${game.substitutions?.length}`);
    } else {
      console.log('✗ Query returned null');
    }

  } catch (err) {
    console.error('✗ Query failed:', err.message);
    console.error('Details:', err);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
})();
