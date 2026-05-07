const puppeteer = require('puppeteer');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function runAudit() {
  let browser, page;

  try {
    console.log('🚀 STARTING FIXED E2E AUDIT...\n');

    // LAUNCH BROWSER
    browser = await puppeteer.launch({ headless: false, slowMo: 100 });
    page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    console.log('✅ Browser launched\n');

    // LOGIN
    console.log('📍 PHASE 1: LOGIN');
    await page.goto('http://localhost:3006/admin/login', { waitUntil: 'networkidle2' });
    await page.type('input[type="email"]', 'admin@basket.lviv.ua');
    await page.type('input[type="password"]', 'Admin123!@#');
    await page.click('button[type="submit"]');
    await new Promise(r => setTimeout(r, 2000));

    const loginUrl = page.url();
    if (loginUrl.includes('/admin/login')) {
      console.log('  ℹ️ Manual redirect to dashboard...');
      await page.goto('http://localhost:3006/admin/dashboard', { waitUntil: 'networkidle2' });
    }
    console.log('✅ Logged in\n');

    // CREATE GAME
    console.log('📍 PHASE 2: CREATE GAME');
    const gameRes = await fetch('http://localhost:3006/api/admin/games', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seasonId: 1, homeTeamId: 1, awayTeamId: 2, status: 'LIVE' })
    });
    const { id: gameId } = await gameRes.json();
    console.log(`✅ Game created: ID ${gameId}\n`);

    // GET BOXSCORE BEFORE
    const boxBefore = await prisma.boxScore.findMany({ where: { gameId } });
    console.log(`📋 BoxScore records initialized: ${boxBefore.length}\n`);

    // NAVIGATE TO GAME
    console.log('📍 PHASE 3: NAVIGATE TO GAME');
    await page.goto(`http://localhost:3006/admin/games/${gameId}`, { waitUntil: 'networkidle2' });
    console.log('✅ On game page\n');

    // WAIT FOR PLAYER BUTTONS TO APPEAR
    console.log('📍 PHASE 4: FIND AND SELECT PLAYER');
    await page.waitForSelector('button', { timeout: 5000 });

    // Find first on-court player button (has green dot)
    const playerButtons = await page.$$('button');
    let playerBtn = null;

    for (const btn of playerButtons) {
      const text = await page.evaluate(el => el.textContent, btn);
      // Look for buttons with player numbers (like "#1", "#2", etc)
      if (text.match(/#\d+/) && text.includes('На паркеті')) {
        playerBtn = btn;
        break;
      }
    }

    // If not found by text, try to find any button with number
    if (!playerBtn) {
      for (const btn of playerButtons) {
        const text = await page.evaluate(el => el.textContent, btn);
        if (text.match(/#\d/)) {
          playerBtn = btn;
          break;
        }
      }
    }

    if (playerBtn) {
      const playerText = await page.evaluate(el => el.textContent, playerBtn);
      console.log(`📌 Clicking player: ${playerText}`);
      await playerBtn.click();
      await new Promise(r => setTimeout(r, 500));
      console.log('✅ Player selected\n');
    } else {
      console.log('⚠️ Could not find player button\n');
      await page.screenshot({ path: 'debug_no_players.png' });
    }

    // FIND AND CLICK SCORE BUTTON
    console.log('📍 PHASE 5: CLICK STAT BUTTON');
    const buttons = await page.$$('button');
    let scoreBtn = null;

    for (const btn of buttons) {
      const text = await page.evaluate(el => el.textContent, btn);
      // Look for "+1 Очко" button specifically
      if (text.includes('+1') && text.includes('Очко')) {
        scoreBtn = btn;
        console.log(`📌 Found score button: "${text}"`);
        break;
      }
    }

    if (scoreBtn) {
      // Monitor network for Server Action calls
      const requests = [];
      page.on('response', resp => {
        if (resp.url().includes('_rsc') || resp.url().includes('action')) {
          requests.push(`${resp.status()} ${resp.url().split('?')[0]}`);
        }
      });

      // Monitor console for errors
      const consoleLogs = [];
      page.on('console', msg => {
        if (msg.type() !== 'log') {
          consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
        }
      });

      await scoreBtn.click();
      console.log('✅ Clicked +1 Очко button');
      await new Promise(r => setTimeout(r, 3000));

      // Print any console errors
      if (consoleLogs.length > 0) {
        console.log('\nBrowser errors:');
        consoleLogs.forEach(log => console.log(`  ${log}`));
      }

      if (requests.length > 0) {
        console.log('\nServer requests:');
        requests.forEach(r => console.log(`  ${r}`));
      }
      console.log();
    } else {
      console.log('❌ Score button NOT found\n');
      const allBtnTexts = [];
      for (const btn of buttons.slice(0, 40)) {
        const text = await page.evaluate(el => el.textContent, btn);
        allBtnTexts.push(text);
      }
      console.log('Available buttons:', allBtnTexts);
      await page.screenshot({ path: 'debug_buttons.png' });
    }

    // VERIFY DATABASE
    console.log('📍 PHASE 6: VERIFY DATABASE');
    await new Promise(r => setTimeout(r, 1000));

    const boxAfter = await prisma.boxScore.findMany({
      where: { gameId },
      select: { playerId: true, points: true, rebounds: true }
    });

    const totalPoints = boxAfter.reduce((s, b) => s + (b.points || 0), 0);
    console.log(`📊 Total points in database: ${totalPoints}`);

    if (totalPoints > 0) {
      console.log('✅ Stats persisted to database!\n');
    } else {
      console.log('❌ Stats NOT persisted - button click did not work\n');
    }

    // CHECK IF GAME STATUS CHANGED
    const game = await prisma.game.findUnique({ where: { id: gameId } });
    console.log(`📊 Game status: ${game.status}`);
    console.log(`📊 Game score: ${game.homeScore} : ${game.awayScore}\n`);

    console.log('🏁 AUDIT COMPLETE');

  } catch (error) {
    console.error('❌ ERROR:', error.message);
  } finally {
    if (browser) await browser.close();
    await prisma.$disconnect();
  }
}

runAudit();
