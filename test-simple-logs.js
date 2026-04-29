#!/usr/bin/env node
const puppeteer = require('puppeteer');

(async () => {
  let browser;
  try {
    console.log('🧪 Capturing all console logs...\n');
    
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    page.setViewport({ width: 1280, height: 900 });

    const allLogs = [];
    page.on('console', msg => {
      const text = msg.text();
      allLogs.push(text);
      if (text.includes('[⚽') || text.includes('[🎯') || text.includes('[📍') || 
          text.includes('WS') || text.includes('ERROR') || text.includes('PHYSICS')) {
        console.log(`📡 ${text.substring(0, 160)}`);
      }
    });

    console.log('📄 Loading http://localhost:3006/game...');
    await page.goto('http://localhost:3006/game', { waitUntil: 'networkidle2', timeout: 30000 }).catch(e => {});

    console.log('⏳ Capturing logs for 10 seconds...\n');
    await new Promise(r => setTimeout(r, 10000));

    console.log('\n\n📊 ALL CAPTURED LOGS:\n');
    allLogs.forEach((log, i) => {
      console.log(`${i}: ${log.substring(0, 150)}`);
    });

    console.log(`\n✅ Total logs: ${allLogs.length}`);
    process.exit(0);
  } catch (error) {
    console.error('❌', error.message);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
  }
})();
