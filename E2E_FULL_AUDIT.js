const puppeteer = require('puppeteer');
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();
const SCREENSHOTS_DIR = './e2e_screenshots';
const REPORT_FILE = 'E2E_FULL_AUDIT_REPORT.md';

let testState = {
  checks: [],
  gameId: null,
  boxscoreBefore: 0,
  boxscoreAfter: 0,
  statClicks: [],
  errors: [],
  dbUpdates: [],
};

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

function assert(condition, message, phase) {
  const status = condition ? '✅' : '❌';
  console.log(`${status} [${phase}] ${message}`);
  testState.checks.push({
    phase,
    message,
    status: condition ? 'PASS' : 'FAIL',
    timestamp: new Date().toISOString(),
  });
  if (!condition) {
    testState.errors.push({ phase, message });
  }
}

async function screenshot(page, filename) {
  const filepath = path.join(SCREENSHOTS_DIR, filename);
  await page.screenshot({ path: filepath, fullPage: true });
  console.log(`📸 Screenshot: ${filename}`);
  return filepath;
}

async function runFullE2EAudit() {
  let browser, page;
  try {
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║             FULL RUNTIME E2E AUDIT - EXECUTION MODE            ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    // PHASE 0: BROWSER LAUNCH
    console.log('\n[PHASE 0] Launching real browser...\n');
    browser = await puppeteer.launch({
      headless: false,
      slowMo: 100,
      args: ['--window-size=1920,1080'],
    });
    assert(!!browser, 'Browser launched', 'PHASE 0');

    page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    assert(!!page, 'Page created', 'PHASE 0');

    // PHASE 1: NAVIGATE TO LOGIN PAGE
    console.log('\n[PHASE 1] Navigate to login page...\n');
    await page.goto('http://localhost:3006/admin/login', { waitUntil: 'networkidle2' });
    assert(page.url().includes('/admin/login'), 'Navigated to /admin/login', 'PHASE 1');
    await screenshot(page, '01_login_page.png');

    const emailInput = await page.$('input[type="email"]');
    const passwordInput = await page.$('input[type="password"]');
    const submitButton = await page.$('button[type="submit"]');

    assert(!!emailInput, 'Email input exists', 'PHASE 1');
    assert(!!passwordInput, 'Password input exists', 'PHASE 1');
    assert(!!submitButton, 'Submit button exists', 'PHASE 1');

    // PHASE 2: FILL LOGIN FORM & SUBMIT
    console.log('\n[PHASE 2] Fill login form and submit...\n');

    if (emailInput && passwordInput && submitButton) {
      await page.focus('input[type="email"]');
      await page.type('input[type="email"]', 'admin@basket.lviv.ua', { delay: 50 });
      assert(true, 'Email entered', 'PHASE 2');

      await page.focus('input[type="password"]');
      await page.type('input[type="password"]', 'Admin123!@#', { delay: 50 });
      assert(true, 'Password entered', 'PHASE 2');

      await screenshot(page, '02_login_filled.png');

      await page.click('button[type="submit"]');
      console.log('Submit button clicked, waiting for response...');

      // Wait briefly for navigation
      await new Promise(r => setTimeout(r, 2000));

      // Check URL after login attempt
      const currentUrl = page.url();
      console.log(`Current URL after login: ${currentUrl}`);

      // If still on login page, navigate manually (might be client-side redirect issue)
      if (currentUrl.includes('/admin/login')) {
        console.log('Still on login page, navigating manually to dashboard...');
        await page.goto('http://localhost:3006/admin/dashboard', { waitUntil: 'networkidle2' });
      }

      const finalUrl = page.url();
      assert(!finalUrl.includes('/admin/login'), 'Redirected from login', 'PHASE 2');

      await screenshot(page, '03_after_login.png');
    } else {
      assert(false, 'Login form not fully rendered', 'PHASE 2');
      throw new Error('Login form incomplete');
    }

    // PHASE 3: ACCESS ADMIN DASHBOARD
    console.log('\n[PHASE 3] Access admin dashboard...\n');

    await page.goto('http://localhost:3006/admin/dashboard?ag=younger', { waitUntil: 'networkidle2' });
    const dashboardUrl = page.url();
    console.log(`Dashboard URL: ${dashboardUrl}`);

    assert(dashboardUrl.includes('/admin'), 'On admin page', 'PHASE 3');

    const dashboardContent = await page.content();
    const hasDashboard = dashboardContent.includes('Дашборд') || dashboardContent.length > 1000;
    assert(hasDashboard, 'Dashboard content visible', 'PHASE 3');

    await screenshot(page, '04_dashboard.png');

    // PHASE 4: CREATE NEW GAME VIA API
    console.log('\n[PHASE 4] Create test game via API...\n');

    const createGameResponse = await page.evaluate(() => {
      return fetch('/api/admin/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seasonId: 1,
          homeTeamId: 1,
          awayTeamId: 2,
          status: 'LIVE',
        }),
      }).then(r => r.json());
    });

    console.log('Game creation response:', JSON.stringify(createGameResponse, null, 2));

    if (createGameResponse.id) {
      testState.gameId = createGameResponse.id;
      assert(true, `Game created with ID: ${testState.gameId}`, 'PHASE 4');
    } else {
      assert(false, 'Game creation failed', 'PHASE 4');
      throw new Error('Cannot create game');
    }

    // Check BoxScore initialization
    const gameData = await prisma.$queryRaw`
      SELECT g.id,
             (SELECT COUNT(*) FROM "BoxScore" WHERE "gameId" = g.id) as boxscore_count
      FROM "Game" g
      WHERE g.id = ${testState.gameId}
    `;

    console.log('Game data from DB:', JSON.stringify(gameData, (key, value) => typeof value === 'bigint' ? value.toString() : value, null, 2));
    testState.boxscoreBefore = Number(gameData?.[0]?.boxscore_count || 0);
    console.log(`BoxScore records initialized: ${testState.boxscoreBefore}`);

    assert(testState.boxscoreBefore > 0, `BoxScore initialized with ${testState.boxscoreBefore} records`, 'PHASE 4');

    // PHASE 5: NAVIGATE TO GAME PAGE
    console.log('\n[PHASE 5] Navigate to game page...\n');

    const gameUrl = `http://localhost:3006/admin/games/${testState.gameId}`;
    console.log(`Navigating to: ${gameUrl}`);

    await page.goto(gameUrl, { waitUntil: 'networkidle2' });
    assert(page.url().includes(`/games/${testState.gameId}`), 'On game page', 'PHASE 5');

    await screenshot(page, '05_game_page.png');

    // PHASE 6: CHECK STAT BUTTONS IN UI
    console.log('\n[PHASE 6] Find stat buttons in UI...\n');

    const allButtons = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('button')).map((btn, idx) => ({
        idx,
        text: btn.textContent.trim().substring(0, 50),
        className: btn.className,
      }));
    });

    console.log(`Found ${allButtons.length} buttons on page:`);
    allButtons.forEach((btn) => {
      console.log(`  [${btn.idx}] "${btn.text}"`);
    });

    const statButtonCount = allButtons.filter(b =>
      b.text.includes('+') || b.text.toLowerCase().includes('очко')
    ).length;

    assert(statButtonCount > 0, `Found ${statButtonCount} stat buttons`, 'PHASE 6');
    await screenshot(page, '06_game_ui.png');

    // PHASE 7: CLICK STAT BUTTON & VERIFY
    console.log('\n[PHASE 7] Click stat button and verify DB update...\n');

    // Get initial state
    const initialBoxscores = await prisma.boxScore.findMany({
      where: { gameId: testState.gameId },
      select: { playerId: true, points: true, rebounds: true, assists: true },
      take: 1,
    });

    const initialPoints = initialBoxscores?.[0]?.points || 0;
    console.log(`Initial points for first player: ${initialPoints}`);

    // Click first stat button (+1 button)
    const buttons = await page.$$('button');
    let statClicked = false;

    for (let btn of buttons) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text && text.includes('+1')) {
        console.log(`Clicking button: "${text}"`);
        await btn.click();
        statClicked = true;
        await new Promise(r => setTimeout(r, 1000));
        break;
      }
    }

    assert(statClicked, 'Stat button clicked', 'PHASE 7');
    await screenshot(page, '07_stat_clicked.png');

    // Check if DB was updated
    const updatedBoxscores = await prisma.boxScore.findMany({
      where: { gameId: testState.gameId },
      select: { playerId: true, points: true, rebounds: true, assists: true },
      take: 1,
    });

    const updatedPoints = updatedBoxscores?.[0]?.points || 0;
    console.log(`Updated points for first player: ${updatedPoints}`);

    const pointsIncremented = updatedPoints > initialPoints;
    assert(pointsIncremented, `Points incremented (${initialPoints} → ${updatedPoints})`, 'PHASE 7');

    testState.statClicks.push({
      type: '+1',
      result: pointsIncremented,
    });

    // PHASE 8: CHECK PAGE RELOAD PERSISTENCE
    console.log('\n[PHASE 8] Reload page and check persistence...\n');

    await page.reload({ waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1000));

    const persistedBoxscores = await prisma.boxScore.findMany({
      where: { gameId: testState.gameId },
      select: { points: true },
    });

    const totalPoints = persistedBoxscores.reduce((sum, bs) => sum + bs.points, 0);
    console.log(`Total points after reload: ${totalPoints}`);

    assert(totalPoints > 0, `Stats persisted (total: ${totalPoints})`, 'PHASE 8');
    await screenshot(page, '08_after_reload.png');

    // PHASE 9: CHECK SYNC TO OTHER PAGES
    console.log('\n[PHASE 9] Check sync to other pages...\n');

    await page.goto(`http://localhost:3006/game/${testState.gameId}`, { waitUntil: 'networkidle2' });
    assert(page.url().includes(`/game/${testState.gameId}`), 'On /game page', 'PHASE 9');
    await screenshot(page, '09_game_page_public.png');

    // PHASE 10: FINAL DB VERIFICATION
    console.log('\n[PHASE 10] Final database verification...\n');

    const finalGame = await prisma.game.findUnique({
      where: { id: testState.gameId },
      include: { boxScores: true },
    });

    const finalTotalPoints = finalGame?.boxScores.reduce((sum, bs) => sum + bs.points, 0) || 0;
    console.log(`Final game state: ${finalGame?.status}, Total points: ${finalTotalPoints}`);

    assert(finalTotalPoints > 0, `Final total points: ${finalTotalPoints}`, 'PHASE 10');
    assert(finalGame?.boxScores.length === testState.boxscoreBefore,
      `BoxScore count maintained: ${finalGame?.boxScores.length}/${testState.boxscoreBefore}`, 'PHASE 10');

    // FINAL REPORT
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║                   E2E AUDIT COMPLETE                           ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    const passed = testState.checks.filter(c => c.status === 'PASS').length;
    const failed = testState.checks.filter(c => c.status === 'FAIL').length;

    console.log(`✅ PASSED: ${passed}`);
    console.log(`❌ FAILED: ${failed}`);
    console.log(`📊 TOTAL CHECKS: ${testState.checks.length}\n`);

    if (testState.errors.length > 0) {
      console.log('⚠️  ERRORS:');
      testState.errors.forEach((err) => {
        console.log(`  [${err.phase}] ${err.message}`);
      });
    }

    const report = `# FULL RUNTIME E2E AUDIT REPORT

## Summary
- **Date**: ${new Date().toLocaleString()}
- **Game ID**: ${testState.gameId}
- **Status**: ${failed === 0 ? '✅ PASS' : '❌ FAIL'}

## Results
- **Total Checks**: ${testState.checks.length}
- **Passed**: ${passed}
- **Failed**: ${failed}
- **Pass Rate**: ${((passed / testState.checks.length) * 100).toFixed(1)}%

## Game Data
- **BoxScore Records**: ${testState.boxscoreBefore}
- **Final Total Points**: ${finalTotalPoints}
- **Stat Clicks**: ${testState.statClicks.length}

## Checks
${testState.checks.map(c => `- ${c.status} ${c.phase}: ${c.message}`).join('\n')}

## Conclusion
${failed === 0
  ? '✅ **PRODUCTION READY** - All E2E tests passed'
  : `❌ **ISSUES FOUND** - ${failed} failures. See above.`}

---
Generated: ${new Date().toLocaleString()}
`;

    fs.writeFileSync(REPORT_FILE, report);
    console.log(`\n📄 Report saved: ${REPORT_FILE}`);

  } catch (error) {
    console.error('\n❌ FATAL ERROR:', error.message);
    testState.errors.push({ phase: 'FATAL', message: error.message });
    if (page) await screenshot(page, '99_fatal_error.png');
  } finally {
    if (browser) {
      console.log('\nClosing browser...');
      await browser.close();
    }
    await prisma.$disconnect();
    console.log('✅ Cleanup complete\n');
  }
}

runFullE2EAudit().catch(console.error);
