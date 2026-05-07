const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const game = await prisma.game.findUnique({
    where: { id: 159 },
    include: {
      events: { orderBy: { createdAt: 'asc' } },
      boxScores: { include: { player: true } },
      homeTeam: { include: { players: true } },
      awayTeam: { include: { players: true } },
    }
  });

  // Откуда берётся "ннннн" тренер?
  console.log('=== FIBA FIELDS ===');
  console.log('commissioner:', game.commissioner);
  console.log('referee:', game.referee);
  console.log('umpire1:', game.umpire1);
  console.log('umpire2:', game.umpire2);
  console.log('scorer:', game.scorer);
  console.log('assistantScorer:', game.assistantScorer);
  console.log('timer:', game.timer);
  console.log('shotClockOperator:', game.shotClockOperator);
  console.log('homeTeam.coachName:', game.homeTeam?.coachName);
  console.log('awayTeam.coachName:', game.awayTeam?.coachName);

  // Фолы: GameEvent vs BoxScore
  const foulEvents = game.events.filter(e => e.type.includes('FOUL'));
  const boxScoreFouls = game.boxScores.reduce((s, bs) => s + (bs.fouls || 0), 0);
  console.log('\n=== FOULS ===');
  console.log('From GameEvent:', foulEvents.length);
  console.log('From BoxScore:', boxScoreFouls);
  console.log('Match:', foulEvents.length === boxScoreFouls ? '✅' : '❌ MISMATCH');

  // Quarter scores
  const q1home = game.events.filter(e => e.quarter === 1 && e.teamId === game.homeTeamId && e.type === 'POINTS').reduce((s,e) => s + (e.points||0), 0);
  const q1away = game.events.filter(e => e.quarter === 1 && e.teamId === game.awayTeamId && e.type === 'POINTS').reduce((s,e) => s + (e.points||0), 0);
  console.log('\n=== QUARTER SCORES ===');
  console.log('Q1 home points from events:', q1home);
  console.log('Q1 away points from events:', q1away);
}

main().catch(console.error).finally(() => prisma.$disconnect());
