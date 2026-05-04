const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const counts = {
    seasons:     await p.season.count(),
    teams:       await p.team.count(),
    players:     await p.player.count(),
    games:       await p.game.count(),
    tours:       await p.tour.count(),
    groups:      await p.group.count(),
    groupTeams:  await p.groupTeam.count(),
    boxScores:   await p.boxScore.count(),
    standings:   await p.standing.count(),
    playoffs:    await p.playoff.count(),
    groupTables: await p.groupTables.count(),
  };
  console.log('=== КІЛЬКІСТЬ ЗАПИСІВ ===');
  console.table(counts);

  console.log('\n=== СЕЗОНИ ===');
  console.log(JSON.stringify(await p.season.findMany(), null, 2));

  console.log('\n=== КОМАНДИ ===');
  console.log(JSON.stringify(await p.team.findMany({
    select: { id: true, name: true, shortName: true, ageGroup: true, seasonId: true }
  }), null, 2));

  console.log('\n=== ГРАВЦІ (перші 30) ===');
  console.log(JSON.stringify(await p.player.findMany({
    take: 30,
    select: { id: true, firstName: true, lastName: true, number: true, position: true, teamId: true }
  }), null, 2));

  console.log('\n=== ІГРИ ===');
  console.log(JSON.stringify(await p.game.findMany({
    select: { id: true, seasonId: true, homeTeamId: true, awayTeamId: true, homeScore: true, awayScore: true, status: true, stage: true, scheduledAt: true }
  }), null, 2));

  console.log('\n=== СТАТИСТИКА ГРАВЦІВ (BoxScore, перші 20) ===');
  console.log(JSON.stringify(await p.boxScore.findMany({
    take: 20,
    include: { player: { select: { firstName: true, lastName: true } }, team: { select: { name: true } } }
  }), null, 2));

  console.log('\n=== STANDINGS (таблиця змагань) ===');
  console.log(JSON.stringify(await p.standing.findMany({
    include: { team: { select: { name: true } } }
  }), null, 2));

  console.log('\n=== ПЛЕЙ-ОФФ ===');
  console.log(JSON.stringify(await p.playoff.findMany(), null, 2));

  console.log('\n=== ТАБЛИЦІ ГРУП ===');
  console.log(JSON.stringify(await p.groupTables.findMany(), null, 2));

  await p.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
