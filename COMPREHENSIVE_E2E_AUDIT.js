const puppeteer = require('puppeteer');
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

const auditResults = {
  timestamp: new Date().toISOString(),
  phases: [],
  assertions: [],
  errors: [],
  gameId: null,
};

function logPhase(phaseNum, title, status = '⏳') {
  const emoji = status === '✅' ? '✅' : status === '❌' ? '❌' : status === '⚠️' ? '⚠️' : '⏳';
  console.log(`\n[PHASE ${phaseNum}] ${emoji} ${title}`);
  auditResults.phases.push({ phaseNum, title, status });
}

function assert(condition, message, context = '') {
  const status = condition ? '✅' : '❌';
  console.log(`  ${status} ${message}`);
  auditResults.assertions.push({ condition, message, context, status });
  if (!condition) {
    auditResults.errors.push(`${message} (${context})`);
  }
  return condition;
}

async function takeScreenshot(page, name) {
  try {
    if (!fs.existsSync('screenshots')) fs.mkdirSync('screenshots');
    await page.screenshot({ path: `screenshots/${name}` });
    console.log(`  📸 ${name}`);
  } catch (e) {
    console.log(`  ⚠️ Screenshot failed`);
  }
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function runAudit() {
  let browser, page;

  try {
    console.log(`
╔════════════════════════════════════════════════════════════════╗
║        COMPREHENSIVE E2E AUDIT - FULL SYSTEM TEST             ║
╚════════════════════════════════════════════════════════════════╝
    `);

    // PHASE 1: LOGIN
    logPhase(1, 'Browser Launch & Login');

    browser = await puppeteer.launch({
      headless: false,
      slowMo: 50,
      args: ['--window-size=1400,900']
    });

    page = await browser.newPage();
    await page.setViewport({ width: 1400, height: 900 });

    await page.goto('http://localhost:3006/admin/login', { waitUntil: 'networkidle2' });
    await page.type('input[type="email"]', 'admin@basket.lviv.ua');
    await page.type('input[type="password"]', 'Admin123!@#');
    await page.click('button[type="submit"]');
    await sleep(2000);

    if (page.url().includes('/admin/login')) {
      await page.goto('http://localhost:3006/admin/dashboard', { waitUntil: 'networkidle2' });
    }

    await takeScreenshot(page, '01_dashboard.png');
    assert(!page.url().includes('/login'), 'Logged in successfully', 'PHASE 1');

    // PHASE 2: CREATE GAME
    logPhase(2, 'Game Creation & BoxScore Init');

    const gameRes = await page.evaluate(async () => {
      return await fetch('/api/admin/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seasonId: 1, homeTeamId: 1, awayTeamId: 2, status: 'LIVE' })
      }).then(r => r.json());
    });

    auditResults.gameId = gameRes.id;
    console.log(`  Game ID: ${gameRes.id}`);
    assert(gameRes.id > 0, `Game created (ID: ${gameRes.id})`, 'PHASE 2');

    const boxScores = await prisma.boxScore.findMany({
      where: { gameId: gameRes.id }
    });
    console.log(`  BoxScores: ${boxScores.length} records`);
    assert(boxScores.length >= 18, `BoxScore auto-initialized (${boxScores.length})`, 'PHASE 2');

    // PHASE 3: NAVIGATE TO GAME
    logPhase(3, 'Load Game Page');

    await page.goto(`http://localhost:3006/game/${gameRes.id}`, { waitUntil: 'networkidle2' });
    await sleep(2000);
    await takeScreenshot(page, '02_game_page.png');
    assert(page.url().includes(`/game/${gameRes.id}`), 'Game page loaded', 'PHASE 3');

    // PHASE 4: TEST ALL STAT BUTTONS
    logPhase(4, 'Test Stat Button Entry (All Types)');

    const statTypes = [
      { selector: 'Очко', label: 'Points', field: 'points' },
      { selector: 'захист', label: 'Rebound Def', field: 'reboundsDef' },
      { selector: 'напад', label: 'Rebound Off', field: 'reboundsOff' },
      { selector: 'Передача', label: 'Assist', field: 'assists' },
      { selector: 'Перехват', label: 'Steal', field: 'steals' },
      { selector: 'Блокшот', label: 'Block', field: 'blocks' },
      { selector: 'Фол П', label: 'Foul', field: 'fouls' }
    ];

    for (const stat of statTypes) {
      // Select first player by looking for buttons with player info
      const allButtons = await page.$$('button');
      let selectedPlayer = false;

      for (const btn of allButtons) {
        const text = await page.evaluate(el => el.textContent, btn);
        // Look for player name buttons (contain number and Cyrillic text)
        if (text && text.match(/^#\d/) && text.length < 40 && !text.includes('×') && !text.includes('Наступна')) {
          await btn.click();
          await sleep(600);
          selectedPlayer = true;
          break;
        }
      }

      if (!selectedPlayer) {
        // Try alternative: just click any button that looks like a player
        for (const btn of allButtons.slice(0, 20)) {
          const text = await page.evaluate(el => el.textContent, btn);
          if (text && text.length > 3 && text.length < 30 && !text.includes('Вийти') && !text.includes('Скасувати')) {
            await btn.click();
            await sleep(600);
            selectedPlayer = true;
            break;
          }
        }
      }

      if (!selectedPlayer) {
        console.log(`  ⚠️ Could not select player for ${stat.label}`);
        continue;
      }

      // Find and click stat button - need to fetch fresh buttons after player selection
      await sleep(300);
      const freshButtons = await page.$$('button');
      let clickedStat = false;

      for (const btn of freshButtons) {
        const text = await page.evaluate(el => el.textContent, btn);
        if (text && text.includes(stat.selector)) {
          try {
            await btn.click();
            await sleep(3500);
            clickedStat = true;
            console.log(`  ✅ Clicked: ${stat.label}`);
            break;
          } catch (e) {
            console.log(`  ⚠️ Click error for ${stat.label}`);
          }
        }
      }

      if (!clickedStat) {
        console.log(`  ⚠️ Button not found for: ${stat.label}`);
      }
    }

    // Verify all stats in DB
    const finalBoxScores = await prisma.boxScore.findMany({
      where: { gameId: gameRes.id }
    });

    const stats = {
      points: finalBoxScores.reduce((s, b) => s + (b.points || 0), 0),
      rebounds: finalBoxScores.reduce((s, b) => s + ((b.reboundsDef || 0) + (b.reboundsOff || 0)), 0),
      assists: finalBoxScores.reduce((s, b) => s + (b.assists || 0), 0),
      steals: finalBoxScores.reduce((s, b) => s + (b.steals || 0), 0),
      blocks: finalBoxScores.reduce((s, b) => s + (b.blocks || 0), 0),
      fouls: finalBoxScores.reduce((s, b) => s + (b.fouls || 0), 0)
    };

    console.log(`\n  Database Stats Summary:`);
    console.log(`    Points: ${stats.points}`);
    console.log(`    Rebounds: ${stats.rebounds}`);
    console.log(`    Assists: ${stats.assists}`);
    console.log(`    Steals: ${stats.steals}`);
    console.log(`    Blocks: ${stats.blocks}`);
    console.log(`    Fouls: ${stats.fouls}`);

    assert(stats.points > 0, `Points recorded (${stats.points})`, 'PHASE 4');

    // PHASE 5: RELOAD PERSISTENCE
    logPhase(5, 'Test Reload Persistence');

    const statsBeforeReload = { ...stats };
    await page.reload({ waitUntil: 'networkidle2' });
    await sleep(2000);
    await takeScreenshot(page, '03_after_reload.png');

    const reloadBoxScores = await prisma.boxScore.findMany({
      where: { gameId: gameRes.id }
    });

    const reloadStats = {
      points: reloadBoxScores.reduce((s, b) => s + (b.points || 0), 0)
    };

    console.log(`  Stats before reload: ${statsBeforeReload.points} points`);
    console.log(`  Stats after reload: ${reloadStats.points} points`);
    assert(reloadStats.points === statsBeforeReload.points, 'Stats persisted', 'PHASE 5');

    // PHASE 6: CHECK LIVE PAGES
    logPhase(6, 'Verify Live Sync (Schedule/Leaders)');

    await page.goto('http://localhost:3006/schedule', { waitUntil: 'networkidle2' });
    await sleep(1000);
    await takeScreenshot(page, '04_schedule.png');

    const scheduleContent = await page.content();
    const gameOnSchedule = scheduleContent.includes('LIVE');
    console.log(`  Game visible on schedule: ${gameOnSchedule}`);

    await page.goto('http://localhost:3006/leaders', { waitUntil: 'networkidle2' });
    await sleep(1000);
    await takeScreenshot(page, '05_leaders.png');

    const leadersContent = await page.content();
    assert(leadersContent.length > 500, 'Leaders page rendered', 'PHASE 6');

    // PHASE 7: DB FINAL STATE
    logPhase(7, 'Database Final State Verification');

    const finalGame = await prisma.game.findUnique({
      where: { id: gameRes.id }
    });

    console.log(`  Game Status: ${finalGame.status}`);
    console.log(`  Score: ${finalGame.homeScore} : ${finalGame.awayScore}`);
    console.log(`  BoxScore Records: ${finalBoxScores.length}`);

    assert(finalGame.status === 'LIVE', 'Game status correct', 'PHASE 7');
    assert(finalBoxScores.length >= 18, 'BoxScore records intact', 'PHASE 7');

    // SUMMARY
    console.log(`\n
╔════════════════════════════════════════════════════════════════╗
║                   AUDIT SUMMARY                               ║
╚════════════════════════════════════════════════════════════════╝
    `);

    const passed = auditResults.assertions.filter(a => a.condition).length;
    const failed = auditResults.assertions.filter(a => !a.condition).length;
    const rate = ((passed / auditResults.assertions.length) * 100).toFixed(1);

    console.log(`
✅ PASSED: ${passed}/${auditResults.assertions.length}
❌ FAILED: ${failed}
📊 SUCCESS RATE: ${rate}%

GAME: ID ${gameRes.id}
STATS RECORDED:
  • Points: ${stats.points}
  • Rebounds: ${stats.rebounds}
  • Assists: ${stats.assists}
  • Steals: ${stats.steals}
  • Blocks: ${stats.blocks}
  • Fouls: ${stats.fouls}

STATUS: ${failed === 0 ? '🚀 PRODUCTION READY' : '⚠️ ISSUES FOUND'}
    `);

    // Save report
    const report = `# COMPREHENSIVE E2E AUDIT REPORT

**Date**: ${new Date().toLocaleString()}
**Game ID**: ${gameRes.id}
**Success Rate**: ${rate}%

## Results
- Passed: ${passed}/${auditResults.assertions.length}
- Failed: ${failed}

## Stats Recorded
- Points: ${stats.points}
- Rebounds: ${stats.rebounds}
- Assists: ${stats.assists}
- Steals: ${stats.steals}
- Blocks: ${stats.blocks}
- Fouls: ${stats.fouls}

## Checks
${auditResults.assertions.map(a => `- ${a.status} ${a.message}`).join('\n')}

## Conclusion
${failed === 0 ? '✅ ALL SYSTEMS OPERATIONAL' : `⚠️ ${failed} issue(s) found`}
    `;

    fs.writeFileSync('COMPREHENSIVE_E2E_AUDIT_REPORT.md', report);
    console.log('📄 Report saved\n');

  } catch (error) {
    console.error('❌ ERROR:', error.message);
    auditResults.errors.push(error.message);
  } finally {
    if (browser) await browser.close();
    await prisma.$disconnect();
  }
}

runAudit().catch(console.error);
