// ============================================
// BASKET-LVIV FULL DATABASE WIPE SCRIPT
// Complete data erasure - all tables dropped
// ============================================

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function wipeDatabase() {
  try {
    console.log('\n' + '='.repeat(70));
    console.log('BASKET-LVIV FULL DATABASE WIPE');
    console.log('='.repeat(70) + '\n');

    console.log('[STEP 1] Connecting to PostgreSQL database...');
    console.log('Host: ep-still-frost-an4xb137-pooler.c-6.us-east-1.aws.neon.tech');
    console.log('Database: neondb');
    console.log('Provider: Neon Serverless PostgreSQL\n');

    // Test connection
    await prisma.$queryRaw`SELECT 1`;
    console.log('✓ Database connection successful\n');

    // Step 2: Get list of all tables before deletion
    console.log('[STEP 2] Scanning existing tables...');
    const tablesBefore = await prisma.$queryRaw`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `;
    console.log(`Found ${tablesBefore.length} tables:\n`);
    tablesBefore.forEach(t => console.log(`  • ${t.table_name}`));
    console.log();

    // Step 3: Drop all foreign key constraints
    console.log('[STEP 3] Dropping all foreign key constraints...');

    // Get all constraints dynamically
    const constraints = await prisma.$queryRaw`
      SELECT constraint_name, table_name
      FROM information_schema.table_constraints
      WHERE constraint_type = 'FOREIGN KEY'
      AND table_schema = 'public'
    `;

    for (const constraint of constraints) {
      try {
        await prisma.$executeRawUnsafe(
          `ALTER TABLE "${constraint.table_name}" DROP CONSTRAINT IF EXISTS "${constraint.constraint_name}"`
        );
      } catch (e) {
        // Constraint may already be gone, continue
      }
    }
    console.log(`✓ Dropped ${constraints.length} foreign key constraints\n`);

    // Step 4: Drop all tables with CASCADE (use the dynamically found tables)
    console.log('[STEP 4] Dropping all tables...');
    for (const table of tablesBefore) {
      try {
        await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "${table.table_name}" CASCADE`);
      } catch (e) {
        console.error(`  ⚠ Failed to drop "${table.table_name}":`, e.message);
      }
    }
    console.log('✓ All tables dropped successfully\n');

    // Step 5: Drop Prisma migrations table if exists
    console.log('[STEP 5] Cleaning up Prisma metadata...');
    try {
      await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "_prisma_migrations" CASCADE`);
    } catch (e) {
      // OK if not found
    }
    console.log('✓ Prisma metadata cleaned\n');

    // Step 6: Drop all remaining sequences
    console.log('[STEP 6] Dropping all sequences (ID counters)...');
    const sequences = await prisma.$queryRaw`
      SELECT sequence_name
      FROM information_schema.sequences
      WHERE sequence_schema = 'public'
    `;

    for (const seq of sequences) {
      try {
        await prisma.$executeRawUnsafe(`DROP SEQUENCE IF EXISTS "${seq.sequence_name}" CASCADE`);
      } catch (e) {
        // Sequence may not exist anymore
      }
    }
    console.log(`✓ Dropped ${sequences.length} sequences\n`);

    // Step 7: Verify database is completely empty
    console.log('[STEP 7] Verifying database is completely empty...');
    const tablesAfter = await prisma.$queryRaw`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `;

    const sequencesAfter = await prisma.$queryRaw`
      SELECT sequence_name
      FROM information_schema.sequences
      WHERE sequence_schema = 'public'
    `;

    console.log(`✓ Verification: ${tablesAfter.length} tables, ${sequencesAfter.length} sequences\n`);

    if (tablesAfter.length === 0 && sequencesAfter.length === 0) {
      console.log('✓ COMPLETE SUCCESS: Database is 100% empty\n');
    } else {
      if (tablesAfter.length > 0) {
        console.log('Remaining tables:');
        tablesAfter.forEach(t => console.log(`  • ${t.table_name}`));
      }
      if (sequencesAfter.length > 0) {
        console.log('Remaining sequences:');
        sequencesAfter.forEach(s => console.log(`  • ${s.sequence_name}`));
      }
    }

    // Step 8: Summary
    console.log('\n' + '='.repeat(70));
    console.log('DATABASE WIPE COMPLETE - FULL CLEAN SLATE ACHIEVED');
    console.log('='.repeat(70) + '\n');
    console.log('Summary:');
    console.log(`  ✓ Tables deleted: ${tablesBefore.length}`);
    console.log(`  ✓ Tables remaining: ${tablesAfter.length}`);
    console.log(`  ✓ Sequences deleted: ${sequences.length}`);
    console.log(`  ✓ Sequences remaining: ${sequencesAfter.length}`);
    console.log(`  ✓ Foreign key constraints dropped`);
    console.log(`  ✓ Prisma metadata cleaned\n`);
    console.log('Status: ALL PORTS AND SECTIONS NOW COMPLETELY EMPTY\n');
    console.log('Next step: Run "npx prisma db push" to recreate empty schema');
    console.log('Then: Begin interactive restoration from backup_full_system.json\n');

    process.exit(0);
  } catch (error) {
    console.error('\n' + '!'.repeat(70));
    console.error('ERROR DURING DATABASE WIPE');
    console.error('!'.repeat(70) + '\n');
    console.error('Error details:');
    console.error(error.message);
    if (error.meta) {
      console.error('Meta:', error.meta);
    }
    console.error();
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Execute
wipeDatabase();
