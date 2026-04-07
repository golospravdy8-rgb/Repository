import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const games = await prisma.game.findMany({
    select: { id: true, seasonId: true, homeTeamId: true, awayTeamId: true, scheduledAt: true },
    orderBy: { id: 'asc' },
    take: 20,
  });

  console.log(`📊 ВСЬОГО ИГОР В БД: ${games.length}\n`);
  console.log('ID | Season | Home | Away | Дата');
  console.log('---|--------|------|------|----------');
  
  games.forEach(g => {
    const date = new Date(g.scheduledAt).toLocaleDateString('uk-UA');
    console.log(`${g.id}  | ${g.seasonId}  | ${g.homeTeamId}  | ${g.awayTeamId}  | ${date}`);
  });

  // Проверка конкретно ID 15
  const game15 = await prisma.game.findUnique({
    where: { id: 15 },
  });

  console.log(`\n🔍 Игра ID=15: ${game15 ? '✅ СУЩЕСТВУЕТ' : '❌ НЕ НАЙДЕНА'}`);

  process.exit(0);
}

main().catch(console.error);
