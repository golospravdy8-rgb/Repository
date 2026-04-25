/**
 * Use Puppeteer to find exact input selectors on /login page
 */

const { chromium } = require('playwright');

async function findSelectors() {
  console.log('🔍 ПОШУК СЕЛЕКТОРІВ ФОРМИ ЛОГІНУ\n');
  console.log('═'.repeat(80));

  let browser, page;

  try {
    browser = await chromium.launch({ headless: true });
    page = await browser.newPage();

    console.log('📖 Завантажую http://localhost:3006/login...');
    await page.goto('http://localhost:3006/login', {
      waitUntil: 'domcontentloaded',
      timeout: 15000
    });
    console.log('✅ Сторінка завантажена\n');

    // Find all inputs
    console.log('📋 INPUT ЕЛЕМЕНТИ:');
    const inputs = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('input')).map((el, idx) => ({
        index: idx,
        type: el.type,
        name: el.name,
        id: el.id,
        placeholder: el.placeholder,
        class: el.className,
        selector: el.type ? `input[type="${el.type}"]` : 'input'
      }));
    });

    if (inputs.length === 0) {
      console.log('❌ Inputs не знайдені\n');
    } else {
      inputs.forEach(inp => {
        console.log(`  [${inp.index}] type="${inp.type}" name="${inp.name}" placeholder="${inp.placeholder}"`);
        console.log(`       id="${inp.id}" class="${inp.class}"`);
        console.log(`       Селектор: input[type="${inp.type}"]`);
        console.log('');
      });
    }

    // Find all buttons
    console.log('📋 BUTTON ЕЛЕМЕНТИ:');
    const buttons = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('button')).map((el, idx) => ({
        index: idx,
        text: el.innerText,
        type: el.type,
        id: el.id,
        class: el.className,
        onclick: el.onclick ? 'yes' : 'no'
      }));
    });

    if (buttons.length === 0) {
      console.log('❌ Buttons не знайдені\n');
    } else {
      buttons.forEach(btn => {
        console.log(`  [${btn.index}] text="${btn.text}" type="${btn.type}"`);
        console.log(`       id="${btn.id}" class="${btn.className}"`);
        console.log('');
      });
    }

    // Find form
    console.log('📋 FORM ЕЛЕМЕНТ:');
    const formInfo = await page.evaluate(() => {
      const form = document.querySelector('form');
      if (!form) return null;
      return {
        id: form.id,
        class: form.className,
        action: form.action,
        method: form.method,
        innerHTML_preview: form.innerHTML.substring(0, 200)
      };
    });

    if (formInfo) {
      console.log(`  ID: "${formInfo.id}"`);
      console.log(`  Class: "${formInfo.class}"`);
      console.log(`  Action: "${formInfo.action}"`);
      console.log(`  Method: "${formInfo.method}"\n`);
    } else {
      console.log('❌ Form не знайдена\n');
    }

    // Try to find inputs by other selectors
    console.log('📋 АЛЬТЕРНАТИВНІ СЕЛЕКТОРИ:');
    const altSelectors = await page.evaluate(() => {
      const results = {};

      // By type
      results['input[type="text"]'] = document.querySelectorAll('input[type="text"]').length;
      results['input[type="tel"]'] = document.querySelectorAll('input[type="tel"]').length;
      results['input[type="email"]'] = document.querySelectorAll('input[type="email"]').length;
      results['input[type="password"]'] = document.querySelectorAll('input[type="password"]').length;

      // By name attribute
      results['input[name]'] = Array.from(document.querySelectorAll('input[name]')).map(el => el.name);

      // By placeholder
      results['input[placeholder]'] = Array.from(document.querySelectorAll('input[placeholder]')).map(el => el.placeholder);

      return results;
    });

    Object.entries(altSelectors).forEach(([selector, value]) => {
      if (typeof value === 'number') {
        console.log(`  ${selector}: ${value} елементів`);
      } else if (Array.isArray(value)) {
        console.log(`  ${selector}: ${value.length > 0 ? value.join(', ') : '(не знайдено)'}`);
      }
    });

    console.log('\n' + '═'.repeat(80));

  } catch (err) {
    console.error('\n❌ ПОМИЛКА:', err.message);
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

findSelectors().catch(err => {
  console.error('Помилка:', err);
  process.exit(1);
});
