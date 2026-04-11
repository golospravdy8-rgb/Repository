const { PrismaClient } = require('@prisma/client');

async function fixChannelId() {
  const prisma = new PrismaClient();

  try {
    console.log('[STREAM SETTINGS FIX]');

    const rows = await prisma.siteSetting.findMany({
      where: { key: { startsWith: 'stream.' } }
    });

    console.log(`Found ${rows.length} stream settings`);

    for (const row of rows) {
      const cleaned = row.value.trim();
      const hadWhitespace = cleaned !== row.value;

      if (hadWhitespace) {
        await prisma.siteSetting.update({
          where: { id: row.id },
          data: { value: cleaned }
        });
        console.log(`✅ Fixed ${row.key}`);
        console.log(`   Before: ${JSON.stringify(row.value)}`);
        console.log(`   After:  ${JSON.stringify(cleaned)}`);
      } else {
        console.log(`✓ OK: ${row.key} = ${JSON.stringify(row.value)}`);
      }
    }

    console.log('\n[VERIFICATION]');
    const updated = await prisma.siteSetting.findMany({
      where: { key: { startsWith: 'stream.' } }
    });
    updated.forEach(r => {
      console.log(`${r.key}: ${JSON.stringify(r.value)}`);
    });

  } finally {
    await prisma.$disconnect();
  }
}

fixChannelId().catch(console.error);
