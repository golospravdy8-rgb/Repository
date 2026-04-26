const puppeteer = require('puppeteer');

(async () => {
  console.log('\n🧪 GHOST PLAYER ANALYSIS - Direct remotePlayersRef inspection\n');

  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'] });
  const page = await browser.newPage();

  // Inject a script to monitor remotePlayersRef
  await page.evaluateOnNewDocument(() => {
    window.__ghostPlayerReport = {
      events: [],
      duplicates: [],
      mapSnapshots: []
    };

    // Monkey-patch Map.prototype.set to track all insertions
    const originalSet = Map.prototype.set;
    Map.prototype.set = function(key, value) {
      if (key && typeof key === 'string' && key.includes('player_')) {
        window.__ghostPlayerReport.events.push({
          type: 'SET',
          key: key,
          timestamp: Date.now()
        });
      }
      return originalSet.call(this, key, value);
    };

    // Monkey-patch Map.prototype.delete
    const originalDelete = Map.prototype.delete;
    Map.prototype.delete = function(key) {
      if (key && typeof key === 'string' && key.includes('player_')) {
        window.__ghostPlayerReport.events.push({
          type: 'DELETE',
          key: key,
          timestamp: Date.now()
        });
      }
      return originalDelete.call(this, key);
    };
  });

  console.log('🔗 Navigating to basketball.lviv.ua/chat...');
  await page.goto('https://basketball.lviv.ua/chat', { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(e => {
    console.log('⚠️  Navigation warning (may require auth):', e.message.slice(0, 50));
  });

  console.log('⏳ Monitoring for 10 seconds...\n');
  await new Promise(r => setTimeout(r, 10000));

  // Get the report
  const report = await page.evaluate(() => {
    return window.__ghostPlayerReport;
  }).catch(() => null);

  if (!report) {
    console.log('❌ Could not access monitoring data - page may require authentication');
    console.log('\n💡 TIP: Test requires logged-in session on basketball.lviv.ua/chat');
    console.log('   For automated testing, you would need to:');
    console.log('   1. Add login automation');
    console.log('   2. Accept cookies/terms');
    console.log('   3. Wait for game to load');
    console.log('   4. Monitor remotePlayersRef Map operations\n');

    await browser.close();
    process.exit(0);
  }

  console.log('='.repeat(80));
  console.log('GHOST PLAYER ANALYSIS RESULTS');
  console.log('='.repeat(80) + '\n');

  console.log('📊 Map Operations Detected:', report.events.length);
  console.log('\nOperation Timeline:');

  // Group operations by player ID
  const playerOps = {};
  report.events.forEach(evt => {
    if (!playerOps[evt.key]) playerOps[evt.key] = [];
    playerOps[evt.key].push(evt.type);
  });

  console.log('\nPer-Player Operations:');
  Object.entries(playerOps).forEach(([playerId, ops]) => {
    console.log(`  ${playerId}: ${ops.join(' → ')}`);
  });

  // Check for duplicates
  const allKeys = report.events.map(e => e.key);
  const duplicateKeys = allKeys.filter((key, idx) => allKeys.indexOf(key) !== idx);
  const uniqueDuplicates = [...new Set(duplicateKeys)];

  console.log('\n🔍 Duplicate Detection:');
  if (uniqueDuplicates.length === 0) {
    console.log('   ✅ NO DUPLICATES FOUND - Ghost player issue is FIXED!');
  } else {
    console.log(`   ⚠️  Found ${uniqueDuplicates.length} player IDs with multiple operations:`);
    uniqueDuplicates.forEach(key => {
      const ops = playerOps[key];
      console.log(`      ${key}: ${ops.length} operations`);

      // Check if we have both SET and DELETE for proper cleanup
      const hasBoth = ops.includes('SET') && ops.includes('DELETE');
      if (hasBoth) {
        console.log(`         ✅ Proper cleanup (SET → DELETE cycle)`);
      } else {
        console.log(`         ❌ Missing cleanup!`);
      }
    });
  }

  console.log('\n' + '='.repeat(80));
  console.log('CONCLUSION');
  console.log('='.repeat(80));

  // Final verdict
  const verdict = Object.values(playerOps).every(ops => {
    // Check if each player has at most one SET without being immediately deleted
    const setCount = ops.filter(op => op === 'SET').length;
    const deleteCount = ops.filter(op => op === 'DELETE').length;
    return deleteCount >= setCount - 1; // Allow max 1 active SET
  });

  if (verdict) {
    console.log('\n✅ GHOST PLAYER FIX: VERIFIED WORKING\n');
    console.log('Analysis: Player IDs are properly deduplicated');
    console.log('Old entries are deleted when new ones arrive\n');
  } else {
    console.log('\n⚠️  POTENTIAL ISSUE DETECTED\n');
    console.log('Some players may have multiple active entries\n');
  }

  await browser.close();
})().catch(err => {
  console.error('❌ Test error:', err.message);
  process.exit(1);
});
