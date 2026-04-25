const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 50 });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  
  console.log('📱 Opening game at http://localhost:3006/chat');
  await page.goto('http://localhost:3006/chat', { waitUntil: 'domcontentloaded', timeout: 15000 });
  
  console.log('\n═'.repeat(60));
  console.log('⏳ WAITING 120 SECONDS FOR MANUAL LOGIN');
  console.log('═'.repeat(60));
  console.log('\nYou can:');
  console.log('  1. Login as ADMIN (admin@basket.lviv.ua / Admin123!@#)');
  console.log('  2. Login as PLAYER (name + phone)');
  console.log('  3. Both in same session\n');
  
  for (let i = 120; i > 0; i--) {
    process.stdout.write(`\r⏳ ${i}s left...`);
    await new Promise(r => setTimeout(r, 1000));
  }
  
  console.log('\n\n✅ Time done. Taking screenshot...');
  await page.screenshot({ path: './screenshots/both_login_result.png' });
  console.log('✅ Saved: ./screenshots/both_login_result.png');
  
  await new Promise(r => setTimeout(r, 15000));
  await browser.close();
})();
