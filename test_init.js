const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  const testLogs = [];
  
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('SYNC') || text.includes('HOOP') || text.includes('✅') || text.includes('❌') || text.includes('RIM') || text.includes('BALL')) {
      testLogs.push(text);
      console.log(text);
    }
  });
  
  try {
    console.log('Opening chat page...');
    await page.goto('http://localhost:3006/chat', { waitUntil: 'domcontentloaded', timeout: 45000 });
    console.log('Page loaded, waiting for tests...');
    await new Promise(r => setTimeout(r, 5000));
    
    console.log('\n=== TEST SUMMARY ===');
    if (testLogs.length === 0) {
      console.log('❌ No test logs captured');
    } else {
      console.log(`✅ Captured ${testLogs.length} test logs`);
    }
    
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await browser.close();
    process.exit(testLogs.length > 0 ? 0 : 1);
  }
})();
