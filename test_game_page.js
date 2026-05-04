const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  const testLogs = [];
  
  page.on('console', msg => {
    const text = msg.text();
    testLogs.push(text);
    if (text.includes('SYNC') || text.includes('HOOP') || text.includes('✅') || text.includes('❌') || text.includes('RIM') || text.includes('BALL')) {
      console.log(text);
    }
  });
  
  try {
    // Try the game page directly
    console.log('Opening game page...');
    await page.goto('http://localhost:3006/game', { waitUntil: 'domcontentloaded', timeout: 45000 });
    console.log('Game page loaded, waiting for initialization...');
    await new Promise(r => setTimeout(r, 8000));
    
    console.log('\n=== TEST RESULTS ===');
    const syncLogs = testLogs.filter(l => l.includes('SYNC'));
    const hoopLogs = testLogs.filter(l => l.includes('HOOP'));
    
    console.log(`Sync logs: ${syncLogs.length}`);
    console.log(`Hoop logs: ${hoopLogs.length}`);
    console.log(`Total logs: ${testLogs.length}`);
    
    if (testLogs.length > 0) {
      console.log('\nFirst 20 logs:');
      testLogs.slice(0, 20).forEach(log => console.log('  ' + log.substring(0, 100)));
    }
    
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await browser.close();
  }
})();
