const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  const testLogs = [];
  
  page.on('console', msg => {
    const text = msg.text();
    testLogs.push(text);
    if (text.includes('SYNC') || text.includes('HOOP') || text.includes('✅') || text.includes('❌') || text.includes('RIM') || text.includes('synced') || text.includes('BALL')) {
      console.log(text);
    }
  });
  
  try {
    console.log('Opening chat page...');
    await page.goto('http://localhost:3006/chat', { waitUntil: 'domcontentloaded', timeout: 60000 });
    console.log('Page loaded, waiting for component mount...\n');
    await new Promise(r => setTimeout(r, 5000));
    
    const syncTest = testLogs.find(l => l.includes('SYNC TEST'));
    const hoopTest = testLogs.find(l => l.includes('HOOP TEST'));
    
    console.log('\n=== FINAL RESULT ===');
    console.log(`Sync Test Found: ${!!syncTest}`);
    console.log(`Hoop Test Found: ${!!hoopTest}`);
    console.log(`Total Logs: ${testLogs.length}`);
    
    if (!syncTest && !hoopTest) {
      console.log('\n⚠️ Tests not found. First 30 logs:');
      testLogs.slice(0, 30).forEach((log, i) => {
        if (!log.includes('Download') && log.length < 120) console.log(`  ${log}`);
      });
    }
    
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await browser.close();
  }
})();
