import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:3006/shop', { waitUntil: 'networkidle2' });
  
  // Wait for products to load
  await page.waitForSelector('[data-testid="product-card"]', { timeout: 5000 }).catch(() => {});
  
  // Take screenshot
  await page.screenshot({ path: 'shop-screenshot.png', fullPage: true });
  console.log('Screenshot saved: shop-screenshot.png');
  
  await browser.close();
})();
