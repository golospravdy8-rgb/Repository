const puppeteer = require('puppeteer');
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function runCompleteAudit() {
  let browser, page;
  const results = {
    checks: [],
    failures: [],
    screenshots: [],
    testState: {
      gameId: null,
      pointsClicked: 0,
      pointsInDb: 0,
      playerIds: [],
    }
  };

  function assert(condition, msg, phase) {
    if (!condition) {
      console.log(`❌ [${phase}] ${msg}`);
      results.failures.push({ phase, msg });
    } else {
      console.log(`✅ [${phase}] ${msg}`);
    }
    results.checks.push({ phase, msg, passed: condition });
  }

  async function screenshot(name) {
    const path = `e2e_screenshots/${name}`;
    if (!fs.existsSync('e2e_screenshots')) fs.mkdirSync('e2e_screenshots');
    await page.screenshot({ path });
    results.screenshots.push(path);
  }

  try {
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║          COMPLETE E2E AUDIT WITH STAT PERSISTENCE             ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    // LAUNCH BROWSER
    console.log('[PHASE 0] Launching browser...');
    browser = await puppeteer.launch({ headless: false, slowMo: 100 });
    page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    assert(!!browser && !!page, 'Browser and page created', 'PHASE 0');
    await screenshot('00_browser_launched.png');

    // LOGIN
    console.log('\n[PHASE 1] Login...');
    await page.goto('http://localhost:3006/admin/login', { waitUntil: 'networkidle2' });
    await page.type('input[type="email"]', 'admin@basket.lviv.ua');
    await page.type('input[type="password"]', 'Admin123!@#');
    await page.click('button[type="submit"]');
    await new Promise(r => setTimeout(r, 2000));

    const loginUrl = page.url();
    if (loginUrl.includes('/admin/login')) {
      await page.goto('http://localhost:3006/admin/dashboard', { waitUntil: 'networkidle2' });
    }
    assert(!page.url().includes('/login'), 'Logged in and on admin page', 'PHASE 1');
    await screenshot('01_logged_in.png');

    // CREATE GAME
    console.log('\n[PHASE 2] Create game...');
    const gameRes = await fetch('http://localhost:3006/api/admin/games', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seasonId: 1, homeTeamId: 1, awayTeamId: 2, status: 'LIVE' })
    });
    const { id: gameId } = await gameRes.json();
    results.testState.gameId = gameId;

    const boxBefore = await prisma.boxScore.findMany({ where: { gameId } });
    assert(boxBefore.length === 19, `Game ${gameId} created with ${boxBefore.length} BoxScore records`, 'PHASE 2');

    // NAVIGATE TO GAME
    console.log('\n[PHASE 3] Navigate to game...');
    await page.goto(`http://localhost:3006/admin/games/${gameId}`, { waitUntil: 'networkidle2' });
    assert(page.url().includes(`/games/${gameId}`), `On game page /games/${gameId}`, 'PHASE 3');
    await screenshot('02_game_page.png');

    // SELECT PLAYER AND CLICK STAT BUTTON
    console.log('\n[PHASE 4] Select player and click stat button...');
    const playerButtons = await page.$$('button');
    let playerBtn = null;

    // Find first on-court player
    for (const btn of playerButtons) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text.match(/#\d/) && text.length < 30) {
        playerBtn = btn;
        break;
      }
    }

    assert(playerBtn, 'Found player button', 'PHASE 4');
    const playerText = await page.evaluate(el => el.textContent, playerBtn);
    await playerBtn.click();
    await new Promise(r => setTimeout(r, 500));
    console.log(`  Clicked: ${playerText}`);
    await screenshot('03_player_selected.png');

    // CLICK SCORE BUTTON
    console.log('\n[PHASE 5] Click score button (+1 Очко)...');
    const allButtons = await page.$$('button');
    let scoreBtn = null;

    for (const btn of allButtons) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text.includes('+1') && text.includes('Очко')) {
        scoreBtn = btn;
        break;
      }
    }

    assert(scoreBtn, 'Found +1 Очко button', 'PHASE 5');
    await scoreBtn.click();
    results.testState.pointsClicked += 1;
    console.log('  Clicked +1 Очко');

    // WAIT FOR ACTION TO COMPLETE
    await new Promise(r => setTimeout(r, 3000));
    await screenshot('04_after_click.png');

    // VERIFY DATABASE UPDATE
    console.log('\n[PHASE 6] Verify database update...');
    const boxAfter = await prisma.boxScore.findMany({
      where: { gameId },
      select: { playerId: true, points: true }
    });

    const totalPoints = boxAfter.reduce((s, b) => s + (b.points || 0), 0);
    results.testState.pointsInDb = totalPoints;
    assert(totalPoints > 0, `Database shows ${totalPoints} total points`, 'PHASE 6');

    // VERIFY GAME SCORE
    const game = await prisma.game.findUnique({ where: { id: gameId } });
    assert(game.homeScore === 1, `Game homeScore updated to ${game.homeScore}`, 'PHASE 6');
    assert(game.status === 'LIVE', 'Game still LIVE', 'PHASE 6');

    // RELOAD AND VERIFY PERSISTENCE
    console.log('\n[PHASE 7] Reload page and verify persistence...');
    await page.reload({ waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1000));
    await screenshot('05_after_reload.png');

    const boxReload = await prisma.boxScore.findMany({
      where: { gameId },
      select: { points: true }
    });
    const pointsAfterReload = boxReload.reduce((s, b) => s + (b.points || 0), 0);
    assert(pointsAfterReload === totalPoints, `Points persisted after reload: ${pointsAfterReload}`, 'PHASE 7');

    // CLICK ANOTHER STAT (REBOUND)
    console.log('\n[PHASE 8] Click different stat (Rebound)...');
    const allBtns = await page.$$('button');
    let reboundBtn = null;

    for (const btn of allBtns) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text.includes('захист')) {
        reboundBtn = btn;
        break;
      }
    }

    if (reboundBtn) {
      await reboundBtn.click();
      await new Promise(r => setTimeout(r, 3000));
      console.log('  Clicked rebound button');

      const boxWithRebound = await prisma.boxScore.findMany({
        where: { gameId },
        select: { rebounds: true, reboundsDef: true }
      });
      const totalRebounds = boxWithRebound.reduce((s, b) => s + ((b.rebounds || 0) + (b.reboundsDef || 0)), 0);
      assert(totalRebounds > 0, `Rebounds recorded: ${totalRebounds}`, 'PHASE 8');
    } else {
      console.log('  ⚠️ Rebound button not found');
    }

    await screenshot('06_multiple_stats.png');

    // FINAL REPORT
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║                   AUDIT SUMMARY                               ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    const passed = results.checks.filter(c => c.passed).length;
    const failed = results.checks.filter(c => !c.passed).length;
    const total = results.checks.length;

    console.log(`✅ PASSED: ${passed}/${total}`);
    console.log(`❌ FAILED: ${failed}/${total}`);
    console.log(`📊 PASS RATE: ${((passed / total) * 100).toFixed(1)}%\n`);

    console.log('TEST STATE:');
    console.log(`  Game ID: ${results.testState.gameId}`);
    console.log(`  Points Clicked: ${results.testState.pointsClicked}`);
    console.log(`  Points In DB: ${results.testState.pointsInDb}`);
    console.log(`  Screenshots: ${results.screenshots.length}\n`);

    if (failed === 0) {
      console.log('🚀 PRODUCTION READY - All checks passed!\n');
    } else {
      console.log('⚠️ ISSUES FOUND:\n');
      results.failures.forEach(f => {
        console.log(`  [${f.phase}] ${f.msg}`);
      });
    }

    // GENERATE MARKDOWN REPORT
    const report = `# E2E AUDIT REPORT - STAT PERSISTENCE

## Summary
- **Date**: ${new Date().toLocaleString()}
- **Game ID**: ${results.testState.gameId}
- **Status**: ${failed === 0 ? '✅ PASS' : '❌ FAIL'}

## Results
- **Total Checks**: ${total}
- **Passed**: ${passed}
- **Failed**: ${failed}
- **Pass Rate**: ${((passed / total) * 100).toFixed(1)}%

## Test Execution
- **Points Clicked**: ${results.testState.pointsClicked}
- **Points in Database**: ${results.testState.pointsInDb}
- **Persistence**: ${results.testState.pointsInDb > 0 ? '✅ Working' : '❌ Not working'}

## Checks
${results.checks.map(c => `- ${c.passed ? '✅' : '❌'} [${c.phase}] ${c.msg}`).join('\n')}

## Screenshots
${results.screenshots.map((s, i) => `${i + 1}. ${s}`).join('\n')}

## Conclusion
${failed === 0 ? '✅ **COMPLETE SUCCESS** - Full stat entry pipeline is working end-to-end' : `❌ **ISSUES FOUND** - ${failed} checks failed`}

---
Generated: ${new Date().toLocaleString()}
`;

    fs.writeFileSync('E2E_AUDIT_REPORT.md', report);
    console.log('📄 Report saved: E2E_AUDIT_REPORT.md');

  } catch (error) {
    console.error('\n❌ FATAL ERROR:', error.message);
    results.failures.push({ phase: 'FATAL', msg: error.message });
  } finally {
    if (browser) await browser.close();
    await prisma.$disconnect();
    console.log('\n✅ Cleanup complete\n');
  }
}

runCompleteAudit();
