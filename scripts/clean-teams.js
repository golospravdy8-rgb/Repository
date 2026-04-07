const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanTeams() {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('CLEANING TEAM DATA - KEEPING SEASONS ONLY');
    console.log('='.repeat(80) + '\n');

    // Delete in order (respect foreign keys)
    console.log('[1/5] Deleting BoxScores...');
    const deletedBoxScores = await prisma.boxScore.deleteMany({});
    console.log('  Deleted ' + deletedBoxScores.count + ' box scores\n');

    console.log('[2/5] Deleting GameEvents...');
    const deletedGameEvents = await prisma.gameEvent.deleteMany({});
    console.log('  Deleted ' + deletedGameEvents.count + ' game events\n');

    console.log('[3/5] Deleting Games...');
    const deletedGames = await prisma.game.deleteMany({});
    console.log('  Deleted ' + deletedGames.count + ' games\n');

    console.log('[4/5] Deleting Players...');
    const deletedPlayers = await prisma.player.deleteMany({});
    console.log('  Deleted ' + deletedPlayers.count + ' players\n');

    console.log('[5/5] Deleting Standings...');
    const deletedStandings = await prisma.standing.deleteMany({});
    console.log('  Deleted ' + deletedStandings.count + ' standings\n');

    console.log('[6/5] Deleting Teams...');
    const deletedTeams = await prisma.team.deleteMany({});
    console.log('  Deleted ' + deletedTeams.count + ' teams\n');

    // Check what remains
    const remainingSeasons = await prisma.season.findMany();
    const remainingTeams = await prisma.team.count();
    const remainingPlayers = await prisma.player.count();

    console.log('='.repeat(80));
    console.log('CLEANUP COMPLETE');
    console.log('='.repeat(80));
    console.log('\nRemaining data:');
    console.log('  Seasons: ' + remainingSeasons.length);
    console.log('  Teams: ' + remainingTeams);
    console.log('  Players: ' + remainingPlayers);
    console.log('\nNext step:');
    console.log('  1. Edit prisma/seed-custom.ts with YOUR teams');
    console.log('  2. Run: npm run db:seed-custom\n');

  } catch (error) {
    console.error('ERROR:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

cleanTeams();
