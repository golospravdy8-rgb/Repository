const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 50 });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto('http://localhost:3006/chat', { waitUntil: 'domcontentloaded' });

  console.log('⏳ 60 сек — залогінься і підійди БЛИЗЬКО до кільця, натисни клік...');
  for (let i = 60; i > 0; i--) { process.stdout.write(`\r${i}s`); await new Promise(r => setTimeout(r, 1000)); }
  await page.screenshot({ path: './screenshots/close_to_hoop.png' });
  console.log('\n📸 Скріншот 1 збережено — close_to_hoop.png');

  console.log('\n⏳ Ще 60 сек — відійди ДАЛЕКО від кільця і натисни клік...');
  for (let i = 60; i > 0; i--) { process.stdout.write(`\r${i}s`); await new Promise(r => setTimeout(r, 1000)); }
  await page.screenshot({ path: './screenshots/far_from_hoop.png' });
  console.log('\n📸 Скріщот 2 збережено — far_from_hoop.png');

  await new Promise(r => setTimeout(r, 5000));
  await browser.close();
})();
