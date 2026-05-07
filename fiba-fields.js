const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const game = await prisma.game.findUnique({ where: { id: 159 } });

  // Show ALL fields of game record
  console.log('ALL GAME FIELDS:');
  Object.entries(game).forEach(([key, val]) => {
    if (typeof val === 'string' && val.length > 50) {
      console.log(`  ${key}: ${val.substring(0, 50)}...`);
    } else {
      console.log(`  ${key}: ${JSON.stringify(val)}`);
    }
  });

  // Specifically check FIBA fields
  console.log('\nFIBA FIELDS:');
  console.log('commissioner:', JSON.stringify(game.commissioner));
  console.log('referee:', JSON.stringify(game.referee));
  console.log('umpire1:', JSON.stringify(game.umpire1));
  console.log('umpire2:', JSON.stringify(game.umpire2));
  console.log('scorer:', JSON.stringify(game.scorer));
  console.log('assistantScorer:', JSON.stringify(game.assistantScorer));
  console.log('timer:', JSON.stringify(game.timer));
  console.log('shotClockOperator:', JSON.stringify(game.shotClockOperator));
  console.log('venue:', JSON.stringify(game.venue));

  // Check if garbage chars are in DB or rendered by code
  const hasGarbage = Object.values(game).some(v =>
    typeof v === 'string' && /[йцукенгшщзхъ]{3,}|[ппппп]|[ллллл]|[ккккккк]|[ууууу]|[ццццц]|[ййййй]/.test(v)
  );
  console.log('\nGarbage chars in DB:', hasGarbage ? '❌ YES — problem is in stored data' : '✅ NO — problem may be in rendering');
}

main().catch(console.error).finally(() => prisma.$disconnect());
