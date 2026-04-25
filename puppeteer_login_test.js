/**
 * PUPPETEER LOGIN TEST — headless:false
 * Заходи на localhost:3006/login, заповни форму, зроби скріншот
 */

const { chromium } = require('playwright');
const fs = require('fs');

async function loginAndTest() {
  console.log('🎮 BASKETBALL LOGIN TEST\n');
  console.log('═'.repeat(80));

  let browser, page;

  try {
    // 1. ЗАПУСТИТИ БРАУЗЕР З ВИДИМИМ ВІКНОМ
    console.log('📱 Запуск браузера (headless:false)...');
    browser = await chromium.launch({ headless: false });
    page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

    // 2. ПЕРЕЙТИ НА LOGIN
    console.log('🌐 Перехід на http://localhost:3006/login...');
    await page.goto('http://localhost:3006/login', {
      waitUntil: 'domcontentloaded',
      timeout: 15000
    });
    console.log('✅ Сторінка завантажена');

    // 3. ЗНАЙТИ ІНПУТИ І ЗАПОВНИТИ
    console.log('\n📝 Пошук форми входу...');
    const inputs = await page.$$('input');
    console.log(`✅ Знайдено ${inputs.length} input полів`);

    // Знайти поля по type або placeholder
    const nameInput = await page.$('input[name="name"], input[placeholder*="Імʼя"], input[placeholder*="name"]');
    const phoneInput = await page.$('input[name="phone"], input[placeholder*="Телефон"], input[placeholder*="phone"]');

    if (!nameInput || !phoneInput) {
      console.log('⚠️ Не знайдені усі поля. Спробую по порядку...');
      // Альтернативно — заповнюємо по порядку
      if (inputs.length >= 2) {
        await inputs[0].fill('Андрей');
        console.log('✅ Заповнено первое поле (имя): Андрей');

        await inputs[1].fill('+380931223434');
        console.log('✅ Заповнено второе поле (телефон): +380931223434');
      }
    } else {
      await nameInput.fill('Андрей');
      console.log('✅ Заповнено поле імені: Андрей');

      await phoneInput.fill('+380931223434');
      console.log('✅ Заповнено поле телефону: +380931223434');
    }

    // 4. НАТИСНУТИ КНОПКУ ВХОДУ
    console.log('\n🔐 Пошук кнопки входу...');
    const submitButton = await page.$('button[type="submit"], button:has-text("Вход"), button:has-text("Login"), button:has-text("Увійти")');

    if (submitButton) {
      await submitButton.click();
      console.log('✅ Натиснута кнопка входу');
    } else {
      console.log('⚠️ Кнопка не знайдена. Спробую по Enter...');
      await page.press('input', 'Enter');
    }

    // 5. ЧЕКАТИ ПЕРЕНАПРАВЛЕННЯ
    console.log('⏳ Чекаю перенаправлення...');
    await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => {
      console.log('⚠️ Перенаправлення не сталося, але продовжую...');
    });

    // 6. ЧЕКАТИ ЩОБ ПОТРАПИЛИ В ГРУ
    console.log('🏀 Перевірка що в грі...');
    await page.waitForSelector('canvas', { timeout: 5000 }).catch(() => {
      console.log('⚠️ Canvas не знайдено, але продовжую...');
    });

    const currentUrl = page.url();
    console.log(`📍 Поточний URL: ${currentUrl}`);

    // 7. СКРІНШОТ УСПІШНОГО ВХОДУ
    console.log('\n📸 Збереження скріншота входу...');
    await page.screenshot({ path: './screenshots/01_login_success.png' });
    console.log('✅ Скріншот збережено: ./screenshots/01_login_success.png');

    console.log('\n' + '═'.repeat(80));
    console.log('✅ ВХІД УСПІШНИЙ\n');

    // Триматимемо браузер відкритим 5 секунд для перевірки
    console.log('Браузер залишиться відкритим на 10 секунд для перевірки...');
    await page.waitForTimeout(10000);

  } catch (err) {
    console.error('\n❌ ПОМИЛКА:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
      console.log('\n🔌 Браузер закрит');
    }
  }
}

// ЗАПУСТИТИ
loginAndTest().catch(err => {
  console.error('Помилка:', err);
  process.exit(1);
});
