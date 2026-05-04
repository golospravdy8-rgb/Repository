const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  const consoleLogs = [];
  
  page.on('console', msg => {
    const text = msg.text();
    consoleLogs.push(text);
  });
  
  try {
    console.log('Loading /chat page...');
    await page.goto('http://localhost:3006/chat', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    console.log('Waiting for hoop test to run...');
    await new Promise(r => setTimeout(r, 8000));
    
    // Find hoop test logs
    const hoopTests = consoleLogs.filter(log => 
      log.includes('HOOP TEST') || (log.includes('Ball') && log.includes('GOAL'))
    );
    
    console.log('\n=== HOOP TEST LOGS ===');
    if (hoopTests.length > 0) {
      hoopTests.forEach(log => console.log(log));
    } else {
      console.log('❌ No hoop test found');
      
      // Show first logs
      console.log('\n=== First Console Output ===');
      consoleLogs
        .filter(log => !log.includes('Download React') && !log.includes('vendor'))
        .slice(0, 20)
        .forEach(log => console.log(log.substring(0, 120)));
    }
    
    // Search for test result
    const passed = consoleLogs.find(log => log.includes('10/10'));
    console.log('\n=== FINAL RESULT ===');
    console.log(passed ? '✅ ' + passed : '❌ Test did not show 10/10');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
})();
