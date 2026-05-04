const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  const consoleLogs = [];
  
  page.on('console', msg => {
    consoleLogs.push({
      type: msg.type(),
      text: msg.text(),
      args: msg.args().length
    });
    console.log(`[${msg.type().toUpperCase()}] ${msg.text()}`);
  });
  
  page.on('error', err => {
    console.error('Page error:', err);
  });
  
  try {
    await page.goto('http://localhost:3006/game?ag=younger', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    // Wait for hoop test to run (should be < 1 second)
    await new Promise(r => setTimeout(r, 3000));
    
    console.log('\n=== Console Logs Captured ===');
    consoleLogs.forEach(log => {
      console.log(`${log.type}: ${log.text}`);
    });
    
    // Check if test passed
    const testResult = consoleLogs.find(log => log.text.includes('ТЕСТ ПРОЙДЕН'));
    console.log('\n=== TEST RESULT ===');
    if (testResult) {
      console.log('✅ Test found:', testResult.text);
    } else {
      console.log('⚠️ Test result not found in console logs');
      const hoopResults = consoleLogs.filter(log => log.text.includes('HOOP TEST'));
      console.log('Hoop-related logs:', hoopResults);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
})();
