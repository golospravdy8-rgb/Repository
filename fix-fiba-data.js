const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.game.update({
    where: { id: 159 },
    data: {
      scorer: null,
      assistantScorer: null,
      timer: null,
      shotClockOperator: null,
    }
  });

  // Also fix team coach names if they have garbage
  const game = await prisma.game.findUnique({
    where: { id: 159 },
    include: { homeTeam: true, awayTeam: true }
  });

  // Check and clean coach names
  const cleanCoach = (name) => /[йцукенгшщзхъфывапролджэячсмитьбю]{3,}/i.test(name || '') ? null : name;

  if (game.homeTeam.coachName && cleanCoach(game.homeTeam.coachName) === null) {
    await prisma.team.update({ where: { id: game.homeTeamId }, data: { coachName: null } });
    console.log('Cleaned homeTeam coach');
  }

  if (game.awayTeam.coachName && cleanCoach(game.awayTeam.coachName) === null) {
    await prisma.team.update({ where: { id: game.awayTeamId }, data: { coachName: null } });
    console.log('Cleaned awayTeam coach');
  }

  console.log('FIBA fields cleaned');

  // Verify
  const updated = await prisma.game.findUnique({ where: { id: 159 } });
  console.log('scorer:', updated.scorer);
  console.log('timer:', updated.timer);
}

main().catch(console.error).finally(() => prisma.$disconnect());
