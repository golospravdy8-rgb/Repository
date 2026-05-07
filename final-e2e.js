const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== FINAL E2E VERIFICATION ===\n');

  // 1. Schedule: game/159 visible?
  const season = await prisma.season.findFirst({ where: { ageGroup: 'older', isActive: true } });
  const games = await prisma.game.findMany({ where: { seasonId: season.id } });
  const groupGames = games.filter(g => !g.stage || g.stage === 'group' || g.stage === 'groupA' || g.stage === 'groupB');
  const groupAGames = groupGames.filter(g => g.stage === 'groupA' || g.stage === 'group');
  const game159visible = groupAGames.find(g => g.id === 159 && g.status === 'FINAL');
  console.log('1. Schedule: game/159 visible:', game159visible ? '✅ YES' : '❌ NO');

  // 2. BoxScore: rebounds correct for player 70?
  const events = await prisma.gameEvent.findMany({ where: { gameId: 159, playerId: 70 } });
  const expectedReb = events.filter(e => ['REBOUND', 'REBOUND_DEF', 'REBOUND_OFF'].includes(e.type)).length;
  const bs = await prisma.boxScore.findFirst({ where: { gameId: 159, playerId: 70 } });
  console.log(`2. BoxScore rebounds: expected=${expectedReb} actual=${bs?.rebounds}`, expectedReb === bs?.rebounds ? '✅' : '❌');

  // 3. FIBA: no garbage?
  const game = await prisma.game.findUnique({ where: { id: 159 } });
  const garbage = ['scorer', 'timer', 'referee', 'umpire1', 'umpire2'].filter(f => game[f] && /[йцукен]{2,}/i.test(game[f]));
  console.log('3. FIBA garbage fields:', garbage.length === 0 ? '✅ NONE' : `❌ ${garbage.join(', ')}`);

  // 4. Leaders: stats varied?
  const allBS = await prisma.boxScore.findMany({ where: { game: { seasonId: season.id } } });
  const unique = new Set(allBS.map(b => `${b.points}-${b.rebounds}-${b.assists}`));
  console.log('4. Leaders: unique stat combos:', unique.size, unique.size > 3 ? '✅' : '❌ still too uniform');

  console.log('\n=== VERDICT ===');
  const allPass = game159visible && expectedReb === bs?.rebounds && garbage.length === 0 && unique.size > 3;
  console.log('PRODUCTION READY:', allPass ? '✅ YES' : '❌ NO');
}

main().catch(console.error).finally(() => prisma.$disconnect());
