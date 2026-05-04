const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  const allLogs = [];
  
  page.on('console', msg => {
    const text = msg.text();
    allLogs.push(text);
  });
  
  try {
    console.log('Opening chat page...');
    await page.goto('http://localhost:3006/chat', { waitUntil: 'domcontentloaded', timeout: 60000 });
    console.log('Page loaded, waiting for component...\n');
    await new Promise(r => setTimeout(r, 6000));
    
    console.log('=== CHECKING COMPONENT LOAD ===');
    const componentLogs = allLogs.filter(l => l.includes('RucheekGameCanvas'));
    const testLogs = allLogs.filter(l => l.includes('SYNC') || l.includes('HOOP') || l.includes('synced'));
    
    console.log(`Component render logs: ${componentLogs.length}`);
    componentLogs.forEach(log => console.log(`  ${log}`));
    
    console.log(`\nTest logs: ${testLogs.length}`);
    testLogs.forEach(log => console.log(`  ${log}`));
    
    console.log(`\nTotal logs: ${allLogs.length}`);
    if (allLogs.length < 20) {
      console.log('\nAll logs:');
      allLogs.forEach(log => console.log(`  ${log.substring(0, 100)}`));
    }
    
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await browser.close();
  }
})();
