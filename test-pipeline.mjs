import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  console.log('=== SYSTEM DIAGNOSTIC ===\n');

  // 1. Seasons
  const seasons = await prisma.season.findMany();
  console.log('SEASONS:');
  seasons.forEach(s =>
    console.log(` ${s.name} active=${s.isActive} ag=${s.ageGroup}`)
  );

  // 2. Games
  const games = await prisma.game.findMany({
    include:{homeTeam:true,awayTeam:true,season:true},
    take:10
  });
  console.log('\nGAMES:');
  games.forEach(g =>
    console.log(` id=${g.id} ${g.homeTeam.name} vs ${g.awayTeam.name} status=${g.status}`)
  );

  // 3. Consistency check
  console.log('\nCONSISTENCY:');
  for (const game of games) {
    const bs = await prisma.boxScore.findMany({
      where:{gameId:game.id}
    });
    const homeSum = bs
      .filter(b=>b.teamId===game.homeTeamId)
      .reduce((s,b)=>s+b.points,0);
    const awaySum = bs
      .filter(b=>b.teamId===game.awayTeamId)
      .reduce((s,b)=>s+b.points,0);
    const homeOk = game.homeScore===homeSum;
    const awayOk = game.awayScore===awaySum;
    console.log(` Game ${game.id}: home ${game.homeScore}==${homeSum} ${homeOk?'✅':'❌'} away ${game.awayScore}==${awaySum} ${awayOk?'✅':'❌'}`);

    const onCourt = bs.filter(b=>b.isOnCourt);
    const homeOn = onCourt.filter(b=>b.teamId===game.homeTeamId).length;
    const awayOn = onCourt.filter(b=>b.teamId===game.awayTeamId).length;
    console.log(` Lineup: home=${homeOn}/5 ${homeOn<=5?'✅':'❌'} away=${awayOn}/5 ${awayOn<=5?'✅':'❌'}`);
  }

  // 4. Achievements
  const achievements = await prisma.playerAchievement
    .findMany({take:10})
    .catch(()=>[]);
  console.log(`\nACHIEVEMENTS: ${achievements.length} записів`);

  // 5. Leaders data
  const finishedGames = games.filter(g=>g.status==='FINISHED');
  console.log(`\nFINISHED GAMES: ${finishedGames.length}`);
  console.log(finishedGames.length > 0
    ? '✅ Leaders матимуть дані'
    : '⚠️  Немає завершених ігор — leaders порожні (норма)');

  await prisma.$disconnect();
  console.log('\n=== DONE ===');
}
run().catch(console.error);
