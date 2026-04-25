const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 50 });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  
  await page.goto('http://localhost:3006/chat', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(3000);
  
  console.log('⏳ 60 seconds...');
  for (let i = 60; i > 0; i--) {
    process.stdout.write(`\r${i}s`);
    await new Promise(r => setTimeout(r, 1000));
  }
  
  await page.screenshot({ path: './screenshots/final_test.png' });
  console.log('\n✅ Saved');
  
  await new Promise(r => setTimeout(r, 10000));
  await browser.close();
})();
