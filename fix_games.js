const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  // Отримай реальні ID
  const teams = await p.team.findMany({ select: { id: true, name: true, ageGroup: true } });
  const tours = await p.tour.findMany();
  const seasons = await p.season.findMany();

  console.log('📋 Команди:', teams.map(t => `${t.id}:${t.name}`).join(', '));
  console.log('📋 Тури:', tours.map(t => `${t.id}:${t.name}`).join(', '));

  // Створи тури для older якщо їх немає
  let tourOlderA = tours.find(t => t.ageGroup === 'older' && t.name.includes('А'));
  let tourOlderB = tours.find(t => t.ageGroup === 'older' && t.name.includes('Б'));

  if (!tourOlderA) {
    tourOlderA = await p.tour.create({ data: { name: 'Група А', order: 1, ageGroup: 'older' } });
    console.log('✅ Створено тур:', tourOlderA.id, tourOlderA.name);
  }
  if (!tourOlderB) {
    tourOlderB = await p.tour.create({ data: { name: 'Група Б', order: 2, ageGroup: 'older' } });
    console.log('✅ Створено тур:', tourOlderB.id, tourOlderB.name);
  }

  const tourYoungerA = tours.find(t => t.ageGroup === 'younger' && t.name.includes('А'));
  const tourYoungerB = tours.find(t => t.ageGroup === 'younger' && t.name.includes('Б'));

  const seasonYounger = seasons.find(s => s.ageGroup === 'younger');
  const seasonOlder = seasons.find(s => s.ageGroup === 'older');

  // Видали всі старі ігри
  await p.game.deleteMany({});
  console.log('✅ Старі ігри видалені');

  // Функції для пошуку ID
  const teamId = (name, ageGroup) => {
    const t = teams.find(t =>
      t.ageGroup === ageGroup &&
      (t.name.toLowerCase().includes(name.toLowerCase()) ||
       name.toLowerCase().includes(t.name.split(' ')[0].toLowerCase()))
    );
    if (!t) { console.error('❌ НЕ ЗНАЙДЕНО команду:', name, 'для', ageGroup); return null; }
    return t.id;
  };

  const games = [
    // === U-14 GROUP A (tourYoungerA) ===
    { seasonId: seasonYounger.id, homeTeamId: teamId('Бізон', 'younger'), awayTeamId: teamId('Ліцей', 'younger'), tourId: tourYoungerA.id, scheduledAt: new Date('2026-05-10T07:00:00Z'), status: 'SCHEDULED', stage: 'groupA' },
    { seasonId: seasonYounger.id, homeTeamId: teamId('Індійськ', 'younger'), awayTeamId: teamId('Димчаст', 'younger'), tourId: tourYoungerA.id, scheduledAt: new Date('2026-05-10T09:00:00Z'), status: 'SCHEDULED', stage: 'groupA' },
    { seasonId: seasonYounger.id, homeTeamId: teamId('Бізон', 'younger'), awayTeamId: teamId('Димчаст', 'younger'), tourId: tourYoungerA.id, scheduledAt: new Date('2026-05-17T07:00:00Z'), status: 'SCHEDULED', stage: 'groupA' },
    { seasonId: seasonYounger.id, homeTeamId: teamId('Ліцей', 'younger'), awayTeamId: teamId('Індійськ', 'younger'), tourId: tourYoungerA.id, scheduledAt: new Date('2026-05-17T09:00:00Z'), status: 'SCHEDULED', stage: 'groupA' },
    { seasonId: seasonYounger.id, homeTeamId: teamId('Бізон', 'younger'), awayTeamId: teamId('Індійськ', 'younger'), tourId: tourYoungerA.id, scheduledAt: new Date('2026-05-24T07:00:00Z'), status: 'SCHEDULED', stage: 'groupA' },
    { seasonId: seasonYounger.id, homeTeamId: teamId('Ліцей', 'younger'), awayTeamId: teamId('Димчаст', 'younger'), tourId: tourYoungerA.id, scheduledAt: new Date('2026-05-24T09:00:00Z'), status: 'SCHEDULED', stage: 'groupA' },

    // === U-14 GROUP B (tourYoungerB) ===
    { seasonId: seasonYounger.id, homeTeamId: teamId('Ліцей № 81', 'younger'), awayTeamId: teamId('Коал', 'younger'), tourId: tourYoungerB.id, scheduledAt: new Date('2026-05-10T07:00:00Z'), status: 'SCHEDULED', stage: 'groupB' },
    { seasonId: seasonYounger.id, homeTeamId: teamId('Mighty', 'younger'), awayTeamId: teamId('Коал', 'younger'), tourId: tourYoungerB.id, scheduledAt: new Date('2026-05-10T09:00:00Z'), status: 'SCHEDULED', stage: 'groupB' },
    { seasonId: seasonYounger.id, homeTeamId: teamId('Ліцей № 81', 'younger'), awayTeamId: teamId('Коал', 'younger'), tourId: tourYoungerB.id, scheduledAt: new Date('2026-05-17T07:00:00Z'), status: 'SCHEDULED', stage: 'groupB' },
    { seasonId: seasonYounger.id, homeTeamId: teamId('Коал', 'younger'), awayTeamId: teamId('Mighty', 'younger'), tourId: tourYoungerB.id, scheduledAt: new Date('2026-05-17T09:00:00Z'), status: 'SCHEDULED', stage: 'groupB' },
    { seasonId: seasonYounger.id, homeTeamId: teamId('Ліцей № 81', 'younger'), awayTeamId: teamId('Mighty', 'younger'), tourId: tourYoungerB.id, scheduledAt: new Date('2026-05-24T07:00:00Z'), status: 'SCHEDULED', stage: 'groupB' },
    { seasonId: seasonYounger.id, homeTeamId: teamId('Коал', 'younger'), awayTeamId: teamId('Ліцей № 81', 'younger'), tourId: tourYoungerB.id, scheduledAt: new Date('2026-05-24T09:00:00Z'), status: 'SCHEDULED', stage: 'groupB' },

    // === U-16 GROUP A (tourOlderA) ===
    { seasonId: seasonOlder.id, homeTeamId: teamId('Ведмед', 'older'), awayTeamId: teamId('Dream', 'older'), tourId: tourOlderA.id, scheduledAt: new Date('2026-05-10T07:00:00Z'), status: 'SCHEDULED', stage: 'groupA' },
    { seasonId: seasonOlder.id, homeTeamId: teamId('Wild', 'older'), awayTeamId: teamId('Street', 'older'), tourId: tourOlderA.id, scheduledAt: new Date('2026-05-10T09:00:00Z'), status: 'SCHEDULED', stage: 'groupA' },
    { seasonId: seasonOlder.id, homeTeamId: teamId('Ведмед', 'older'), awayTeamId: teamId('Street', 'older'), tourId: tourOlderA.id, scheduledAt: new Date('2026-05-17T07:00:00Z'), status: 'SCHEDULED', stage: 'groupA' },
    { seasonId: seasonOlder.id, homeTeamId: teamId('Dream', 'older'), awayTeamId: teamId('Wild', 'older'), tourId: tourOlderA.id, scheduledAt: new Date('2026-05-17T09:00:00Z'), status: 'SCHEDULED', stage: 'groupA' },
    { seasonId: seasonOlder.id, homeTeamId: teamId('Ведмед', 'older'), awayTeamId: teamId('Wild', 'older'), tourId: tourOlderA.id, scheduledAt: new Date('2026-05-24T07:00:00Z'), status: 'SCHEDULED', stage: 'groupA' },
    { seasonId: seasonOlder.id, homeTeamId: teamId('Street', 'older'), awayTeamId: teamId('Dream', 'older'), tourId: tourOlderA.id, scheduledAt: new Date('2026-05-24T09:00:00Z'), status: 'SCHEDULED', stage: 'groupA' },

    // === U-16 GROUP B (tourOlderB) ===
    { seasonId: seasonOlder.id, homeTeamId: teamId('Black', 'older'), awayTeamId: teamId('Golden', 'older'), tourId: tourOlderB.id, scheduledAt: new Date('2026-05-10T07:00:00Z'), status: 'SCHEDULED', stage: 'groupB' },
    { seasonId: seasonOlder.id, homeTeamId: teamId('Golden', 'older'), awayTeamId: teamId('Ліцей', 'older'), tourId: tourOlderB.id, scheduledAt: new Date('2026-05-10T09:00:00Z'), status: 'SCHEDULED', stage: 'groupB' },
    { seasonId: seasonOlder.id, homeTeamId: teamId('Black', 'older'), awayTeamId: teamId('Ліцей', 'older'), tourId: tourOlderB.id, scheduledAt: new Date('2026-05-17T07:00:00Z'), status: 'SCHEDULED', stage: 'groupB' },
    { seasonId: seasonOlder.id, homeTeamId: teamId('Golden', 'older'), awayTeamId: teamId('Black', 'older'), tourId: tourOlderB.id, scheduledAt: new Date('2026-05-17T09:00:00Z'), status: 'SCHEDULED', stage: 'groupB' },
    { seasonId: seasonOlder.id, homeTeamId: teamId('Black', 'older'), awayTeamId: teamId('Golden', 'older'), tourId: tourOlderB.id, scheduledAt: new Date('2026-05-24T07:00:00Z'), status: 'SCHEDULED', stage: 'groupB' },
    { seasonId: seasonOlder.id, homeTeamId: teamId('Ліцей', 'older'), awayTeamId: teamId('Black', 'older'), tourId: tourOlderB.id, scheduledAt: new Date('2026-05-24T09:00:00Z'), status: 'SCHEDULED', stage: 'groupB' },
  ];

  let created = 0;
  for (const g of games) {
    if (!g.homeTeamId || !g.awayTeamId || !g.tourId) {
      console.error('❌ Пропускаємо гру через відсутній ID:', g);
      continue;
    }
    const game = await p.game.create({ data: g });
    console.log(`✅ Гра ${game.id}: ${game.stage} (тур ${game.tourId})`);
    created++;
  }

  console.log(`\n📊 ЗВІТ: Створено ${created} ігор`);
  const stats = await p.game.groupBy({
    by: ['stage'],
    _count: true
  });
  console.log('Розподіл по stage:', stats);

  await p.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
