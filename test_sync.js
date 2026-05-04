const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  const logs = [];
  page.on('console', msg => {
    const text = msg.text();
    logs.push(text);
    if (text.includes('SYNC') || text.includes('HOOP') || text.includes('✅') || text.includes('❌')) {
      console.log(text);
    }
  });
  
  try {
    await page.goto('http://localhost:3006/chat', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 8000));
    
    const syncResults = logs.filter(l => l.includes('SYNC') || l.includes('✅') || l.includes('❌'));
    const hoopResults = logs.filter(l => l.includes('HOOP'));
    
    console.log('\n=== SYNC TEST RESULTS ===');
    syncResults.forEach(r => console.log(r));
    
    console.log('\n=== HOOP TEST RESULTS ===');
    hoopResults.forEach(r => console.log(r));
    
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await browser.close();
  }
})();
