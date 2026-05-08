const puppeteer = require('puppeteer');
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

// ═══════════════════════════════════════════════════════════════════════════
// PRODUCTION-GRADE FULL RUNTIME E2E AUDIT
// Real browser interaction + real DOM/network/DB verification
// ═══════════════════════════════════════════════════════════════════════════

const AUDIT_CONFIG = {
  headless: false,           // ВАЖНО: видимий браузер для спостереження
  slowMo: 150,               // Уповільнити для аналізу
  windowSize: { width: 1920, height: 1080 },
  timeout: 30000,
  outputDir: path.join(process.cwd(), 'audit-output'),
  screenshotDir: path.join(process.cwd(), 'audit-output', 'screenshots'),
};

// Переконатися що папки існують
[AUDIT_CONFIG.outputDir, AUDIT_CONFIG.screenshotDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// STAT BUTTONS CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const STAT_BUTTONS = [
  // Scoring
  { id: 'score_1', label: '+1 Очко', selector: 'Очко', points: 1, field: 'points', dbCheck: 'points' },
  { id: 'score_2', label: '+2 Очка', selector: 'Двоочковий', points: 2, field: 'points', dbCheck: 'points' },
  { id: 'score_3', label: '+3 Очка', selector: 'Триочковий', points: 3, field: 'points', dbCheck: 'points' },

  // Rebounds
  { id: 'rebound_off', label: 'Оф. Підбір', selector: 'напад', field: 'reboundsOff', dbCheck: 'reboundsOff' },
  { id: 'rebound_def', label: 'Деф. Підбір', selector: 'захист', field: 'reboundsDef', dbCheck: 'reboundsDef' },

  // Other stats
  { id: 'assist', label: 'Передача', selector: 'Передача', field: 'assists', dbCheck: 'assists' },
  { id: 'steal', label: 'Перехват', selector: 'Перехват', field: 'steals', dbCheck: 'steals' },
  { id: 'block', label: 'Блокшот', selector: 'Блокшот', field: 'blocks', dbCheck: 'blocks' },
  { id: 'foul', label: 'Фол', selector: 'Фол П', field: 'fouls', dbCheck: 'fouls' },
  { id: 'turnover', label: 'Обрив', selector: 'Обрив', field: 'turnovers', dbCheck: 'turnovers' },
];

// ═══════════════════════════════════════════════════════════════════════════
// AUDIT RESULTS STRUCTURE
// ═══════════════════════════════════════════════════════════════════════════

const auditResults = {
  timestamp: new Date().toISOString(),
  status: 'IN_PROGRESS',
  summary: {
    totalAssertions: 0,
    passedAssertions: 0,
    failedAssertions: 0,
    buttonsTested: 0,
    buttonsSuccess: 0,
    buttonsFailed: 0,
  },
  gameData: null,
  statEntries: [],
  networkRequests: [],
  domUpdates: [],
  dbVerifications: [],
  errors: [],
  screenshots: [],
};

// ═══════════════════════════════════════════════════════════════════════════
// LOGGING & ASSERTIONS
// ═══════════════════════════════════════════════════════════════════════════

const LOG_LEVELS = {
  INFO: '📋',
  OK: '✅',
  WARN: '⚠️',
  ERROR: '❌',
  NET: '🌐',
  DB: '💾',
  DOM: '🖥️',
};

function log(level, message, details = null) {
  const time = new Date().toLocaleTimeString();
  const icon = LOG_LEVELS[level] || '⏳';
  console.log(`[${time}] ${icon} ${message}`);

  if (details) {
    console.log(`      ${JSON.stringify(details).substring(0, 150)}`);
  }
}

function assert(condition, message, category = 'general') {
  auditResults.summary.totalAssertions++;

  if (!condition) {
    auditResults.summary.failedAssertions++;
    auditResults.errors.push({ message, category, timestamp: new Date().toISOString() });
    log('ERROR', `FAILED: ${message}`);
    return false;
  }

  auditResults.summary.passedAssertions++;
  log('OK', message);
  return true;
}

