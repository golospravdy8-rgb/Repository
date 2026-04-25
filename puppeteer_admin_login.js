/**
 * ADMIN LOGIN TEST — admin@basket.lviv.ua / Admin123!@#
 */

const { chromium } = require('playwright');

async function adminLogin() {
  console.log('🔐 ADMIN LOGIN TEST\n');
  console.log('═'.repeat(80));

  let browser, page;

  try {
    console.log('📱 Запуск браузера...');
    browser = await chromium.launch({ headless: false });
    page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

    console.log('🌐 Перехід на http://localhost:3006/admin/login...');
    await page.goto('http://localhost:3006/admin/login', {
      waitUntil: 'domcontentloaded',
      timeout: 15000
    });
    console.log('✅ Сторінка завантажена');

    // Пошук і заповнення input полів
    console.log('\n📝 Пошук форми входу...');
    const inputs = await page.$$('input');
    console.log(`✅ Знайдено ${inputs.length} input полів`);

    if (inputs.length >= 2) {
      await inputs[0].fill('admin@basket.lviv.ua');
      console.log('✅ Заповнено email');

      await inputs[1].fill('Admin123!@#');
      console.log('✅ Заповнено пароль');

      // Натисни на submit
      const submitBtn = await page.$('button[type="submit"]');
      if (submitBtn) {
        await submitBtn.click();
        console.log('✅ Натиснута кнопка входу');
      }

      // Чекай перенаправлення
      console.log('⏳ Чекаю перенаправлення...');
      await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => {
        console.log('⚠️ Перенаправлення не сталося');
      });

      const currentUrl = page.url();
      console.log(`📍 Поточний URL: ${currentUrl}`);

      // Скріншот
      await page.screenshot({ path: './screenshots/03_admin_dashboard.png' });
      console.log('✅ Скріншот: ./screenshots/03_admin_dashboard.png');

      console.log('\n🎮 Переходжу на /chat...');
      await page.goto('http://localhost:3006/chat', {
        waitUntil: 'domcontentloaded',
        timeout: 10000
      });
      console.log('✅ На сторінці /chat');

      await page.waitForTimeout(2000);
      await page.screenshot({ path: './screenshots/04_game_canvas_ready.png' });
      console.log('✅ Скріншот: ./screenshots/04_game_canvas_ready.png');

      console.log('\n' + '═'.repeat(80));
      console.log('✅ ГОТОВО ДО ТЕСТУВАННЯ ВИПРАВЛЕНЬ\n');

      await page.waitForTimeout(10000);
    } else {
      console.log('❌ Недостатньо input полів');
    }

  } catch (err) {
    console.error('\n❌ ПОМИЛКА:', err.message);
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
      console.log('🔌 Браузер закрит');
    }
  }
}

adminLogin().catch(err => {
  console.error('Помилка:', err);
  process.exit(1);
});
