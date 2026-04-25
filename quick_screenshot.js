const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 50 });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  
  await page.goto('http://localhost:3006/chat', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(3000);
  
  console.log('⏳ 60 seconds to login...');
  for (let i = 60; i > 0; i--) {
    process.stdout.write(`\r${i}s left...`);
    await new Promise(r => setTimeout(r, 1000));
  }
  
  await page.screenshot({ path: './screenshots/result.png' });
  console.log('\n✅ Screenshot: ./screenshots/result.png');
  
  await new Promise(r => setTimeout(r, 10000));
  await browser.close();
})();
