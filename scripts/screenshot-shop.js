const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  try {
    console.log('🌐 Запуск браузера...');
    const browser = await puppeteer.launch({ 
      headless: 'new',
      args: ['--no-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 768 });
    
    console.log('📄 Переход на /shop...');
    await page.goto('http://localhost:3006/shop', { waitUntil: 'networkidle2', timeout: 30000 });
    
    console.log('⏳ Чекаємо завантаження...');
    await new Promise(r => setTimeout(r, 3000));
    
    // Шукаємо вкладку Форма
    console.log('🔘 Натискаємо на вкладку Форма...');
    try {
      await page.click('button:has-text("Форма")').catch(() => {});
    } catch(e) {}
    
    await new Promise(r => setTimeout(r, 2000));
    
    const screenshotPath = path.join(__dirname, '../shop-forma-tab.png');
    await page.screenshot({ path: screenshotPath, fullPage: false });
    
    console.log(`✅ Скріншот збережений: ${screenshotPath}`);
    
    await browser.close();
  } catch(err) {
    console.error('❌ Помилка:', err.message);
    process.exit(1);
  }
})();
