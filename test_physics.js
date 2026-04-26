const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();

  const logs = [];
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('RIM HIT') || text.includes('GOAL')) {
      logs.push(text);
    }
  });

  await page.goto('http://localhost:3006/chat', { waitUntil: 'networkidle2', timeout: 30000 });

  // Wait for game to load
  await new Promise(r => setTimeout(r, 2000));

  // Click basketball button
  const buttons = await page.$$('button');
  for (const btn of buttons) {
    const text = await page.evaluate(el => el.textContent, btn);
    if (text.includes('🏀') || text.includes('Гра') || text.includes('Game')) {
      await btn.click();
      break;
    }
  }

  await new Promise(r => setTimeout(r, 1000));

  // Make 15 shots
  for (let i = 0; i < 15; i++) {
    const canvas = await page.$('canvas');
    if (!canvas) break;

    const box = await canvas.boundingBox();
    if (!box) break;

    const x = box.x + box.width / 2 + (Math.random() - 0.5) * 100;
    const y = box.y + box.height / 2 + (Math.random() - 0.5) * 80;

    // Click to aim
    await page.mouse.click(x, y);
    await new Promise(r => setTimeout(r, 300));

    // Hold to charge
    await page.mouse.down();
    await new Promise(r => setTimeout(r, 500));
    await page.mouse.up();

    // Wait for ball flight
    await new Promise(r => setTimeout(r, 2000));
  }

  console.log('\n═══════════════════════════════════════');
  console.log('PHYSICS DEBUG LOGS (15 SHOTS):');
  console.log('═══════════════════════════════════════\n');
  logs.forEach(log => console.log(log));

  console.log('\n═══════════════════════════════════════');
  console.log('TOTAL LOGS: ' + logs.length);
  console.log('═══════════════════════════════════════');

  await browser.close();
})();