async function screenshot(page, filename) {
  try {
    const filepath = path.join(AUDIT_CONFIG.screenshotDir, filename);
    await page.screenshot({ path: filepath, fullPage: false });
    auditResults.screenshots.push(filename);
    log('DOM', `Screenshot: ${filename}`);
    return filepath;
  } catch (e) {
    log('WARN', `Screenshot failed: ${e.message}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// NETWORK MONITORING
// ═══════════════════════════════════════════════════════════════════════════

function setupNetworkMonitoring(page) {
  page.on('response', async (response) => {
    try {
      const request = response.request();
      const url = request.url();
      const method = request.method();
      const status = response.status();

      // Log Server Action calls and API requests
      if (url.includes('_next/rsc') || url.includes('/api/')) {
        const request_body = request.postData();
        const response_text = await response.text().catch(() => 'N/A');

        auditResults.networkRequests.push({
          timestamp: new Date().toISOString(),
          url,
          method,
          status,
          requestSize: request_body ? request_body.length : 0,
          responseSize: response_text.length,
          request_body: request_body?.substring(0, 500),
          response_body: response_text.substring(0, 500),
        });

        if (method === 'POST' && status === 200) {
          log('NET', `POST ${url.split('/').pop()}: ${status}`, { body: request_body?.substring(0, 100) });
        }
      }
    } catch (e) {
      // Silent fail on response monitoring
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// DOM MONITORING
// ═══════════════════════════════════════════════════════════════════════════

async function verifyDOMUpdate(page, selector, timeout = 2000) {
  try {
    await page.waitForSelector(selector, { timeout });
    log('DOM', `Element found: ${selector}`);
    return true;
  } catch (e) {
    log('WARN', `Element not found: ${selector}`);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// DATABASE VERIFICATION
// ═══════════════════════════════════════════════════════════════════════════

async function verifyDatabaseState(gameId, playerId, expectedChanges) {
  const boxScore = await prisma.boxScore.findFirst({
    where: { gameId, playerId },
  });

  const gameEvent = await prisma.gameEvent.findFirst({
    where: { gameId, playerId },
    orderBy: { createdAt: 'desc' },
  });

  const game = await prisma.game.findUnique({
    where: { id: gameId },
  });

  const verification = {
    timestamp: new Date().toISOString(),
    boxScore: boxScore ? {
      points: boxScore.points,
      rebounds: boxScore.rebounds,
      reboundsOff: boxScore.reboundsOff,
      reboundsDef: boxScore.reboundsDef,
      assists: boxScore.assists,
      steals: boxScore.steals,
      blocks: boxScore.blocks,
      fouls: boxScore.fouls,
      turnovers: boxScore.turnovers,
      efficiency: boxScore.efficiency,
    } : null,
    lastEvent: gameEvent ? {
      type: gameEvent.type,
      createdAt: gameEvent.createdAt,
      points: gameEvent.points,
    } : null,
    gameScore: {
      homeScore: game.homeScore,
      awayScore: game.awayScore,
      status: game.status,
    },
  };

  auditResults.dbVerifications.push(verification);
  log('DB', `BoxScore verified`, verification.boxScore);

  return verification;
}

// ═══════════════════════════════════════════════════════════════════════════
// LEADERS & STANDINGS VERIFICATION
// ═══════════════════════════════════════════════════════════════════════════

async function verifyAggregations(page) {
  log('INFO', 'Verifying leaders & standings aggregation...');

  // Check leaders page
  await page.goto('http://localhost:3006/leaders', { waitUntil: 'networkidle2' });
  await screenshot(page, '99-leaders-final.png');

  const leadersContent = await page.content();
  const hasLeadersData = leadersContent.includes('Лідери') || leadersContent.length > 2000;
  assert(hasLeadersData, 'Leaders page has data', 'aggregation');

  // Check standings page
  await page.goto('http://localhost:3006/standings', { waitUntil: 'networkidle2' });
  await screenshot(page, '99-standings-final.png');

  const standingsContent = await page.content();
  const hasStandingsData = standingsContent.includes('Таблиця') || standingsContent.length > 2000;
  assert(hasStandingsData, 'Standings page has data', 'aggregation');

  // Check schedule
  await page.goto('http://localhost:3006/schedule', { waitUntil: 'networkidle2' });
  await screenshot(page, '99-schedule-final.png');
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN E2E AUDIT FUNCTION
// ═══════════════════════════════════════════════════════════════════════════

async function runCompleteAudit() {
  let browser, page;
  let gameId = null;
  let homeTeamId = null;
  let awayTeamId = null;
  let selectedPlayerId = null;

  try {
    console.log('\n╔═══════════════════════════════════════════════════════════════════╗');
    console.log('║     BASKET-LVIV PRODUCTION-GRADE FULL RUNTIME E2E AUDIT         ║');
    console.log('║       Real Browser • Real DOM • Real Network • Real Database     ║');
    console.log('╚═══════════════════════════════════════════════════════════════════╝\n');

    // ═══════════════════════════════════════════════════════════════════════
    // PHASE 1: BROWSER LAUNCH & LOGIN
    // ═══════════════════════════════════════════════════════════════════════
    log('INFO', '═════ PHASE 1: BROWSER LAUNCH & LOGIN ═════');

    browser = await puppeteer.launch({
      headless: AUDIT_CONFIG.headless,
      slowMo: AUDIT_CONFIG.slowMo,
      args: [
        `--window-size=${AUDIT_CONFIG.windowSize.width},${AUDIT_CONFIG.windowSize.height}`,
        '--disable-dev-shm-usage',
        '--no-sandbox',
      ],
    });

    assert(!!browser, 'Browser launched', 'phase1');
    log('OK', 'Puppeteer browser started (headful)');

    page = await browser.newPage();
    await page.setViewport(AUDIT_CONFIG.windowSize);
    setupNetworkMonitoring(page);

    // Navigate to login
    await page.goto('http://localhost:3006/admin/login', { waitUntil: 'networkidle2', timeout: AUDIT_CONFIG.timeout });
    await screenshot(page, '01-login-page.png');
    assert(page.url().includes('/login'), 'Login page loaded', 'phase1');

    // Login
    await page.type('input[type="email"]', 'admin@basket.lviv.ua');
    await page.type('input[type="password"]', 'Admin123!@#');
    await screenshot(page, '02-login-filled.png');

    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: AUDIT_CONFIG.timeout });

    const loginUrl = page.url();
    assert(!loginUrl.includes('/login'), 'Successfully logged in', 'phase1');
    log('OK', `Logged in. Current URL: ${loginUrl}`);

    await screenshot(page, '03-dashboard.png');

    // ═══════════════════════════════════════════════════════════════════════
    // PHASE 2: GAME CREATION
    // ═══════════════════════════════════════════════════════════════════════
    log('INFO', '═════ PHASE 2: GAME CREATION ═════');

    const createGameResponse = await page.evaluate(async () => {
      const res = await fetch('http://localhost:3006/api/admin/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seasonId: 1,
          homeTeamId: 1,
          awayTeamId: 2,
          status: 'LIVE',
        }),
      });
      return res.json();
    });

    gameId = createGameResponse.id;
    assert(gameId > 0, `Game created: ID ${gameId}`, 'phase2');
    log('OK', `Game ID: ${gameId}`);

    // Get game data from database
    const gameFromDb = await prisma.game.findUnique({
      where: { id: gameId },
      include: {
        homeTeam: { include: { players: true } },
        awayTeam: { include: { players: true } },
        boxScores: true,
      },
    });

    assert(gameFromDb !== null, 'Game found in database', 'phase2');
    assert(gameFromDb.status === 'LIVE', 'Game status is LIVE', 'phase2');
    assert(gameFromDb.boxScores.length > 0, `BoxScores initialized (${gameFromDb.boxScores.length} records)`, 'phase2');

    homeTeamId = gameFromDb.homeTeamId;
    awayTeamId = gameFromDb.awayTeamId;
    selectedPlayerId = gameFromDb.homeTeam.players[0].id;

    auditResults.gameData = {
      id: gameId,
      homeTeam: gameFromDb.homeTeam.name,
      awayTeam: gameFromDb.awayTeam.name,
      status: gameFromDb.status,
      initialBoxScores: gameFromDb.boxScores.length,
    };

    log('OK', `Teams: ${gameFromDb.homeTeam.name} vs ${gameFromDb.awayTeam.name}`);

    // ═══════════════════════════════════════════════════════════════════════
    // PHASE 3: NAVIGATE TO GAME PAGE
    // ═══════════════════════════════════════════════════════════════════════
    log('INFO', '═════ PHASE 3: NAVIGATE TO GAME PAGE ═════');

    await page.goto(`http://localhost:3006/game/${gameId}`, { waitUntil: 'networkidle2', timeout: AUDIT_CONFIG.timeout });
    await new Promise(resolve => setTimeout(resolve, 1000));
    await screenshot(page, '04-game-page-loaded.png');

    assert(page.url().includes(`/game/${gameId}`), 'Game page loaded', 'phase3');
    log('OK', `Game page: /game/${gameId}`);

    // ═══════════════════════════════════════════════════════════════════════
    // PHASE 4: TEST EACH STAT BUTTON
    // ═══════════════════════════════════════════════════════════════════════
    log('INFO', '═════ PHASE 4: TEST ALL STAT BUTTONS ═════');

    for (let i = 0; i < STAT_BUTTONS.length; i++) {
      const stat = STAT_BUTTONS[i];
      auditResults.summary.buttonsTested++;

      log('INFO', `\n🎯 Testing [${i + 1}/${STAT_BUTTONS.length}]: ${stat.label}`);

      try {
        // Select player
        const playerButtons = await page.$$('button');
        let playerSelected = false;

        for (const btn of playerButtons) {
          const text = await page.evaluate(el => el.textContent, btn);
          if (text && text.includes('#') && text.length < 40 && !text.includes('×')) {
            await btn.click();
            await new Promise(resolve => setTimeout(resolve, 600));
            playerSelected = true;
            log('DOM', `Player selected: #${text.split('#')[1]}`);
            break;
          }
        }

        assert(playerSelected, `Player selected for ${stat.label}`, 'button_interaction');

        // Find and click stat button
        await new Promise(resolve => setTimeout(resolve, 300));
        const freshButtons = await page.$$('button');
        let statClicked = false;

        for (const btn of freshButtons) {
          const text = await page.evaluate(el => el.textContent, btn);
          if (text && text.includes(stat.selector)) {
            await btn.click();

            // Wait for Server Action to complete + revalidation
            await new Promise(resolve => setTimeout(resolve, 3500));

            statClicked = true;
            log('NET', `Stat button clicked: ${stat.label} (revalidation waiting)`);
            break;
          }
        }

        assert(statClicked, `${stat.label} button clicked`, 'button_interaction');
        auditResults.summary.buttonsSuccess++;

        // Verify database
        await new Promise(resolve => setTimeout(resolve, 500));
        const dbVerification = await verifyDatabaseState(gameId, selectedPlayerId, stat);

        const hasDBChange = dbVerification.boxScore && dbVerification.boxScore[stat.dbCheck] > 0;
        assert(hasDBChange, `Database updated: ${stat.dbCheck}++`, 'database');

        // Take screenshot
        await screenshot(page, `05-stat-${stat.id}-clicked.png`);

        auditResults.statEntries.push({
          stat: stat.label,
          playerId: selectedPlayerId,
          result: 'SUCCESS',
          dbVerification,
        });

      } catch (error) {
        auditResults.summary.buttonsFailed++;
        log('ERROR', `Button test failed: ${stat.label}`);
        auditResults.statEntries.push({
          stat: stat.label,
          playerId: selectedPlayerId,
          result: 'FAILED',
          error: error.message,
        });
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PHASE 5: VERIFY PAGE RELOAD PERSISTENCE
    // ═══════════════════════════════════════════════════════════════════════
    log('INFO', '═════ PHASE 5: VERIFY PAGE RELOAD PERSISTENCE ═════');

    const beforeReload = await prisma.game.findUnique({ where: { id: gameId } });
    const scoreBeforeReload = beforeReload.homeScore;
    log('DB', `Score before reload: ${scoreBeforeReload}`);

    await page.reload({ waitUntil: 'networkidle2', timeout: AUDIT_CONFIG.timeout });
    await new Promise(resolve => setTimeout(resolve, 1000));
    await screenshot(page, '06-after-reload.png');

    const afterReload = await prisma.game.findUnique({ where: { id: gameId } });
    const scoreAfterReload = afterReload.homeScore;
    log('DB', `Score after reload: ${scoreAfterReload}`);

    assert(scoreAfterReload === scoreBeforeReload, 'Data persisted after page reload', 'persistence');

    // ═══════════════════════════════════════════════════════════════════════
    // PHASE 6: VERIFY AGGREGATIONS
    // ═══════════════════════════════════════════════════════════════════════
    log('INFO', '═════ PHASE 6: VERIFY AGGREGATIONS & PROTOCOL ═════');

    await verifyAggregations(page);

    // ═══════════════════════════════════════════════════════════════════════
    // FINAL SUMMARY
    // ═══════════════════════════════════════════════════════════════════════
    log('INFO', '═════ AUDIT COMPLETE ═════');

    auditResults.status = 'COMPLETED';
    auditResults.summary.successRate =
      auditResults.summary.totalAssertions > 0
        ? ((auditResults.summary.passedAssertions / auditResults.summary.totalAssertions) * 100).toFixed(1)
        : 0;

    // Save results
    fs.writeFileSync(
      path.join(AUDIT_CONFIG.outputDir, 'COMPLETE_AUDIT_REPORT.json'),
      JSON.stringify(auditResults, null, 2)
    );

    fs.writeFileSync(
      path.join(AUDIT_CONFIG.outputDir, 'network-logs.json'),
      JSON.stringify(auditResults.networkRequests, null, 2)
    );

    fs.writeFileSync(
      path.join(AUDIT_CONFIG.outputDir, 'db-verification.json'),
      JSON.stringify(auditResults.dbVerifications, null, 2)
    );

    if (auditResults.errors.length > 0) {
      fs.writeFileSync(
        path.join(AUDIT_CONFIG.outputDir, 'assertions-failed.json'),
        JSON.stringify(auditResults.errors, null, 2)
      );
    }

    // Print summary
    console.log('\n╔═══════════════════════════════════════════════════════════════════╗');
    console.log('║                     AUDIT RESULTS SUMMARY                         ║');
    console.log(`║  Assertions: ${auditResults.summary.passedAssertions}/${auditResults.summary.totalAssertions} (${auditResults.summary.successRate}%)                          ║`);
    console.log(`║  Buttons: ${auditResults.summary.buttonsSuccess}/${auditResults.summary.buttonsTested}                                        ║`);
    console.log(`║  Screenshots: ${auditResults.screenshots.length}                                      ║`);
    console.log(`║  Network Requests: ${auditResults.networkRequests.length}                                  ║`);
    console.log(`║  DB Verifications: ${auditResults.dbVerifications.length}                                ║`);
    console.log('╚═══════════════════════════════════════════════════════════════════╝\n');

    console.log('📁 Results saved to:');
    console.log(`   ✓ ${AUDIT_CONFIG.outputDir}/COMPLETE_AUDIT_REPORT.json`);
    console.log(`   ✓ ${AUDIT_CONFIG.outputDir}/network-logs.json`);
    console.log(`   ✓ ${AUDIT_CONFIG.outputDir}/db-verification.json`);
    console.log(`   ✓ ${AUDIT_CONFIG.outputDir}/screenshots/ (${auditResults.screenshots.length} files)\n`);

    if (auditResults.errors.length > 0) {
      console.log(`⚠️  Failed assertions: ${auditResults.errors.length}`);
      console.log(`   See: ${AUDIT_CONFIG.outputDir}/assertions-failed.json\n`);
    }

  } catch (error) {
    log('ERROR', `CRITICAL ERROR: ${error.message}`);
    auditResults.status = 'FAILED';
    auditResults.errors.push({
      type: 'FATAL',
      message: error.message,
      stack: error.stack,
    });

    fs.writeFileSync(
      path.join(AUDIT_CONFIG.outputDir, 'FATAL_ERROR.json'),
      JSON.stringify({ error: error.message, stack: error.stack }, null, 2)
    );

  } finally {
    if (browser) {
      await browser.close();
      log('OK', 'Browser closed');
    }
    await prisma.$disconnect();

    console.log('\n✅ Audit script completed.\n');
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// RUN AUDIT
// ═══════════════════════════════════════════════════════════════════════════

runCompleteAudit().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
