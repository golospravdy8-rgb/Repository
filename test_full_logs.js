const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  const logs = [];
  
  page.on('console', msg => logs.push(`[${msg.type()}] ${msg.text()}`));
  page.on('response', res => {
    if (res.status() !== 200 && res.status() !== 304) {
      logs.push(`[HTTP ${res.status()}] ${res.url()}`);
    }
  });
  
  try {
    await page.goto('http://localhost:3006/chat', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    
    await new Promise(r => setTimeout(r, 5000));
    
    console.log('=== ALL LOGS ===');
    logs.forEach(log => console.log(log));
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
})();
