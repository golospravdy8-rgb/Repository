const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  // 1. СЕЗОНИ
  const seasons = await p.season.findMany();
  console.log('\n=== СЕЗОНИ ===');
  seasons.forEach(s => console.log(`[${s.id}] ${s.name} | ageGroup: ${s.ageGroup} | active: ${s.isActive}`));

  // 2. КОМАНДИ З ДЕТАЛЯМИ
  const teams = await p.team.findMany({ orderBy: [{ ageGroup: 'asc' }, { id: 'asc' }] });
  console.log('\n=== КОМАНДИ ===');
  const younger = teams.filter(t => t.ageGroup === 'younger');
  const older = teams.filter(t => t.ageGroup === 'older');
  console.log(`\nU-14 (younger) — ${younger.length} команд:`);
  younger.forEach(t => console.log(`  [${t.id}] ${t.name} | short: ${t.shortName} | seasonId: ${t.seasonId}`));
  console.log(`\nU-16 (older) — ${older.length} команд:`);
  older.forEach(t => console.log(`  [${t.id}] ${t.name} | short: ${t.shortName} | seasonId: ${t.seasonId}`));

  // 3. ТУРИ
  const tours = await p.tour.findMany({ orderBy: [{ ageGroup: 'asc' }, { order: 'asc' }] });
  console.log('\n=== ТУРИ ===');
  tours.forEach(t => console.log(`  [${t.id}] ${t.name} | order: ${t.order} | ageGroup: ${t.ageGroup}`));

  // 4. ІГРИ З КОМАНДАМИ
  const games = await p.game.findMany({
    include: {
      homeTeam: { select: { name: true, shortName: true } },
      awayTeam: { select: { name: true, shortName: true } },
      tour: { select: { name: true } }
    },
    orderBy: { scheduledAt: 'asc' }
  });
  console.log(`\n=== ІГРИ (${games.length} всього) ===`);
  const gYounger = games.filter(g => {
    const t = teams.find(t => t.id === g.homeTeamId);
    return t?.ageGroup === 'younger';
  });
  const gOlder = games.filter(g => {
    const t = teams.find(t => t.id === g.homeTeamId);
    return t?.ageGroup === 'older';
  });
  console.log(`\nU-14 ігри (${gYounger.length}):`);
  gYounger.forEach(g => {
    const date = new Date(g.scheduledAt).toLocaleDateString('uk-UA');
    const time = new Date(g.scheduledAt).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Kiev' });
    console.log(`  [${g.id}] ${date} ${time} | ${g.homeTeam?.name} vs ${g.awayTeam?.name} | тур: ${g.tour?.name} | stage: ${g.stage} | ${g.status} | ${g.homeScore}:${g.awayScore}`);
  });
  console.log(`\nU-16 ігри (${gOlder.length}):`);
  gOlder.forEach(g => {
    const date = new Date(g.scheduledAt).toLocaleDateString('uk-UA');
    const time = new Date(g.scheduledAt).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Kiev' });
    console.log(`  [${g.id}] ${date} ${time} | ${g.homeTeam?.name} vs ${g.awayTeam?.name} | тур: ${g.tour?.name} | stage: ${g.stage} | ${g.status} | ${g.homeScore}:${g.awayScore}`);
  });

  // 5. ГРАВЦІ ПО КОМАНДАХ
  const players = await p.player.findMany({
    include: { team: { select: { name: true, ageGroup: true } } },
    orderBy: [{ teamId: 'asc' }, { number: 'asc' }]
  });
  console.log(`\n=== ГРАВЦІ (${players.length} всього) ===`);
  const playersByTeam = {};
  players.forEach(pl => {
    const key = `[${pl.teamId}] ${pl.team?.name}`;
    if (!playersByTeam[key]) playersByTeam[key] = [];
    playersByTeam[key].push(`#${pl.number} ${pl.lastName} ${pl.firstName} (${pl.position})`);
  });
  Object.entries(playersByTeam).forEach(([team, pls]) => {
    console.log(`\n  ${team} — ${pls.length} гравців:`);
    pls.forEach(pl => console.log(`    ${pl}`));
  });

  // 6. BOXSCORES
  const boxCount = await p.boxScore.count();
  console.log(`\n=== BOXSCORES: ${boxCount} записів ===`);
  if (boxCount > 0) {
    const top = await p.boxScore.findMany({
      take: 10,
      orderBy: { points: 'desc' },
      include: {
        player: { select: { firstName: true, lastName: true } },
        team: { select: { name: true } }
      }
    });
    console.log('ТОП-10 за очками:');
    top.forEach(b => console.log(`  ${b.player?.lastName}: ${b.points}pts ${b.rebounds}reb ${b.assists}ast — ${b.team?.name}`));
  }

  // 7. STANDINGS
  const standings = await p.standing.findMany({
    include: { team: { select: { name: true, ageGroup: true } } },
    orderBy: { rank: 'asc' }
  });
  console.log(`\n=== STANDINGS (${standings.length} записів) ===`);
  standings.forEach(s => {
    console.log(`  [rank ${s.rank}] ${s.team?.name} | W:${s.wins} L:${s.losses} | PF:${s.pointsFor} PA:${s.pointsAgainst}`);
  });

  // 8. ПЛЕЙ-ОФФ
  const playoffs = await p.playoff.findMany();
  console.log('\n=== ПЛЕЙ-ОФФ ===');
  playoffs.forEach(pl => {
    console.log(`\n${pl.ageGroup}:`);
    console.log(`  ПФ1: ${pl.semifinal1TeamA || '?'} ${pl.semifinal1ScoreA ?? '-'}:${pl.semifinal1ScoreB ?? '-'} ${pl.semifinal1TeamB || '?'}`);
    console.log(`  ПФ2: ${pl.semifinal2TeamA || '?'} ${pl.semifinal2ScoreA ?? '-'}:${pl.semifinal2ScoreB ?? '-'} ${pl.semifinal2TeamB || '?'}`);
    console.log(`  Фінал: ${pl.finalTeamA || '?'} ${pl.finalScoreA ?? '-'}:${pl.finalScoreB ?? '-'} ${pl.finalTeamB || '?'}`);
    console.log(`  3 місце: ${pl.thirdPlaceTeamA || '?'} ${pl.thirdPlaceScoreA ?? '-'}:${pl.thirdPlaceScoreB ?? '-'} ${pl.thirdPlaceTeamB || '?'}`);
  });

  // 9. GROUP TABLES
  const groupTables = await p.groupTables.findMany();
  console.log('\n=== ТАБЛИЦІ ГРУП ===');
  groupTables.forEach(gt => {
    console.log(`\n${gt.ageGroup}:`);
    console.log(`  Група A: ${gt.groupA?.join(', ')}`);
    console.log(`  Група B: ${gt.groupB?.join(', ')}`);
  });

  // ПІДСУМОК ПРОБЛЕМ
  console.log('\n=== ⚠️  ВИЯВЛЕНІ ПРОБЛЕМИ ===');
  if (tours.length < 14) console.log(`❌ Турів ${tours.length} — очікується 14 (8 для U-14 + 6 для U-16)`);
  if (games.length < 28) console.log(`❌ Ігор ${games.length} — очікується 28 (16 U-14 + 12 U-16)`);
  if (younger.length < 9) console.log(`❌ U-14 команд ${younger.length} — очікується 9`);
  if (older.length < 8) console.log(`❌ U-16 команд ${older.length} — очікується 8`);
  if (boxCount === 0) console.log('⚠️  BoxScores пусті — статистика гравців не ведеться');

  await p.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
