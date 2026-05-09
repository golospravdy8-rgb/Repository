const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    console.log('=== ТЕСТУВАННЯ LIVETRACKETRACKER НА ГРІЇ 240 ===\n');

    // 1. ПЕРЕВІРКА СТАНУ ГРІІ
    console.log('КРОК 1: Перевірка стану гри 240');
    const game = await prisma.game.findUnique({
      where: { id: 240 },
      include: {
        homeTeam: { include: { players: true } },
        awayTeam: { include: { players: true } },
        events: { take: 5 },
        boxScores: { take: 3 },
        onCourt: { take: 5 },
      },
    });

    if (!game) {
      console.log('❌ Гра 240 не знайдена');
      process.exit(1);
    }

    console.log(`✓ Гра ID: ${game.id}`);
    console.log(`✓ Статус: ${game.status}`);
    console.log(`✓ Рахунок: ${game.homeTeam.name} ${game.homeScore} : ${game.awayScore} ${game.awayTeam.name}`);
    console.log(`✓ BoxScores: ${await prisma.boxScore.count({ where: { gameId: 240 } })}`);
    console.log(`✓ OnCourt записи: ${await prisma.gameOnCourt.count({ where: { gameId: 240, onCourt: true } })}`);
    console.log(`✓ GameEvents: ${game.events.length}`);

    // 2. ПЕРЕВІРКА ГРАВЦІВ
    console.log('\nКРОК 2: Перевірка доступних гравців');
    const homePlayer = game.homeTeam.players?.[0];
    const awayPlayer = game.awayTeam.players?.[0];

    if (!homePlayer || !awayPlayer) {
      console.log('❌ Немає гравців у командах');
      process.exit(1);
    }

    console.log(`✓ Home player: #${homePlayer.number} ${homePlayer.firstName} ${homePlayer.lastName} (ID: ${homePlayer.id})`);
    console.log(`✓ Away player: #${awayPlayer.number} ${awayPlayer.firstName} ${awayPlayer.lastName} (ID: ${awayPlayer.id})`);

    // 3. ПЕРЕВІРКА BOXSCORE СТРУКТУРИ
    console.log('\nКРОК 3: Перевірка структури BoxScore');
    const bs = await prisma.boxScore.findFirst({
      where: { gameId: 240 },
    });

    if (bs) {
      console.log(`✓ BoxScore playerId: ${bs.playerId}`);
      console.log(`✓ Points: ${bs.points}`);
      console.log(`✓ timeOnCourtSeconds: ${bs.timeOnCourtSeconds}`);
      console.log(`✓ enteredAt: ${bs.enteredAt}`);
      console.log(`✓ isOnCourt: ${bs.isOnCourt}`);
    }

    // 4. ПЕРЕВІРКА OnCourt СТАТУСУ
    console.log('\nКРОК 4: Перевірка стану гравців на паркеті');
    const onCourtPlayers = await prisma.gameOnCourt.findMany({
      where: { gameId: 240, onCourt: true },
      include: { player: true },
      take: 5,
    });

    console.log(`✓ Гравців на паркеті: ${onCourtPlayers.length}`);
    onCourtPlayers.forEach(oc => {
      console.log(`  - #${oc.player.number} ${oc.player.lastName} (enteredAt: ${oc.enteredAt}s)`);
    });

    console.log('\n✅ ВСІ ПЕРЕВІРКИ ПРОЙДЕНІ');
    console.log('\nПараметри для ручного тестування UI:');
    console.log(`- Гра ID: 240`);
    console.log(`- Home: ${game.homeTeam.name} (ID: ${game.homeTeamId})`);
    console.log(`- Away: ${game.awayTeam.name} (ID: ${game.awayTeamId})`);
    console.log(`- Home Player: #${homePlayer.number} ${homePlayer.lastName} (ID: ${homePlayer.id})`);
    console.log(`- Away Player: #${awayPlayer.number} ${awayPlayer.lastName} (ID: ${awayPlayer.id})`);
    console.log(`\nURL для тесту: http://localhost:3006/game/240`);

  } catch (err) {
    console.error('❌ Помилка:', err.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
