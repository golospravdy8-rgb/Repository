const puppeteer = require('puppeteer');

(async () => {
  console.log('\n🧪 GHOST PLAYER TEST - Simulating 2 concurrent users...\n');

  // Launch two browsers
  const browser1 = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const browser2 = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });

  const page1 = await browser1.newPage();
  const page2 = await browser2.newPage();

  const logs1 = [];
  const logs2 = [];

  // Listen for console messages
  page1.on('console', msg => {
    const t = msg.text();
    if (t.includes('remotePlayersRef') || t.includes('ghost') || t.includes('JOIN') || t.includes('MOVE') || t.includes('RIM HIT')) {
      logs1.push(t);
      console.log('[Browser 1]', t);
    }
  });

  page2.on('console', msg => {
    const t = msg.text();
    if (t.includes('remotePlayersRef') || t.includes('ghost') || t.includes('JOIN') || t.includes('MOVE') || t.includes('RIM HIT')) {
      logs2.push(t);
      console.log('[Browser 2]', t);
    }
  });

  console.log('📱 Opening first browser...');
  await page1.goto('https://basketball.lviv.ua/chat', { waitUntil: 'networkidle0', timeout: 60000 }).catch(e => console.log('Load warning:', e.message));

  console.log('📱 Opening second browser...');
  await page2.goto('https://basketball.lviv.ua/chat', { waitUntil: 'networkidle0', timeout: 60000 }).catch(e => console.log('Load warning:', e.message));

  console.log('\n⏳ Waiting 8 seconds for game state sync...\n');
  await new Promise(r => setTimeout(r, 8000));

  // Check remote players count
  const remoteCount1 = await page1.evaluate(() => {
    // Try to access remotePlayersRef through window
    if (window.__remotePlayersCount !== undefined) {
      return window.__remotePlayersCount;
    }
    // Count canvas elements (rough estimate)
    return document.querySelectorAll('canvas').length;
  }).catch(() => 'N/A');

  const remoteCount2 = await page2.evaluate(() => {
    if (window.__remotePlayersCount !== undefined) {
      return window.__remotePlayersCount;
    }
    return document.querySelectorAll('canvas').length;
  }).catch(() => 'N/A');

  console.log('\n' + '='.repeat(80));
  console.log('TEST RESULTS');
  console.log('='.repeat(80));
  console.log('\n📊 Browser 1:');
  console.log('   Total logs:', logs1.length);
  console.log('   Sample logs:', logs1.slice(0, 5));
  console.log('\n📊 Browser 2:');
  console.log('   Total logs:', logs2.length);
  console.log('   Sample logs:', logs2.slice(0, 5));
  console.log('\n🎮 Remote players visible:');
  console.log('   Browser 1:', remoteCount1);
  console.log('   Browser 2:', remoteCount2);

  // Analyze for ghost players
  const joinEvents1 = logs1.filter(l => l.includes('JOIN') || l.includes('joined'));
  const moveEvents1 = logs1.filter(l => l.includes('MOVE') || l.includes('move'));

  console.log('\n🔍 Event Analysis (Browser 1):');
  console.log('   Join events:', joinEvents1.length);
  console.log('   Move events:', moveEvents1.length);

  if (joinEvents1.length > 0 && moveEvents1.length > 0) {
    console.log('\n✅ EVENT FLOW DETECTED - Game is syncing!');
  } else {
    console.log('\n⚠️  No event logs detected - check browser logs manually');
  }

  await browser1.close();
  await browser2.close();

  console.log('\n✅ Test completed!\n');
})().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
