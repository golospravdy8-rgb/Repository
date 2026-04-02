const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  const settings = await prisma.siteSettings.findMany({
    where: { key: { contains: 'contacts.' } },
    select: { key: true, value: true },
  });
  console.log(JSON.stringify(settings, null, 2));
  await prisma.$disconnect();
})().catch(e => {
  console.error(e);
  process.exit(1);
});
