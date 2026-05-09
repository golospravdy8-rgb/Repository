const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    // Try basic query
    const count = await prisma.boxScore.count();
    console.log('BoxScore count:', count);

    const bs = await prisma.boxScore.findFirst();
    if (bs) {
      console.log('\nBoxScore columns:');
      Object.keys(bs).forEach(key => {
        console.log(`  ${key}: ${typeof bs[key]}`);
      });
    } else {
      console.log('No BoxScores in database');
    }
  } catch (e) {
    console.error('Database error:', e.message);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
})();
