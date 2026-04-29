#!/usr/bin/env node
const puppeteer = require('puppeteer');

async function testPhysics() {
  let browser;
  try {
    console.log('🎯 Launching browser for physics testing...\n');
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    // Capture console messages
    const consoleLogs = [];
    page.on('console', msg => {
      consoleLogs.push({
        type: msg.type(),
        text: msg.text(),
        location: msg.location()
      });
    });

    // Capture page errors
    const pageErrors = [];
    page.on('error', err => pageErrors.push(err));
    page.on('pageerror', err => pageErrors.push(err));

    console.log('📄 Loading http://localhost:3006/game...');
    await page.goto('http://localhost:3006/game', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    console.log('⏳ Waiting for canvas initialization (3s)...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Check for physics-related errors
    console.log('\n🔍 CHECKING FOR PHYSICS ERRORS:\n');

    const physicsErrors = consoleLogs.filter(log =>
      log.type === 'error' ||
      (log.type === 'log' && (
        log.text.includes('_x_m') ||
        log.text.includes('_y_m') ||
        log.text.includes('SCALE') ||
        log.text.includes('integratePhysics') ||
        log.text.includes('Physics') ||
        log.text.includes('undefined')
      ))
    );

    if (pageErrors.length > 0) {
      console.log('❌ Page Errors Found:');
      pageErrors.forEach(err => console.log(`  - ${err.message}`));
    } else {
      console.log('✅ No uncaught page errors');
    }

    if (physicsErrors.length > 0) {
      console.log('\n⚠️  Physics-related console messages:');
      physicsErrors.forEach(log => {
        console.log(`  [${log.type.toUpperCase()}] ${log.text.substring(0, 100)}`);
      });
    } else {
      console.log('✅ No physics-related errors in console');
    }

    // Test: Check if SCALE is defined
    console.log('\n🧪 PHYSICS INITIALIZATION TESTS:\n');

    const scaleTest = await page.evaluate(() => {
      // Check if we can access canvas and game state
      const canvas = document.querySelector('canvas');
      return {
        canvasExists: !!canvas,
        canvasWidth: canvas?.width || 0,
        canvasHeight: canvas?.height || 0,
      };
    });

    if (scaleTest.canvasExists) {
      console.log(`✅ Canvas found: ${scaleTest.canvasWidth}x${scaleTest.canvasHeight}`);
      if (scaleTest.canvasWidth > 0 && scaleTest.canvasHeight > 0) {
        const expectedScale = Math.min(scaleTest.canvasWidth, scaleTest.canvasHeight) / 15.0;
        console.log(`  → Expected SCALE: ${expectedScale.toFixed(2)} pixels per meter`);
      }
    } else {
      console.log('❌ Canvas not found - game may not have loaded');
    }

    // Check for game state in window
    const gameState = await page.evaluate(() => {
      return {
        hasGameState: typeof window.__gameState !== 'undefined',
        hasGS: typeof window.gs !== 'undefined',
        hasGameCanvas: typeof window.GameCanvas !== 'undefined',
      };
    });

    console.log(`\n✅ Game State Available:`);
    console.log(`  - window.__gameState: ${gameState.hasGameState ? '✅' : '❌'}`);
    console.log(`  - window.gs: ${gameState.hasGS ? '✅' : '❌'}`);
    console.log(`  - GameCanvas component: ${gameState.hasGameCanvas ? '✅' : '❌'}`);

    // Log important console messages (last 20)
    console.log('\n📋 LAST 20 CONSOLE MESSAGES:\n');
    consoleLogs.slice(-20).forEach((log, i) => {
      const icon = log.type === 'error' ? '❌' : log.type === 'warn' ? '⚠️' : '📝';
      console.log(`${icon} ${log.text.substring(0, 120)}`);
    });

    console.log('\n✅ Physics test complete!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    if (browser) await browser.close();
  }
}

testPhysics();
