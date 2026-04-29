#!/usr/bin/env node
const puppeteer = require('puppeteer');

async function testPhysics() {
  let browser;
  try {
    console.log('🧪 SIMPLE PHYSICS TEST\n');
    
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    page.setViewport({ width: 1280, height: 900 });

    const consoleLogs = [];
    page.on('console', msg => {
      consoleLogs.push(msg.text());
    });

    console.log('📄 Loading game...');
    await page.goto('http://localhost:3006/game', { waitUntil: 'networkidle2', timeout: 30000 }).catch(e => {});

    console.log('⏳ Waiting 5s for game...');
    await new Promise(r => setTimeout(r, 5000));

    // Simple log analysis
    console.log('\n📊 LOG ANALYSIS:\n');
    
    const launchLogs = consoleLogs.filter(l => l.includes('[⚽ LAUNCH]'));
    const physicsLogs = consoleLogs.filter(l => l.includes('[🎯 PHYSICS'));
    const greenZoneLogs = consoleLogs.filter(l => l.includes('[📍 IDEAL'));
    const wsLogs = consoleLogs.filter(l => l.includes('WS ') || l.includes('CLOSED') || l.includes('ERROR'));

    console.log('🚀 LAUNCH LOGS:');
    if (launchLogs.length > 0) {
      launchLogs.forEach(l => console.log(`  ✅ ${l.substring(0, 140)}`));
    } else {
      console.log('  ❌ No launch logs (need to click to shoot)');
    }

    console.log('\n⚽ PHYSICS START LOGS:');
    if (physicsLogs.length > 0) {
      physicsLogs.forEach(l => console.log(`  ✅ ${l.substring(0, 140)}`));
    } else {
      console.log('  ❌ No physics logs');
    }

    console.log('\n🎯 GREEN ZONE LOGS:');
    if (greenZoneLogs.length > 0) {
      greenZoneLogs.forEach(l => console.log(`  ✅ ${l.substring(0, 140)}`));
    } else {
      console.log('  ❌ No green zone logs (would show on aiming)');
    }

    console.log('\n🔌 WebSocket LOGS:');
    if (wsLogs.length > 0) {
      wsLogs.forEach(l => console.log(`  ${l.substring(0, 140)}`));
    } else {
      console.log('  ✅ No WebSocket errors');
    }

    console.log('\n📋 TOTAL LOGS:', consoleLogs.length);
    console.log('Test completed!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Test error:', error.message);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
  }
}

testPhysics();
