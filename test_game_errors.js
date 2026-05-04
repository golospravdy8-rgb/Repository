const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  const errors = [];
  const logs = [];
  
  page.on('console', msg => {
    logs.push(msg.text());
  });
  
  page.on('error', err => {
    errors.push('Page error: ' + err.message);
  });
  
  page.on('pageerror', err => {
    errors.push('JS error: ' + err.message);
  });
  
  try {
    const response = await page.goto('http://localhost:3006/game?ag=younger', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    console.log('Page status:', response.status());
    
    // Wait for render
    await new Promise(r => setTimeout(r, 5000));
    
    // Check for canvas element
    const hasCanvas = await page.evaluate(() => !!document.querySelector('canvas'));
    console.log('Canvas found:', hasCanvas);
    
    // Check for specific test logs
    const allErrors = await page.evaluate(() => window.__errors || []);
    console.log('Window errors:', allErrors);
    
    console.log('\n=== Console Logs ===');
    logs.slice(0, 20).forEach(log => console.log(log));
    
    if (errors.length > 0) {
      console.log('\n=== Errors ===');
      errors.forEach(e => console.log(e));
    }
    
  } catch (error) {
    console.error('Test error:', error.message);
  } finally {
    await browser.close();
  }
})();
