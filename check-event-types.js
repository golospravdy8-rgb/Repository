const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const types = await prisma.gameEvent.groupBy({
    by: ['type'],
    where: { gameId: 159 },
    _count: { type: true }
  });
  types.forEach(t => console.log(`${t.type}: ${t._count.type}`));
}

main().catch(console.error).finally(() => prisma.$disconnect());
