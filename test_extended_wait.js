const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  const allLogs = [];
  
  page.on('console', msg => {
    const text = msg.text();
    allLogs.push(text);
    if (text.includes('RucheekGameCanvas') || text.includes('SYNC') || text.includes('HOOP')) {
      console.log('✅ FOUND:', text);
    }
  });
  
  try {
    console.log('Opening chat page...');
    const resp = await page.goto('http://localhost:3006/chat', { waitUntil: 'domcontentloaded', timeout: 60000 });
    console.log('Page load status:', resp?.status());
    
    console.log('Waiting 15 seconds for full render...');
    for (let i = 0; i < 15; i++) {
      await new Promise(r => setTimeout(r, 1000));
      const current = allLogs.filter(l => l.includes('RucheekGameCanvas') || l.includes('SYNC')).length;
      if (current > 0) {
        console.log(`[${i+1}s] Found ${current} relevant logs`);
      }
    }
    
    console.log('\n=== FINAL COUNT ===');
    console.log(`Total logs: ${allLogs.length}`);
    console.log(`Component logs: ${allLogs.filter(l => l.includes('RucheekGameCanvas')).length}`);
    console.log(`Test logs: ${allLogs.filter(l => l.includes('SYNC') || l.includes('HOOP')).length}`);
    
    if (allLogs.length < 50) {
      console.log('\nAll logs:');
      allLogs.forEach(log => console.log(`  ${log.substring(0, 80)}`));
    } else {
      console.log('\nFirst 20 logs:');
      allLogs.slice(0, 20).forEach(log => console.log(`  ${log.substring(0, 80)}`));
    }
    
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await browser.close();
  }
})();
