const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  const consoleLogs = [];
  const errors = [];
  
  page.on('console', msg => {
    const text = msg.text();
    consoleLogs.push(text);
    if (msg.type() === 'error' || text.includes('ERROR')) {
      errors.push(text);
      console.log(`[ERROR] ${text}`);
    } else if (msg.type() === 'log' && (text.includes('HOOP') || text.includes('TEST') || text.includes('GOAL'))) {
      console.log(`[LOG] ${text}`);
    }
  });
  
  page.on('error', err => {
    errors.push('Page error: ' + err.message);
    console.error('Page error:', err.message);
  });
  
  page.on('pageerror', err => {
    errors.push('JS error: ' + err.message);
    console.error('JS error:', err.message);
  });
  
  try {
    console.log('Loading /chat page...');
    const response = await page.goto('http://localhost:3006/chat', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    console.log('Page status:', response.status());
    
    // Wait for canvas to render and test to run
    console.log('Waiting for hoop test...');
    await page.waitForTimeout(5000);
    
    // Check for canvas
    const hasCanvas = await page.evaluate(() => !!document.querySelector('canvas'));
    console.log('Canvas found:', hasCanvas);
    
    // Find test logs
    const testLogs = consoleLogs.filter(log => 
      log.includes('HOOP TEST') || log.includes('GOAL') || log.includes('MISS') || log.includes('ТЕСТ')
    );
    
    console.log('\n=== TEST RESULTS ===');
    if (testLogs.length > 0) {
      testLogs.forEach(log => console.log(log));
    } else {
      console.log('No hoop test logs found');
      console.log('\n=== First 30 console logs ===');
      consoleLogs.slice(0, 30).forEach((log, i) => {
        if (!log.includes('Download the React')) {
          console.log(`${i}: ${log.substring(0, 100)}`);
        }
      });
    }
    
    if (errors.length > 0) {
      console.log('\n=== ERRORS ===');
      errors.forEach(e => console.log(e));
    }
    
  } catch (error) {
    console.error('Test failed:', error.message);
  } finally {
    await browser.close();
  }
})();
