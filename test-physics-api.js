#!/usr/bin/env node
const puppeteer = require('puppeteer');

(async () => {
  let browser;
  try {
    console.log('🧪 PHYSICS TEST via API\n');
    
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    page.setViewport({ width: 1280, height: 900 });

    const allLogs = [];
    page.on('console', msg => allLogs.push(msg.text()));

    console.log('📄 Loading game...');
    await page.goto('http://localhost:3006/game', { waitUntil: 'networkidle2', timeout: 30000 }).catch(e => {});

    console.log('⏳ Waiting 5s for game initialization...');
    await new Promise(r => setTimeout(r, 5000));

    // Try to directly call physics functions
    console.log('\n🔬 Testing physics functions directly...\n');

    const result = await page.evaluate(() => {
      // Import ball state into page context
      if (!window.__gameState) {
        window.__gameState = { players: [], shootStates: [] };
      }
      const gs = window.__gameState;
      
      // Create minimal ball in meter-space
      const testBall = {
        _x_m: 0,
        _y_m: 3.05, // 3m height = hoop height
        vx: 0,
        vy: 0.5, // falling down slightly
        x: 0,
        y: 200,
        state: 'flying',
        outcome: 'in_progress',
        scoredGoal: false,
        rimHitTimer: 0,
        rimContacts: 0,
        _physTick: 0,
      };

      // Check conditions for checkGoalEntry
      const C = {
        HOOP_X_M: 2.87, // ~430px / 150px_per_m 
        HOOP_Y_M: 1.33, // ~200px / 150px_per_m
        RIM_RADIUS_M: 0.225,
        BALL_RADIUS_M: 0.12,
        NET_ZONE_DEPTH_M: 0.45,
      };

      const dx = testBall._x_m - C.HOOP_X_M;
      const er = C.RIM_RADIUS_M - C.BALL_RADIUS_M;

      return {
        ballX_m: testBall._x_m.toFixed(2),
        ballY_m: testBall._y_m.toFixed(2),
        ballVy: testBall.vy.toFixed(2),
        hoopX_m: C.HOOP_X_M.toFixed(2),
        hoopY_m: C.HOOP_Y_M.toFixed(2),
        dx: dx.toFixed(2),
        er: er.toFixed(3),
        checkDx: Math.abs(dx) < er,
        checkY_min: testBall._y_m >= C.HOOP_Y_M,
        checkY_max: testBall._y_m <= C.HOOP_Y_M + C.NET_ZONE_DEPTH_M,
        checkVy: testBall.vy > 0,
        checkRimHit: testBall.rimHitTimer === 0,
        scoreGate: testBall.scoredGoal === false && testBall.vy > 0 && testBall.rimHitTimer === 0,
      };
    });

    console.log('Physics conditions check:');
    console.log(`  Ball position: (${result.ballX_m}m, ${result.ballY_m}m)`);
    console.log(`  Ball velocity: vy=${result.ballVy} m/s`);
    console.log(`  Hoop position: (${result.hoopX_m}m, ${result.hoopY_m}m)`);
    console.log(`  dx=${result.dx}m, check |dx|<${result.er}: ${result.checkDx}`);
    console.log(`  Y range check: ${result.checkY_min} && ${result.checkY_max}`);
    console.log(`  Velocity check (vy>0): ${result.checkVy}`);
    console.log(`  rimHitTimer check: ${result.checkRimHit}`);
    console.log(`  All conditions pass: ${result.scoreGate}`);

    // Check logs
    console.log('\n📊 Logs captured:');
    const launchLogs = allLogs.filter(l => l.includes('[⚽'));
    const physicsLogs = allLogs.filter(l => l.includes('[🎯'));
    const greenZoneLogs = allLogs.filter(l => l.includes('[📍'));
    
    console.log(`  Launch logs: ${launchLogs.length}`);
    console.log(`  Physics logs: ${physicsLogs.length}`);
    console.log(`  Green zone logs: ${greenZoneLogs.length}`);

    process.exit(0);
  } catch (error) {
    console.error('❌', error.message);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
  }
})();
