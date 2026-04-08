const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deepClean() {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('ГЛИБОКА ОЧИСТКА БАЗИ - ВИДАЛЕННЯ ВСІХ ЧУЖИХ ДАНИХ');
    console.log('='.repeat(80) + '\n');

    console.log('Видалення у правильному порядку (з урахуванням FK):\n');

    // 1. Delete all game-related data
    console.log('[1/10] Видалення BoxScore...');
    const boxScores = await prisma.boxScore.deleteMany({});
    console.log('  ✓ Видалено ' + boxScores.count + ' записів\n');

    console.log('[2/10] Видалення GameEvent...');
    const gameEvents = await prisma.gameEvent.deleteMany({});
    console.log('  ✓ Видалено ' + gameEvents.count + ' записів\n');

    console.log('[3/10] Видалення Game...');
    const games = await prisma.game.deleteMany({});
    console.log('  ✓ Видалено ' + games.count + ' записів\n');

    // 2. Delete player achievements and related data
    console.log('[4/10] Видалення PlayerAchievement...');
    const achievements = await prisma.playerAchievement.deleteMany({});
    console.log('  ✓ Видалено ' + achievements.count + ' записів\n');

    console.log('[5/10] Видалення Player...');
    const players = await prisma.player.deleteMany({});
    console.log('  ✓ Видалено ' + players.count + ' записів\n');

    // 3. Delete standings
    console.log('[6/10] Видалення Standing...');
    const standings = await prisma.standing.deleteMany({});
    console.log('  ✓ Видалено ' + standings.count + ' записів\n');

    // 4. Delete teams
    console.log('[7/10] Видалення Team...');
    const teams = await prisma.team.deleteMany({});
    console.log('  ✓ Видалено ' + teams.count + ' записів\n');

    // 5. Delete news (only old/foreign ones)
    console.log('[8/10] Видалення News (чужих статей)...');
    const news = await prisma.news.deleteMany({});
    console.log('  ✓ Видалено ' + news.count + ' записів\n');

    // 6. Delete MvpVote (linked to games/players)
    console.log('[9/10] Видалення MvpVote...');
    const votes = await prisma.mvpVote.deleteMany({});
    console.log('  ✓ Видалено ' + votes.count + ' записів\n');

    // 7. Delete GameRsvp (linked to games)
    console.log('[10/10] Видалення GameRsvp...');
    const rsvp = await prisma.gameRsvp.deleteMany({});
    console.log('  ✓ Видалено ' + rsvp.count + ' записів\n');

    // Verify cleanup
    console.log('='.repeat(80));
    console.log('ПЕРЕВІРКА РЕЗУЛЬТАТУ');
    console.log('='.repeat(80) + '\n');

    const finalTeams = await prisma.team.count();
    const finalPlayers = await prisma.player.count();
    const finalGames = await prisma.game.count();
    const finalStandings = await prisma.standing.count();
    const finalNews = await prisma.news.count();
    const finalAdminUsers = await prisma.adminUser.count();
    const finalSettings = await prisma.siteSettings.count();
    const finalSeasons = await prisma.season.count();

    console.log('ВИДАЛЕНО:');
    console.log('  ✓ Team: ' + teams.count);
    console.log('  ✓ Player: ' + players.count);
    console.log('  ✓ Game: ' + games.count);
    console.log('  ✓ Standing: ' + standings.count);
    console.log('  ✓ News: ' + news.count);
    console.log('  ✓ MvpVote: ' + votes.count);
    console.log('  ✓ GameRsvp: ' + rsvp.count);
    console.log('  ✓ PlayerAchievement: ' + achievements.count);
    console.log('  ✓ GameEvent: ' + gameEvents.count);
    console.log('  ✓ BoxScore: ' + boxScores.count);

    console.log('\nЗАЛИШИЛОСЬ (має залишитись):');
    console.log('  ✓ Season: ' + finalSeasons + ' (ДОБРЕ)');
    console.log('  ✓ AdminUser: ' + finalAdminUsers + ' (ДОБРЕ)');
    console.log('  ✓ SiteSettings: ' + finalSettings + ' (ДОБРЕ)');

    console.log('\nНЕ ПОВИННО ЗАЛИШИТИСЬ:');
    console.log('  ' + (finalTeams === 0 ? '✓' : '✗') + ' Team: ' + finalTeams);
    console.log('  ' + (finalPlayers === 0 ? '✓' : '✗') + ' Player: ' + finalPlayers);
    console.log('  ' + (finalGames === 0 ? '✓' : '✗') + ' Game: ' + finalGames);
    console.log('  ' + (finalStandings === 0 ? '✓' : '✗') + ' Standing: ' + finalStandings);
    console.log('  ' + (finalNews === 0 ? '✓' : '✗') + ' News: ' + finalNews);

    console.log('\n' + '='.repeat(80));
    if (finalTeams === 0 && finalPlayers === 0 && finalGames === 0 && finalNews === 0) {
      console.log('✓✓✓ ОЧИСТКА УСПІШНА - БАЗА ГОТОВА ДО НОВОГО SEED ✓✓✓');
    } else {
      console.log('⚠ УВАГА - ЗАЛИШИЛОСЬ ЧУЖИХ ДАНИХ!');
    }
    console.log('='.repeat(80) + '\n');

  } catch (error) {
    console.error('ERROR:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

deepClean();
