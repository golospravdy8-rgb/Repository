const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  
  const logs = [];
  page.on('console', msg => {
    const text = msg.text();
    logs.push(text);
    if (text.includes('HOOP') || text.includes('GOAL') || text.includes('ТЕСТ')) {
      console.log(`✅ FOUND: ${text}`);
    }
  });
  
  try {
    console.log('Loading chat page...');
    await page.goto('http://localhost:3006/chat', { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    console.log('Waiting for page to render...');
    await new Promise(r => setTimeout(r, 3000));
    
    // Find and click the game button
    const gameButtons = await page.$$eval('button', buttons => 
      buttons
        .map(b => ({ text: b.textContent, html: b.innerHTML }))
        .filter(b => b.text && (b.text.includes('🏀') || b.text.includes('РУЧЕЁК')))
    );
    
    console.log('Found buttons:', gameButtons);
    
    // Try to find the button by looking for canvas or game toggle
    const buttons = await page.$$('button');
    for (let i = 0; i < buttons.length; i++) {
      const text = await buttons[i].evaluate(b => b.textContent);
      if (text && (text.includes('🏀') || text.includes('Рухейок') || text.includes('Game'))) {
        console.log(`Clicking button: ${text}`);
        await buttons[i].click();
        break;
      }
    }
    
    console.log('Waiting for game to initialize...');
    await new Promise(r => setTimeout(r, 5000));
    
    const testLogs = logs.filter(log => log.includes('HOOP TEST') || log.includes('10/10'));
    if (testLogs.length > 0) {
      console.log('\n=== ✅ TEST FOUND ===');
      testLogs.forEach(log => console.log(log));
    } else {
      console.log('\n=== ❌ NO TEST LOGS ===');
      console.log('Total console logs:', logs.length);
      const relevant = logs.filter(log => !log.includes('React') && !log.includes('vendor'));
      console.log('Relevant logs:');
      relevant.slice(0, 30).forEach(log => console.log(log.substring(0, 120)));
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    // Keep browser open for 5 seconds to see what happened
    await new Promise(r => setTimeout(r, 5000));
    await browser.close();
  }
})();
