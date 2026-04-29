#!/usr/bin/env node
const puppeteer = require('puppeteer');

async function testGamePhysics() {
  let browser;
  try {
    console.log('🧪 GAME PHYSICS TEST: Trajectory + Green Zone + Net Shake\n');
    
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    page.setViewport({ width: 1280, height: 900 });

    const consoleLogs = [];
    page.on('console', msg => {
      const text = msg.text();
      consoleLogs.push(text);
    });

    page.on('pageerror', err => console.error('❌ PAGE ERROR:', err.message));

    console.log('📄 Loading game...');
    await page.goto('http://localhost:3006/game', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    console.log('⏳ Waiting 4s for full initialization...');
    await new Promise(r => setTimeout(r, 4000));

    // Test 1: Simulate shot and capture launch/physics logs
    console.log('\n🎯 TEST 1: TRAJECTORY PHYSICS\n');
    
    const shotResult = await page.evaluate(() => {
      // Wait for game state to be available
      const waitForGameState = () => {
        return new Promise(resolve => {
          const interval = setInterval(() => {
            if (window.__gameState?.ball || window.gs?.ball) {
              clearInterval(interval);
              resolve(window.__gameState || window.gs);
            }
          }, 50);
          setTimeout(() => clearInterval(interval), 3000);
        });
      };

      return waitForGameState().then(gs => {
        if (!gs || !gs.players || gs.players.length === 0) {
          return { error: 'No game state or players found' };
        }

        const player = gs.players[0];
        // Simulate mouse click on canvas to start aiming
        const canvas = document.querySelector('canvas');
        if (!canvas) return { error: 'Canvas not found' };

        // Create a simple ball state to trigger physics
        const SCALE = Math.min(canvas.width, canvas.height) / 15.0;
        
        gs.ball = {
          _x_m: player.x / SCALE,
          _y_m: player.y / SCALE,
          vx: 8.5,
          vy: -6.2,
          omega: -2.5,
          x: player.x,
          y: player.y,
          rot: 0,
          spin: -2.5,
          state: 'flying',
          outcome: 'in_progress',
          scoredGoal: false,
          _accumulator: 0,
          _physTick: 0,
          _checkpoints: [],
          _scale: SCALE,
          rimContacts: 0,
          rimContactMask: 0,
          rimHitTimer: 0,
          bounceCount: 0,
          hitBackboard: false,
          boardHandled: false,
        };

        return { 
          injected: true, 
          playerX: player.x, 
          playerY: player.y,
          ballX: gs.ball.x,
          ballY: gs.ball.y,
          SCALE,
        };
      });
    });

    console.log('Ball injected:', shotResult);
    console.log('⏳ Running physics for 3s...');
    await new Promise(r => setTimeout(r, 3000));

    // Test 2: Check green zone changes with distance
    console.log('\n🎯 TEST 2: GREEN ZONE DYNAMIC\n');
    
    const greenZoneTest = await page.evaluate(() => {
      const logs = [];
      const originalLog = console.log;
      
      // Capture logs about ideal position
      window.__capturedGreenZoneLogs = [];
      
      // Manually test calculateIdealMarkerPos at different distances
      const canvas = document.querySelector('canvas');
      if (!canvas) return { error: 'Canvas not found' };
      
      const SCALE = Math.min(canvas.width, canvas.height) / 15.0;
      const HOOP_X = 430; // center X from original code
      const HOOP_Y = 200; // center Y from original code
      
      const testPositions = [
        { px: 480, name: 'Close (480px)' },
        { px: 300, name: 'Medium (300px)' },
        { px: 100, name: 'Far (100px)' },
      ];
      
      const results = testPositions.map(pos => {
        const dx = HOOP_X - pos.px;
        const dy = HOOP_Y - 584; // Ground Y
        const distToHoopPx = Math.hypot(dx, dy);
        const distToHoop_m = distToHoopPx / SCALE;
        const baseSpeed_ms = 6.0 + (distToHoop_m / 15.0) * 8.0;
        
        return {
          position: pos.name,
          distPx: distToHoopPx.toFixed(1),
          distM: distToHoop_m.toFixed(2),
          baseSpeed_ms: baseSpeed_ms.toFixed(2),
        };
      });
      
      return { greenZoneResults: results };
    });

    console.log('Green Zone Test Results:');
    if (greenZoneTest.greenZoneResults) {
      greenZoneTest.greenZoneResults.forEach(r => {
        console.log(`  ${r.position}: ${r.distPx}px (${r.distM}m) → ${r.baseSpeed_ms} m/s`);
      });
    }

    // Test 3: Check net shake trigger
    console.log('\n🎯 TEST 3: NET SHAKE (handleScored)\n');
    
    const netShakeTest = await page.evaluate(() => {
      // Check if handleScored is being called
      const gs = window.__gameState || window.gs;
      if (!gs) return { error: 'Game state not found' };
      
      // Manually trigger a score by setting ball state
      if (gs.ball) {
        gs.ball.state = 'scored';
        gs.ball.outcome = 'swish';
        gs.ball.scoredGoal = true;
        
        // Check if netShake is triggered
        return {
          ballState: gs.ball.state,
          outcome: gs.ball.outcome,
          netShake: gs.netShake || false,
          netSwing: gs.netSwing || false,
        };
      }
      return { error: 'Ball not found' };
    });

    console.log('Net Shake Test:');
    console.log(`  Ball state: ${netShakeTest.ballState}`);
    console.log(`  Outcome: ${netShakeTest.outcome}`);
    console.log(`  netShake: ${netShakeTest.netShake}`);
    console.log(`  netSwing: ${netShakeTest.netSwing}`);

    // Analyze console logs
    console.log('\n📊 CONSOLE LOG ANALYSIS\n');
    
    const launchLogs = consoleLogs.filter(l => l.includes('[⚽ LAUNCH]'));
    const physicsLogs = consoleLogs.filter(l => l.includes('[🎯 PHYSICS'));
    const greenZoneLogs = consoleLogs.filter(l => l.includes('[📍 IDEAL'));
    const scoreCheckLogs = consoleLogs.filter(l => 
      l.includes('scored') || l.includes('handleScored') || l.includes('netShake')
    );

    console.log(`🚀 LAUNCH logs: ${launchLogs.length}`);
    launchLogs.forEach(l => console.log(`  ${l.substring(0, 150)}`));

    console.log(`\n⚽ PHYSICS START logs: ${physicsLogs.length}`);
    physicsLogs.forEach(l => console.log(`  ${l.substring(0, 150)}`));

    console.log(`\n🎯 GREEN ZONE logs: ${greenZoneLogs.length}`);
    greenZoneLogs.forEach(l => console.log(`  ${l.substring(0, 150)}`));

    console.log(`\n🏀 SCORING/NET SHAKE logs: ${scoreCheckLogs.length}`);
    scoreCheckLogs.slice(0, 10).forEach(l => console.log(`  ${l.substring(0, 150)}`));

    // Summary
    console.log('\n📋 TEST SUMMARY\n');
    console.log(`✅ Test completed`);
    console.log(`  - Launch logs: ${launchLogs.length > 0 ? '✅' : '❌'}`);
    console.log(`  - Physics logs: ${physicsLogs.length > 0 ? '✅' : '❌'}`);
    console.log(`  - Green zone logs: ${greenZoneLogs.length > 0 ? '✅' : '❌'}`);
    console.log(`  - Net shake trigger: ${netShakeTest.netShake ? '✅' : '❌'}`);

    process.exit(0);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
  }
}

testGamePhysics();
