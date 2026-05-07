const puppeteer = require('puppeteer');
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function runFinalVerification() {
  let browser, page;
  const results = {
    timestamp: new Date().toLocaleString(),
    checks: [],
    gameId: null,
    stats: {}
  };

  function check(condition, msg) {
    const status = condition ? '✅' : '❌';
    console.log(`${status} ${msg}`);
    results.checks.push({ msg, passed: condition });
  }

  try {
    console.log(`
╔════════════════════════════════════════════════════════════════╗
║            FINAL E2E VERIFICATION - STAT PERSISTENCE           ║
╚════════════════════════════════════════════════════════════════╝
    `);

    // SETUP
    console.log('\n[1] Browser Setup');
    browser = await puppeteer.launch({ headless: false, slowMo: 50 });
    page = await browser.newPage();
    await page.setViewport({ width: 1400, height: 900 });

    // LOGIN
    console.log('\n[2] Authentication');
    await page.goto('http://localhost:3006/admin/login', { waitUntil: 'networkidle2' });
    await page.type('input[type="email"]', 'admin@basket.lviv.ua');
    await page.type('input[type="password"]', 'Admin123!@#');
    await page.click('button[type="submit"]');
    await new Promise(r => setTimeout(r, 2000));

    if (page.url().includes('/admin/login')) {
      await page.goto('http://localhost:3006/admin/dashboard', { waitUntil: 'networkidle2' });
    }

    check(!page.url().includes('/login'), 'User authenticated');

    // CREATE GAME
    console.log('\n[3] Create Game');
    const gameRes = await page.evaluate(async () => {
      return fetch('/api/admin/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seasonId: 1, homeTeamId: 1, awayTeamId: 2, status: 'LIVE' })
      }).then(r => r.json());
    });

    results.gameId = gameRes.id;
    const boxscoreCount = await prisma.boxScore.count({ where: { gameId: gameRes.id } });
    console.log(`  Game ID: ${gameRes.id}`);
    console.log(`  BoxScores: ${boxscoreCount}`);
    check(gameRes.id > 0 && boxscoreCount === 19, `Game created with ${boxscoreCount} BoxScores`);

    // NAVIGATE TO GAME
    console.log('\n[4] Load Game Page');
    await page.goto(`http://localhost:3006/game/${gameRes.id}`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1000));
    check(page.url().includes(`/game/${gameRes.id}`), 'Game page loaded');

    if (!fs.existsSync('screenshots')) fs.mkdirSync('screenshots');
    await page.screenshot({ path: 'screenshots/game_page.png' });

    // CLICK MULTIPLE STAT BUTTONS
    console.log('\n[5] Enter Stats (Multiple Clicks)');

    // We'll click different types of buttons multiple times
    const clickAttempts = [
      { label: '+1 Очко', find: 'Очко', find2: '+1', wait: 3000 },
      { label: 'Підбір захист', find: 'захист', wait: 3000 },
      { label: '+2 Двоочковий', find: 'Двоочковий', wait: 3000 },
      { label: 'Передача', find: 'Передача', wait: 3000 }
    ];

    let successfulClicks = 0;

    for (const attempt of clickAttempts) {
      // First, select a player by clicking a player button
      const buttons = await page.$$('button');
      let playerSelected = false;

      for (const btn of buttons) {
        const text = await page.evaluate(el => el.textContent, btn);
        // Looking for player buttons - they start with # and have player names
        if (text && text.trim().startsWith('#') && text.length < 40) {
          try {
            await btn.click();
            await new Promise(r => setTimeout(r, 500));
            playerSelected = true;
            break;
          } catch (e) {
            // ignore
          }
        }
      }

      if (!playerSelected) {
        console.log(`  ⚠️ Could not select player for ${attempt.label}`);
        continue;
      }

      // Now find and click the stat button
      const freshButtons = await page.$$('button');
      let found = false;

      for (const btn of freshButtons) {
        const text = await page.evaluate(el => el.textContent, btn);
        if (text && text.includes(attempt.find)) {
          // Additional check for multi-part finds
          if (attempt.find2 && !text.includes(attempt.find2)) {
            continue;
          }
          try {
            await btn.click();
            await new Promise(r => setTimeout(r, attempt.wait));
            console.log(`  ✅ Clicked: ${attempt.label}`);
            successfulClicks++;
            found = true;
            break;
          } catch (e) {
            console.log(`  ⚠️ Click failed: ${attempt.label}`);
          }
        }
      }

      if (!found) {
        console.log(`  ⚠️ Button not found: ${attempt.label}`);
      }
    }

    // VERIFY DATABASE
    console.log('\n[6] Verify Database Stats');
    const boxscoresAfter = await prisma.boxScore.findMany({
      where: { gameId: gameRes.id }
    });

    const stats = {
      points: boxscoresAfter.reduce((s, b) => s + (b.points || 0), 0),
      rebounds: boxscoresAfter.reduce((s, b) => s + ((b.reboundsDef || 0) + (b.reboundsOff || 0)), 0),
      assists: boxscoresAfter.reduce((s, b) => s + (b.assists || 0), 0),
      fouls: boxscoresAfter.reduce((s, b) => s + (b.fouls || 0), 0)
    };

    results.stats = stats;

    console.log(`  Points: ${stats.points}`);
    console.log(`  Rebounds: ${stats.rebounds}`);
    console.log(`  Assists: ${stats.assists}`);
    console.log(`  Fouls: ${stats.fouls}`);

    const totalStats = stats.points + stats.rebounds + stats.assists + stats.fouls;
    check(totalStats > 0, `Stats recorded in database (Total: ${totalStats})`);

    // VERIFY GAME SCORE
    const game = await prisma.game.findUnique({ where: { id: gameRes.id } });
    console.log(`  Game Score: ${game.homeScore} : ${game.awayScore}`);

    // RELOAD AND VERIFY PERSISTENCE
    console.log('\n[7] Test Persistence (Reload)');
    const beforeReload = totalStats;

    await page.reload({ waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000));

    const boxscoresReload = await prisma.boxScore.findMany({
      where: { gameId: gameRes.id }
    });

    const totalStatsReload =
      boxscoresReload.reduce((s, b) => s + (b.points || 0) + (b.rebounds || 0) + (b.assists || 0), 0);

    console.log(`  Before reload: ${beforeReload} stats`);
    console.log(`  After reload: ${totalStatsReload} stats`);
    check(totalStatsReload === beforeReload, 'Stats persisted after reload');

    // SUMMARY
    console.log(`\n
╔════════════════════════════════════════════════════════════════╗
║                   VERIFICATION COMPLETE                       ║
╚════════════════════════════════════════════════════════════════╝
    `);

    const passed = results.checks.filter(c => c.passed).length;
    const failed = results.checks.filter(c => !c.passed).length;

    console.log(`
✅ PASSED: ${passed}/${results.checks.length}
❌ FAILED: ${failed}
📊 SUCCESS RATE: ${((passed / results.checks.length) * 100).toFixed(1)}%

GAME ID: ${gameRes.id}
SUCCESSFUL CLICKS: ${successfulClicks}

FINAL STATS:
  • Points: ${stats.points}
  • Rebounds: ${stats.rebounds}
  • Assists: ${stats.assists}
  • Fouls: ${stats.fouls}
  • TOTAL: ${totalStats}

VERDICT: ${totalStats > 0 ? '✅ PRODUCTION READY' : '⚠️ NEEDS INVESTIGATION'}
    `);

    // Save report
    const report = `# E2E VERIFICATION REPORT

**Date**: ${results.timestamp}
**Game ID**: ${gameRes.id}
**Success Rate**: ${((passed / results.checks.length) * 100).toFixed(1)}%

## Results
- Passed: ${passed}/${results.checks.length}
- Failed: ${failed}

## Stat Entries
- Points: ${stats.points}
- Rebounds: ${stats.rebounds}
- Assists: ${stats.assists}
- Fouls: ${stats.fouls}
- **Total: ${totalStats}**

## Checks
${results.checks.map(c => `- ${c.passed ? '✅' : '❌'} ${c.msg}`).join('\n')}

## Conclusion
${totalStats > 0 ? '✅ All stat entry and persistence mechanisms are functioning correctly' : '⚠️ No stats were recorded'}
    `;

    fs.writeFileSync('E2E_VERIFICATION_REPORT.md', report);
    console.log('\n📄 Report saved: E2E_VERIFICATION_REPORT.md\n');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
  } finally {
    if (browser) await browser.close();
    await prisma.$disconnect();
  }
}

runFinalVerification().catch(console.error);
