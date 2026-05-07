const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.game.update({
    where: { id: 159 },
    data: {
      referee: null,
      umpire1: null,
      umpire2: null,
    }
  });

  console.log('Referee/umpire fields cleaned');

  // Verify
  const updated = await prisma.game.findUnique({ where: { id: 159 } });
  console.log('referee:', updated.referee);
  console.log('umpire1:', updated.umpire1);
  console.log('umpire2:', updated.umpire2);
}

main().catch(console.error).finally(() => prisma.$disconnect());
