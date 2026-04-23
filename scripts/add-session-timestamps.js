const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Adding joinedAt and leftAt columns to ChatOnline table...');

    // Use raw SQL to add columns if they don't exist
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "ChatOnline"
      ADD COLUMN IF NOT EXISTS "joinedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      ADD COLUMN IF NOT EXISTS "leftAt" TIMESTAMP NULL;
    `);

    console.log('✅ Columns added successfully!');
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
