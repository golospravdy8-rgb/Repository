#!/usr/bin/env node
const pg = require('pg');

async function fixStreamSettings() {
  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('✓ Connected to database');

    // Find all stream settings
    const result = await client.query(
      'SELECT id, key, value, LENGTH(value) as len FROM "SiteSetting" WHERE key LIKE $1',
      ['stream.%']
    );

    console.log(`\nFound ${result.rows.length} stream settings:`);

    for (const row of result.rows) {
      const trimmed = row.value.trim();
      const hadWhitespace = trimmed !== row.value;

      console.log(`\n${row.key}:`);
      console.log(`  Current:  ${JSON.stringify(row.value)} (${row.len} chars)`);

      if (hadWhitespace) {
        await client.query(
          'UPDATE "SiteSetting" SET value = $1 WHERE id = $2',
          [trimmed, row.id]
        );
        console.log(`  Fixed:    ${JSON.stringify(trimmed)} (${trimmed.length} chars) ✅`);
      } else {
        console.log(`  No change needed ✓`);
      }
    }

    // Verify
    console.log('\n[VERIFICATION]');
    const verify = await client.query(
      'SELECT key, value FROM "SiteSetting" WHERE key LIKE $1',
      ['stream.%']
    );

    verify.rows.forEach(row => {
      console.log(`${row.key}: ${JSON.stringify(row.value)}`);
    });

  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

fixStreamSettings();
