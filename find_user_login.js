/**
 * Find user login form (for Андрей / +380931223434)
 */

const { chromium } = require('playwright');

async function findUserLogin() {
  console.log('🔍 ПОШУК USER LOGIN ФОРМИ\n');
  console.log('═'.repeat(80));

  let browser, page;

  try {
    browser = await chromium.launch({ headless: false });
    page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

    console.log('📖 Завантажую http://localhost:3006/login...');
    await page.goto('http://localhost:3006/login', {
      waitUntil: 'domcontentloaded',
      timeout: 15000
    });
    console.log('✅ Сторінка завантажена\n');

    // Wait a moment for React to load everything
    await page.waitForTimeout(2000);

    // Get all divs/sections with text that might indicate login forms
    const sections = await page.evaluate(() => {
      const results = [];

      // Find all text nodes that contain "Імʼя" or "Телефон" or similar
      document.querySelectorAll('*').forEach(el => {
        const text = el.innerText || el.textContent || '';
        if (text.includes('Імʼя') || text.includes('Телефон') || text.includes('Вхід') ||
            text.includes('Login') || text.includes('Користувач')) {
          results.push({
            tag: el.tagName,
            class: el.className,
            text: text.substring(0, 100),
            children_count: el.children.length
          });
        }
      });

      return results;
    });

    console.log('📋 ВСІХ ІНТЕРАКТИВНІ ЕЛЕМЕНТИ:');
    sections.slice(0, 10).forEach((sec, idx) => {
      console.log(`  [${idx}] <${sec.tag}> class="${sec.class}"`);
      console.log(`       Text: ${sec.text}`);
      console.log('');
    });

    // Try to find any inputs on the page
    const allInputs = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('input, textarea')).map(el => ({
        tag: el.tagName,
        type: el.type,
        placeholder: el.placeholder,
        value: el.value,
        visible: el.offsetParent !== null
      }));
    });

    console.log('\n📋 ВСІ INPUT/TEXTAREA ЕЛЕМЕНТИ:');
    allInputs.forEach((inp, idx) => {
      console.log(`  [${idx}] <${inp.tag}> type="${inp.type}" placeholder="${inp.placeholder}" visible=${inp.visible}`);
    });

    // Take screenshot to see what's on the page
    await page.screenshot({ path: './screenshots/10_login_page_visual.png' });
    console.log('\n✅ Скріншот сторінки: ./screenshots/10_login_page_visual.png');

    // Check if there are tabs or multiple forms
    const tabs = await page.evaluate(() => {
      return {
        tabs: document.querySelectorAll('[role="tab"]').length,
        buttons_with_text: Array.from(document.querySelectorAll('button'))
          .map(b => b.innerText)
          .filter(t => t.length > 0)
      };
    });

    console.log('\n📋 ДРУГІ ЕЛЕМЕНТИ:');
    console.log(`  Tabs/Toggles: ${tabs.tabs}`);
    console.log(`  Buttons: ${tabs.buttons_with_text.join(', ')}`);

    console.log('\n' + '═'.repeat(80));
    console.log('Браузер залишиться відкритим на 10 секунд для ручної перевірки...');
    await page.waitForTimeout(10000);

  } catch (err) {
    console.error('\n❌ ПОМИЛКА:', err.message);
  } finally {
    if (browser) {
      await browser.close();
      console.log('🔌 Браузер закрит');
    }
  }
}

findUserLogin().catch(err => {
  console.error('Помилка:', err);
});
