const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  const logs = [];
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('RIM HIT') || text.includes('GOAL')) {
      logs.push(text);
      console.log('[CAPTURED]', text);
    }
  });
  
  console.log('Opening http://localhost:3006/chat...');
  await page.goto('http://localhost:3006/chat', { waitUntil: 'networkidle0', timeout: 30000 });
  console.log('Page loaded');
  
  // Wait longer for React to hydrate
  await new Promise(r => setTimeout(r, 3000));
  
  // Look for game button
  const content = await page.content();
  console.log('Checking page content...');
  console.log('Has "Гра":', content.includes('Гра'));
  console.log('Has canvas:', content.includes('canvas'));
  
  // Try to find and click game button
  const allButtons = await page.$$('button');
  console.log('Found ' + allButtons.length + ' buttons');
  
  for (let i = 0; i < allButtons.length; i++) {
    const text = await page.evaluate(el => el.textContent || el.innerText, allButtons[i]);
    console.log('Button ' + i + ':', text.substring(0, 50));
    if (text.includes('Гра') || text.includes('Game') || text.includes('🏀')) {
      console.log('Clicking game button...');
      await allButtons[i].click();
      break;
    }
  }
  
  await new Promise(r => setTimeout(r, 2000));
  
  // Check if canvas exists now
  const canvas = await page.$('canvas');
  console.log('Canvas found:', !!canvas);
  
  if (canvas) {
    for (let shot = 0; shot < 5; shot++) {
      console.log('\nShot ' + (shot + 1) + '...');
      const box = await canvas.boundingBox();
      const x = box.x + box.width / 2;
      const y = box.y + box.height / 2;
      
      await page.mouse.click(x, y);
      await new Promise(r => setTimeout(r, 200));
      
      await page.mouse.down();
      await new Promise(r => setTimeout(r, 600));
      await page.mouse.up();
      
      await new Promise(r => setTimeout(r, 3000));
    }
  }
  
  console.log('\n═══════════════════════════════════════');
  console.log('CAPTURED LOGS:');
  console.log('═══════════════════════════════════════');
  logs.forEach(log => console.log(log));
  console.log('TOTAL: ' + logs.length);
  
  await browser.close();
})();
