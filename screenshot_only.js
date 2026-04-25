const { chromium } = require('playwright');

async function screenshot() {
  let browser, page;
  try {
    browser = await chromium.launch({ headless: false, slowMo: 50 });
    page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

    await page.goto('http://localhost:3006/chat', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(3000);

    // Wait 60 seconds for manual login
    console.log('⏳ Waiting 60 seconds for manual login...');
    for (let i = 60; i > 0; i--) {
      process.stdout.write(`\r${i}s left...`);
      await new Promise(r => setTimeout(r, 1000));
    }
    console.log('\n');

    // Take screenshot
    await page.screenshot({ path: './screenshots/final_screenshot.png' });
    console.log('✅ Screenshot saved: ./screenshots/final_screenshot.png');

    // Keep open 10 seconds
    await new Promise(r => setTimeout(r, 10000));

  } finally {
    if (browser) await browser.close();
  }
}

screenshot().catch(console.error);
