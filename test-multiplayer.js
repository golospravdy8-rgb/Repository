const { chromium } = require('playwright');

(async () => {
  console.log('🚀 Starting multiplayer test...\n');
  console.log('⏱️  FLOW: Chat → "🏀 Струмок" button → "+ Додати" → Enter game\n');

  const browser = await chromium.launch({ headless: false }); // headless: false to see what's happening

  // Browser A
  console.log('📱 Browser A: Opening chat...');
  const pageA = await browser.newPage();
  const logsA = [];
  pageA.on('console', msg => {
    const text = msg.text();
    logsA.push('[A] ' + text);
  });

  await pageA.goto('http://localhost:3006/chat', { waitUntil: 'networkidle' });
  console.log('✅ Browser A: Chat page loaded');

  // Click "Увійти як гравець" if needed
  try {
    const loginBtn = await pageA.$('button:has-text("Увійти як гравець")');
    if (loginBtn) {
      await pageA.click('button:has-text("Увійти як гравець")');
      console.log('✅ Browser A: Clicked "Увійти як гравець"');
      await pageA.waitForTimeout(1000);
    }
  } catch (e) {
    console.log('⚠️ Browser A: Login button not found (may already be logged in)');
  }

  // Click "🏀 Струмок" button to show game canvas
  try {
    await pageA.click('button:has-text("🏀 Струмок")');
    console.log('✅ Browser A: Clicked "🏀 Струмок" button');
    await pageA.waitForTimeout(1000);
  } catch (e) {
    console.log('⚠️ Browser A: Could not click Струмок button');
  }

  // Click "+ Додати" to add player to game
  try {
    await pageA.waitForSelector('button:has-text("+ Додати")', { timeout: 5000 });
    await pageA.click('button:has-text("+ Додати")');
    console.log('✅ Browser A: Clicked "+ Додати" - Player A entered game');
    await pageA.waitForTimeout(2000);
  } catch (e) {
    console.log('⚠️ Browser A: Could not find or click "+ Додати" button');
  }

  // Browser B
  console.log('\n📱 Browser B: Opening chat...');
  const pageB = await browser.newPage();
  const logsB = [];
  pageB.on('console', msg => {
    const text = msg.text();
    logsB.push('[B] ' + text);
  });

  await pageB.goto('http://localhost:3006/chat', { waitUntil: 'networkidle' });
  console.log('✅ Browser B: Chat page loaded');

  // Click "Увійти як гравець" if needed
  try {
    const loginBtn = await pageB.$('button:has-text("Увійти як гравець")');
    if (loginBtn) {
      await pageB.click('button:has-text("Увійти як гравець")');
      console.log('✅ Browser B: Clicked "Увійти як гравець"');
      await pageB.waitForTimeout(1000);
    }
  } catch (e) {
    console.log('⚠️ Browser B: Login button not found (may already be logged in)');
  }

  // Click "🏀 Струмок" button to show game canvas
  try {
    await pageB.click('button:has-text("🏀 Струмок")');
    console.log('✅ Browser B: Clicked "🏀 Струмок" button');
    await pageB.waitForTimeout(1000);
  } catch (e) {
    console.log('⚠️ Browser B: Could not click Струмок button');
  }

  // Click "+ Додати" to add player to game
  try {
    await pageB.waitForSelector('button:has-text("+ Додати")', { timeout: 5000 });
    await pageB.click('button:has-text("+ Додати")');
    console.log('✅ Browser B: Clicked "+ Додати" - Player B entered game');
    await pageB.waitForTimeout(2000);
  } catch (e) {
    console.log('⚠️ Browser B: Could not find or click "+ Додати" button');
  }

  // ⏱️ WAIT 60 SECONDS for manual verification
  console.log('\n⏳ Waiting 60 seconds for manual browser verification...');
  console.log('📋 During this time, you can:');
  console.log('   1. Check Browser A console for [🟢 onAdd] messages');
  console.log('   2. Check Browser B console for remote player count');
  console.log('   3. Move Player A around - should see movement in Browser B');
  console.log('   4. Look for red debug cross + yellow text on canvas\n');

  await pageB.waitForTimeout(60000);

  // Evaluate remote count
  const remoteCount = await pageB.evaluate(() => {
    return window.__remotePlayersCount !== undefined ? window.__remotePlayersCount : 'not-set';
  });

  console.log('\n=== LOGS BROWSER A (filtered) ===');
  logsA
    .filter(l => l.includes('onAdd') || l.includes('onChange') || l.includes('RENDER') || l.includes('Colyseus'))
    .slice(0, 20)
    .forEach(l => console.log(l));

  console.log('\n=== LOGS BROWSER B (filtered) ===');
  logsB
    .filter(l => l.includes('onAdd') || l.includes('onChange') || l.includes('RENDER') || l.includes('Colyseus') || l.includes('RECONCILE'))
    .slice(0, 20)
    .forEach(l => console.log(l));

  console.log('\n=== RESULT ===');
  console.log('Remote count in Browser B:', remoteCount);

  if (remoteCount === 1) {
    console.log('✅ SUCCESS: Remote player visible!');
    process.exit(0);
  } else if (remoteCount === 'not-set') {
    console.log('⚠️ WARNING: window.__remotePlayersCount not set');
    process.exit(1);
  } else {
    console.log('❌ FAIL: Expected 1, got', remoteCount);
    process.exit(1);
  }

  await browser.close();
})().catch(err => {
  console.error('❌ Test error:', err);
  process.exit(1);
});
