#!/usr/bin/env node
/**
 * Fix SiteSettings sequence that was out of sync
 *
 * This script fixes the error:
 * "Invalid `prisma.siteSettings.upsert()` invocation: Unique constraint failed on the fields: ('id')"
 *
 * Root cause: PostgreSQL sequence (auto-increment counter) was lower than max ID in table,
 * causing new inserts to conflict with existing IDs.
 */

const { PrismaClient } = require("@prisma/client");

async function fixSequence() {
  const prisma = new PrismaClient();

  try {
    console.log("🔧 Fixing SiteSettings sequence...");

    // Get max ID
    const result = await prisma.$queryRaw`SELECT MAX(id) as max_id FROM "SiteSettings"`;
    const maxId = result[0].max_id;
    console.log(`Current max ID in table: ${maxId}`);

    // Reset sequence to max_id + 1
    const newSeqVal = maxId + 1;
    await prisma.$executeRawUnsafe(
      `ALTER SEQUENCE "SiteSettings_id_seq" RESTART WITH ${newSeqVal};`
    );

    console.log(`✅ Sequence fixed! Next ID will be: ${newSeqVal}`);

    // Test that upsert now works
    console.log("\n🧪 Testing upsert...");
    const testResult = await prisma.siteSettings.upsert({
      where: { key: "test.sequence.fixed" },
      update: { value: "tested" },
      create: { key: "test.sequence.fixed", value: "tested" },
    });
    console.log("✅ Upsert test successful!");
    console.log(`   Created record ID: ${testResult.id}`);

  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

fixSequence();
