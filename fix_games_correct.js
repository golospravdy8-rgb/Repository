const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const teams = await p.team.findMany({ select: { id: true, name: true, ageGroup: true } });
  const seasons = await p.season.findMany();

  console.log('📋 Teams:', teams.map(t => `${t.id}:${t.name}(${t.ageGroup})`).join(', '));

  const seasonYounger = seasons.find(s => s.ageGroup === 'younger');
  const seasonOlder = seasons.find(s => s.ageGroup === 'older');

  // Get or create tours
  let tours = await p.tour.findMany();
  let tourYoungerA = tours.find(t => t.ageGroup === 'younger' && t.order === 1);
  let tourYoungerB = tours.find(t => t.ageGroup === 'younger' && t.order === 2);
  let tourOlderA = tours.find(t => t.ageGroup === 'older' && t.order === 1);
  let tourOlderB = tours.find(t => t.ageGroup === 'older' && t.order === 2);

  if (!tourYoungerA) tourYoungerA = await p.tour.create({ data: { name: 'Група А', order: 1, ageGroup: 'younger' } });
  if (!tourYoungerB) tourYoungerB = await p.tour.create({ data: { name: 'Група Б', order: 2, ageGroup: 'younger' } });
  if (!tourOlderA) tourOlderA = await p.tour.create({ data: { name: 'Група А', order: 1, ageGroup: 'older' } });
  if (!tourOlderB) tourOlderB = await p.tour.create({ data: { name: 'Група Б', order: 2, ageGroup: 'older' } });

  // Delete old games
  await p.game.deleteMany({});
  console.log('✅ Old games deleted');

  // Exact team ID lookup
  const getTeamId = (name, ageGroup) => {
    const t = teams.find(t => t.ageGroup === ageGroup && t.name === name);
    if (!t) {
      console.error(`❌ Team not found: "${name}" (${ageGroup})`);
      return null;
    }
    return t.id;
  };

  // U-14 teams
  const ind = getTeamId('Індійські Леопарди Ліцей № 81', 'younger');
  const dim = getTeamId('Димчасті Леопарди Школа № 91', 'younger');
  const biz = getTeamId('Степові Бізони Школа № 17', 'younger');
  const koa = getTeamId('Коали Школа № 7', 'younger');
  const mig = getTeamId('Mighty Ducks Ліцей № 81', 'younger');

  // U-16 teams
  const ved = getTeamId('Ведмеді Ліцей № 17', 'older');
  const blk = getTeamId('Black Hawks Ліцей № 81', 'older');
  const gld = getTeamId('Golden Eagles Ліцей № 81', 'older');
  const wld = getTeamId('Wild Cats Школа № 30', 'older');
  const str = getTeamId('Street Kings Школа № 91', 'older');
  const drm = getTeamId('Dream Team Школа № 7', 'older');

  const games = [
    // === U-14 GROUP A (3 teams: ІНД, ДИМ, БІЗ) ===
    { seasonId: seasonYounger.id, homeTeamId: ind, awayTeamId: dim, tourId: tourYoungerA.id, scheduledAt: new Date('2026-05-10T07:00:00Z'), status: 'SCHEDULED', stage: 'groupA' },
    { seasonId: seasonYounger.id, homeTeamId: biz, awayTeamId: ind, tourId: tourYoungerA.id, scheduledAt: new Date('2026-05-10T09:00:00Z'), status: 'SCHEDULED', stage: 'groupA' },
    { seasonId: seasonYounger.id, homeTeamId: dim, awayTeamId: biz, tourId: tourYoungerA.id, scheduledAt: new Date('2026-05-17T07:00:00Z'), status: 'SCHEDULED', stage: 'groupA' },
    { seasonId: seasonYounger.id, homeTeamId: ind, awayTeamId: biz, tourId: tourYoungerA.id, scheduledAt: new Date('2026-05-17T09:00:00Z'), status: 'SCHEDULED', stage: 'groupA' },
    { seasonId: seasonYounger.id, homeTeamId: biz, awayTeamId: dim, tourId: tourYoungerA.id, scheduledAt: new Date('2026-05-24T07:00:00Z'), status: 'SCHEDULED', stage: 'groupA' },
    { seasonId: seasonYounger.id, homeTeamId: dim, awayTeamId: ind, tourId: tourYoungerA.id, scheduledAt: new Date('2026-05-24T09:00:00Z'), status: 'SCHEDULED', stage: 'groupA' },

    // === U-14 GROUP B (2 teams: КОА, ЛІЦ/Mighty) ===
    { seasonId: seasonYounger.id, homeTeamId: koa, awayTeamId: mig, tourId: tourYoungerB.id, scheduledAt: new Date('2026-05-10T07:00:00Z'), status: 'SCHEDULED', stage: 'groupB' },
    { seasonId: seasonYounger.id, homeTeamId: mig, awayTeamId: koa, tourId: tourYoungerB.id, scheduledAt: new Date('2026-05-10T09:00:00Z'), status: 'SCHEDULED', stage: 'groupB' },
    { seasonId: seasonYounger.id, homeTeamId: koa, awayTeamId: mig, tourId: tourYoungerB.id, scheduledAt: new Date('2026-05-17T07:00:00Z'), status: 'SCHEDULED', stage: 'groupB' },
    { seasonId: seasonYounger.id, homeTeamId: mig, awayTeamId: koa, tourId: tourYoungerB.id, scheduledAt: new Date('2026-05-17T09:00:00Z'), status: 'SCHEDULED', stage: 'groupB' },
    { seasonId: seasonYounger.id, homeTeamId: koa, awayTeamId: mig, tourId: tourYoungerB.id, scheduledAt: new Date('2026-05-24T07:00:00Z'), status: 'SCHEDULED', stage: 'groupB' },
    { seasonId: seasonYounger.id, homeTeamId: mig, awayTeamId: koa, tourId: tourYoungerB.id, scheduledAt: new Date('2026-05-24T09:00:00Z'), status: 'SCHEDULED', stage: 'groupB' },

    // === U-16 GROUP A (3 teams: ВЕД, WILD, DREA) ===
    { seasonId: seasonOlder.id, homeTeamId: ved, awayTeamId: drm, tourId: tourOlderA.id, scheduledAt: new Date('2026-05-10T07:00:00Z'), status: 'SCHEDULED', stage: 'groupA' },
    { seasonId: seasonOlder.id, homeTeamId: wld, awayTeamId: ved, tourId: tourOlderA.id, scheduledAt: new Date('2026-05-10T09:00:00Z'), status: 'SCHEDULED', stage: 'groupA' },
    { seasonId: seasonOlder.id, homeTeamId: drm, awayTeamId: wld, tourId: tourOlderA.id, scheduledAt: new Date('2026-05-17T07:00:00Z'), status: 'SCHEDULED', stage: 'groupA' },
    { seasonId: seasonOlder.id, homeTeamId: ved, awayTeamId: wld, tourId: tourOlderA.id, scheduledAt: new Date('2026-05-17T09:00:00Z'), status: 'SCHEDULED', stage: 'groupA' },
    { seasonId: seasonOlder.id, homeTeamId: wld, awayTeamId: drm, tourId: tourOlderA.id, scheduledAt: new Date('2026-05-24T07:00:00Z'), status: 'SCHEDULED', stage: 'groupA' },
    { seasonId: seasonOlder.id, homeTeamId: drm, awayTeamId: ved, tourId: tourOlderA.id, scheduledAt: new Date('2026-05-24T09:00:00Z'), status: 'SCHEDULED', stage: 'groupA' },

    // === U-16 GROUP B (3 teams: BLK, GOLD, STR) ===
    { seasonId: seasonOlder.id, homeTeamId: blk, awayTeamId: gld, tourId: tourOlderB.id, scheduledAt: new Date('2026-05-10T07:00:00Z'), status: 'SCHEDULED', stage: 'groupB' },
    { seasonId: seasonOlder.id, homeTeamId: str, awayTeamId: blk, tourId: tourOlderB.id, scheduledAt: new Date('2026-05-10T09:00:00Z'), status: 'SCHEDULED', stage: 'groupB' },
    { seasonId: seasonOlder.id, homeTeamId: gld, awayTeamId: str, tourId: tourOlderB.id, scheduledAt: new Date('2026-05-17T07:00:00Z'), status: 'SCHEDULED', stage: 'groupB' },
    { seasonId: seasonOlder.id, homeTeamId: blk, awayTeamId: str, tourId: tourOlderB.id, scheduledAt: new Date('2026-05-17T09:00:00Z'), status: 'SCHEDULED', stage: 'groupB' },
    { seasonId: seasonOlder.id, homeTeamId: str, awayTeamId: gld, tourId: tourOlderB.id, scheduledAt: new Date('2026-05-24T07:00:00Z'), status: 'SCHEDULED', stage: 'groupB' },
    { seasonId: seasonOlder.id, homeTeamId: gld, awayTeamId: blk, tourId: tourOlderB.id, scheduledAt: new Date('2026-05-24T09:00:00Z'), status: 'SCHEDULED', stage: 'groupB' },
  ];

  let created = 0;
  for (const g of games) {
    if (!g.homeTeamId || !g.awayTeamId || !g.tourId) {
      console.error('❌ Skipping game with missing IDs:', g);
      continue;
    }
    const game = await p.game.create({ data: g });
    console.log(`✅ Game ${game.id}: ${game.stage}`);
    created++;
  }

  console.log(`\n📊 Created ${created} games`);
  await p.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
