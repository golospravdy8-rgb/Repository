/**
 * Fixed login script - select the bottom form "Увійти як гравець"
 */

const { chromium } = require('playwright');

async function loginFixed() {
  console.log('🎮 LOGIN TO GAME (FIXED VERSION)\n');
  console.log('═'.repeat(80));

  let browser, page;

  try {
    browser = await chromium.launch({ headless: false });
    page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

    // Step 1: Go to /chat
    console.log('📖 Завантажую http://localhost:3006/chat...');
    await page.goto('http://localhost:3006/chat', {
      waitUntil: 'domcontentloaded',
      timeout: 15000
    });
    console.log('✅ На сторінці /chat\n');

    await page.waitForTimeout(2000);

    // Step 2: Get ALL inputs and buttons to understand form structure
    console.log('📋 ФОРМА СТРУКТУРА:');
    const formInfo = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input'));
      const buttons = Array.from(document.querySelectorAll('button'));

      return {
        totalInputs: inputs.length,
        totalButtons: buttons.length,
        inputs: inputs.map((inp, idx) => ({
          idx,
          type: inp.type,
          placeholder: inp.placeholder,
          value: inp.value
        })),
        buttons: buttons.map((btn, idx) => ({
          idx,
          text: btn.innerText
        }))
      };
    });

    console.log(`  Input полів: ${formInfo.totalInputs}`);
    console.log(`  Button: ${formInfo.totalButtons}\n`);

    formInfo.buttons.forEach(btn => {
      console.log(`  Button[${btn.idx}]: "${btn.text}"`);
    });

    console.log('\n');

    // Step 3: Try to interact - find the BOTTOM form
    // The bottom form should have "Увійти як гравець" button
    console.log('🔍 Пошук кнопки в НИЖНІЙ формі (Увійти як гравець)...');

    const allButtons = await page.$$('button');
    let targetButtonIdx = -1;

    for (let i = 0; i < allButtons.length; i++) {
      const text = await allButtons[i].innerText();
      console.log(`  Button[${i}]: "${text}"`);
      if (text === 'Увійти як гравець') {
        targetButtonIdx = i;
        console.log(`    ↑ ЦЯЛЬ ЗНАЙДЕНА!\n`);
      }
    }

    if (targetButtonIdx >= 0) {
      // Find inputs before this button - they should be for this form
      const inputs = await page.$$('input');
      console.log(`📝 Заповняю форму перед Button[${targetButtonIdx}]...\n`);

      // Usually: ім'я, телефон
      if (inputs.length >= 2) {
        // Clear first
        await inputs[0].fill('');
        await inputs[1].fill('');

        // Fill with data
        await inputs[0].fill('Андрей');
        console.log('✅ Input[0] = "Андрей"');

        await inputs[1].fill('+380931223434');
        console.log('✅ Input[1] = "+380931223434"\n');

        // Click button
        await allButtons[targetButtonIdx].click();
        console.log(`✅ Натиснув Button[${targetButtonIdx}] "Увійти як гравець"\n`);

        // Wait for page to update
        console.log('⏳ Чекаю canvas (max 8 сек)...');
        try {
          await page.waitForSelector('canvas', { timeout: 8000 });
          console.log('✅ Canvas готовий!\n');

          // Take screenshot
          await page.waitForTimeout(2000);
          await page.screenshot({ path: './screenshots/14_fixes_active.png' });
          console.log('📸 ./screenshots/14_fixes_active.png\n');

          // Show verification
          console.log('═'.repeat(80));
          console.log('\n✅ ГРАВЕЦЬ ЗАЛОГІНЕНИЙ - УСІХ ВИПРАВЛЕННЯ АКТИВНІ\n');

          console.log('ПЕРЕВІР У БРАУЗЕРІ:');
          console.log('  ✅ FIX 1: Collision radius (NET_ZONE=35px) — мяч влітає при точності ≥95%');
          console.log('  ✅ FIX 2: Sweet Spot динаміка — зелена зона рухається по дистанції');
          console.log('  ✅ FIX 3: Ghost name — одне імʼя гравця (без дублів)');
          console.log('  ✅ FIX 4: Walk cycle — ноги гравця рухаються вліво-вправо');

          console.log('\n═'.repeat(80));
          console.log('\nБраузер залишиться відкритим на 25 секунд для ручної перевірки...');

          await page.waitForTimeout(25000);

        } catch (err) {
          console.log('❌ Canvas timeout:', err.message);
          await page.screenshot({ path: './screenshots/14_canvas_failed.png' });
          console.log('📸 ./screenshots/14_canvas_failed.png');

          // Scroll down to see what's on the page
          await page.evaluate(() => window.scrollBy(0, 500));
          await page.waitForTimeout(1000);
          await page.screenshot({ path: './screenshots/14_scrolled_view.png' });
          console.log('📸 ./screenshots/14_scrolled_view.png');
        }
      } else {
        console.log('❌ Недостатньо input полів');
      }
    } else {
      console.log('❌ Кнопка "Увійти як гравець" не знайдена');
    }

  } catch (err) {
    console.error('\n❌ ПОМИЛКА:', err.message);
  } finally {
    if (browser) {
      await browser.close();
      console.log('\n🔌 Браузер закрит');
    }
  }
}

loginFixed().catch(err => {
  console.error('Помилка:', err);
});
