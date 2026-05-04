const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  const allLogs = [];
  
  page.on('console', msg => {
    const text = msg.text();
    allLogs.push(text);
  });
  
  page.on('error', err => console.error('Page error:', err));
  page.on('pageerror', err => console.error('JS error:', err));
  
  try {
    console.log('Loading chat page...');
    await page.goto('http://localhost:3006/chat', { waitUntil: 'domcontentloaded', timeout: 30000 });
    console.log('Page loaded, waiting for game canvas...');
    
    // Wait for canvas and game to initialize
    await new Promise(r => setTimeout(r, 10000));
    
    console.log('\n=== ALL CONSOLE LOGS (Total: ' + allLogs.length + ') ===\n');
    
    // Show all logs, highlighting test results
    allLogs.forEach((log, i) => {
      if (log.includes('SYNC') || log.includes('HOOP') || log.includes('РИМ') || 
          log.includes('✅') || log.includes('❌') || log.includes('TEST') ||
          log.includes('авто') || log.includes('SCALE') || log.includes('synced')) {
        console.log(`[${i}] ⭐ ${log}`);
      }
    });
    
    // Check for test results
    const syncTest = allLogs.find(l => l.includes('SYNC TEST'));
    const hoopTest = allLogs.find(l => l.includes('HOOP TEST'));
    
    if (!syncTest && !hoopTest) {
      console.log('\n⚠️ Tests not found. Showing first 50 logs:');
      allLogs.slice(0, 50).forEach((log, i) => {
        if (!log.includes('Download') && !log.includes('vendor')) {
          console.log(`[${i}] ${log.substring(0, 100)}`);
        }
      });
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
})();
