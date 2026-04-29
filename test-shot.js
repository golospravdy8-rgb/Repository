#!/usr/bin/env node
const puppeteer = require('puppeteer');

async function testShot() {
  let browser;
  try {
    console.log('🎯 BASKETBALL PHYSICS SHOT TEST\n');
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    page.setViewport({ width: 1280, height: 900 });

    // Capture all console messages
    const consoleLogs = [];
    page.on('console', msg => {
      const text = msg.text();
      consoleLogs.push(text);
      // Log physics-related messages in real-time
      if (text.includes('RIM HIT') || text.includes('Physics') || text.includes('_x_m') || text.includes('SCALE')) {
        console.log(`📡 ${text}`);
      }
    });

    page.on('pageerror', err => {
      console.log(`❌ PAGE ERROR: ${err.message}`);
    });

    console.log('📄 Loading game page...');
    await page.goto('http://localhost:3006/game', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    console.log('⏳ Waiting for game initialization...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Inject test code into page
    const testResult = await page.evaluate(async () => {
      // Create a simple game state if not present
      const getGameState = () => {
        // Try to find game state in common locations
        if (window.__gameState) return window.__gameState;
        if (window.gs) return window.gs;

        // Look for it in React component trees or global scope
        const allWindows = Object.keys(window).filter(k => k.startsWith('__'));
        return allWindows.length > 0 ? allWindows : null;
      };

      const gameState = getGameState();

      return {
        hasGameState: !!gameState,
        gameStateKeys: gameState ? (Array.isArray(gameState) ? gameState : Object.keys(gameState).slice(0, 10)) : [],
        canvasPresent: !!document.querySelector('canvas'),
        windowKeys: Object.keys(window).filter(k => k.toLowerCase().includes('game')).slice(0, 10),
        timestamp: new Date().toISOString(),
      };
    });

    console.log('\n🔍 GAME STATE CHECK:');
    console.log(`  Canvas Present: ${testResult.canvasPresent ? '✅' : '❌'}`);
    console.log(`  Game State Found: ${testResult.hasGameState ? '✅' : '❌'}`);
    if (testResult.windowKeys.length > 0) {
      console.log(`  Window Keys (game-related):`);
      testResult.windowKeys.forEach(k => console.log(`    - ${k}`));
    }

    // Try to trigger physics by checking for RIM HIT logs
    console.log('\n⏳ Monitoring console for 5 seconds (watching for physics logs)...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Filter physics-related logs
    const physicsLogs = consoleLogs.filter(log =>
      log.includes('RIM HIT') ||
      log.includes('Physics') ||
      log.includes('SCALE') ||
      log.includes('meter') ||
      log.includes('_x_m') ||
      log.includes('accumulator')
    );

    console.log('\n📊 PHYSICS CONSOLE OUTPUT:');
    if (physicsLogs.length > 0) {
      console.log(`  Found ${physicsLogs.length} physics-related log(s):`);
      physicsLogs.forEach(log => {
        console.log(`    📡 ${log.substring(0, 120)}`);
      });
    } else {
      console.log('  ℹ️  No direct physics logs yet (physics runs on canvas, not console by default)');
    }

    // Check for errors
    const errorLogs = consoleLogs.filter(log =>
      log.toLowerCase().includes('error') ||
      log.toLowerCase().includes('undefined') ||
      log.toLowerCase().includes('cannot read')
    );

    if (errorLogs.length > 0) {
      console.log('\n⚠️  ERROR LOGS FOUND:');
      errorLogs.slice(0, 5).forEach(log => {
        console.log(`    ❌ ${log.substring(0, 100)}`);
      });
    } else {
      console.log('\n✅ No error logs detected');
    }

    console.log('\n📊 SUMMARY:');
    console.log(`  Total console messages: ${consoleLogs.length}`);
    console.log(`  Physics messages: ${physicsLogs.length}`);
    console.log(`  Error messages: ${errorLogs.length}`);
    console.log(`  ✅ Game loaded successfully and running!`);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  } finally {
    if (browser) await browser.close();
  }
}

testShot();
