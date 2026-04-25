/**
 * Test /chat page directly with built-in user data
 */

const { chromium } = require('playwright');

async function testChatPage() {
  console.log('🎮 TEST /CHAT PAGE\n');
  console.log('═'.repeat(80));

  let browser, page;

  try {
    browser = await chromium.launch({ headless: false });
    page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

    console.log('📖 Завантажую http://localhost:3006/chat...');
    await page.goto('http://localhost:3006/chat', {
      waitUntil: 'networkidle',
      timeout: 15000
    });
    console.log('✅ Сторінка завантажена\n');

    // Wait for any dialogs to appear
    await page.waitForTimeout(3000);

    // Check if there's a modal/dialog
    const hasDialog = await page.evaluate(() => {
      return {
        dialogs: document.querySelectorAll('[role="dialog"]').length,
        modals: document.querySelectorAll('.modal').length,
        inputs: document.querySelectorAll('input').length,
        buttons: Array.from(document.querySelectorAll('button')).map(b => b.innerText)
      };
    });

    console.log('📋 ЕЛЕМЕНТИ НА СТОРІНЦІ:');
    console.log(`  Dialogs: ${hasDialog.dialogs}`);
    console.log(`  Modals: ${hasDialog.modals}`);
    console.log(`  Inputs: ${hasDialog.inputs}`);
    console.log(`  Buttons: ${hasDialog.buttons.join(', ')}\n`);

    // Check for canvas
    const canvasInfo = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      return {
        exists: !!canvas,
        width: canvas ? canvas.width : 0,
        height: canvas ? canvas.height : 0
      };
    });

    console.log('🎮 GAME CANVAS:');
    console.log(`  Exists: ${canvasInfo.exists}`);
    console.log(`  Size: ${canvasInfo.width}×${canvasInfo.height}\n`);

    // Take screenshot
    await page.screenshot({ path: './screenshots/11_chat_page_ready.png' });
    console.log('✅ Скріншот: ./screenshots/11_chat_page_ready.png\n');

    if (canvasInfo.exists) {
      console.log('✅ CANVAS ГОТОВИЙ — ГРАВЕЦЬ ЗАЛОГІНЕНИЙ');
      console.log('\n📸 Збираю скріншот для верифікації виправлень...');
      await page.waitForTimeout(2000);
      await page.screenshot({ path: './screenshots/12_game_with_fixes.png' });
      console.log('✅ Скріншот гри: ./screenshots/12_game_with_fixes.png');
    } else {
      console.log('⚠️ Canvas не знайдено — можливо потрібна реєстрація');
    }

    console.log('\n' + '═'.repeat(80));
    console.log('Браузер залишиться відкритим на 15 секунд для ручної перевірки...');
    await page.waitForTimeout(15000);

  } catch (err) {
    console.error('\n❌ ПОМИЛКА:', err.message);
  } finally {
    if (browser) {
      await browser.close();
      console.log('🔌 Браузер закрит');
    }
  }
}

testChatPage().catch(err => {
  console.error('Помилка:', err);
});
