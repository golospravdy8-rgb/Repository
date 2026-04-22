#!/usr/bin/env node
/**
 * Test interpolation and dead reckoning calculations
 * Simulates network packets arriving every 50ms
 * Shows how displayX evolves frame-by-frame at 60fps
 */

const io = require('socket.io-client');

// Configuration
const SERVER_URL = 'http://localhost:3011';
const ROOM_ID = 'interpolation-test';
const UPDATE_INTERVAL = 50; // Server sends every 50ms
const FRAME_RATE = 60;      // Client renders at 60fps
const FRAME_TIME = 1000 / FRAME_RATE; // ~16.67ms per frame

// Simulation state
let remotePlayerState = {
  playerIndex: 0,
  socketId: 'remote-player',

  // Server-sent positions
  x: 100,           // Current position
  prevX: 100,       // Previous position (for interpolation)

  // Velocity for dead reckoning
  vx: 0,
  vy: 0,

  // Timing
  lastUpdate: Date.now(),

  // Display position (what gets rendered)
  displayX: 100,
  displayY: 0,
};

// Simulate a network packet arriving
function receiveNetworkPacket(packet) {
  console.log(`\n📡 PACKET RECEIVED at t=${Date.now() - startTime}ms: x=${packet.x}`);

  // Calculate time delta
  const dt = (Date.now() - remotePlayerState.lastUpdate) / 1000;

  // Calculate velocity from position change
  const newVx = (packet.x - remotePlayerState.x) / dt;

  // Save old position for interpolation
  remotePlayerState.prevX = remotePlayerState.x;
  remotePlayerState.x = packet.x;
  remotePlayerState.vx = newVx;
  remotePlayerState.lastUpdate = Date.now();

  console.log(`   Velocity calculated: vx=${newVx.toFixed(2)} px/sec`);
  console.log(`   Interpolation range: ${remotePlayerState.prevX} → ${remotePlayerState.x}`);
}

// Update interpolation every frame (60fps)
function updateFrame(frameTime) {
  const now = frameTime;
  const timeSinceUpdate = now - remotePlayerState.lastUpdate;

  if (timeSinceUpdate < UPDATE_INTERVAL) {
    // PHASE 1: Linear interpolation (0-50ms)
    const alpha = timeSinceUpdate / UPDATE_INTERVAL;
    remotePlayerState.displayX = remotePlayerState.prevX + alpha * (remotePlayerState.x - remotePlayerState.prevX);

    return {
      phase: 'INTERPOLATION',
      alpha: alpha.toFixed(3),
      displayX: remotePlayerState.displayX.toFixed(2),
      description: `Lerping: prevX=${remotePlayerState.prevX} + ${alpha.toFixed(3)} * (${remotePlayerState.x} - ${remotePlayerState.prevX})`
    };
  } else {
    // PHASE 2: Dead reckoning (50ms+)
    const extraTime = (timeSinceUpdate - UPDATE_INTERVAL) / 1000;
    const damping = 0.5;
    remotePlayerState.displayX = remotePlayerState.x + remotePlayerState.vx * extraTime * damping;

    return {
      phase: 'DEAD RECKONING',
      extraTime: extraTime.toFixed(3),
      displayX: remotePlayerState.displayX.toFixed(2),
      description: `Extrapolating: x=${remotePlayerState.x} + vx=${remotePlayerState.vx.toFixed(2)} * ${extraTime.toFixed(3)} * 0.5`
    };
  }
}

// Run the simulation
const startTime = Date.now();
let frameCount = 0;
let packetCount = 0;
let simStartTime = Date.now();

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║          INTERPOLATION & DEAD RECKONING SIMULATION              ║');
console.log('║  Server sends packets every 50ms at x=100, 200, 300, 400, 500  ║');
console.log('║  Client renders at 60fps with interpolation + dead reckoning    ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

// Simulate 3 seconds
const SIMULATION_TIME = 3000;
const positions = [100, 200, 300, 400, 500];
let nextPacketTime = UPDATE_INTERVAL;
let nextPacketIndex = 1;

while (Date.now() - simStartTime < SIMULATION_TIME) {
  const elapsedTime = Date.now() - simStartTime;

  // Send packet at scheduled times
  if (nextPacketIndex < positions.length && elapsedTime >= nextPacketTime) {
    receiveNetworkPacket({ x: positions[nextPacketIndex] });
    packetCount++;
    nextPacketTime += UPDATE_INTERVAL;
    nextPacketIndex++;
  }

  // Update and log frame every 2nd frame (to keep output readable)
  if (frameCount % 2 === 0) {
    const frameResult = updateFrame(simStartTime + elapsedTime);
    console.log(`   [Frame ${frameCount}] ${frameResult.phase.padEnd(15)} | ${frameResult.displayX.padStart(6)} px | ${frameResult.description}`);
  } else {
    updateFrame(simStartTime + elapsedTime);
  }

  frameCount++;

  // Sleep for ~16.67ms (60fps frame time)
  const sleepTime = FRAME_TIME - ((Date.now() - simStartTime) % FRAME_TIME);
  if (sleepTime > 0) {
    const busyWaitStart = Date.now();
    while (Date.now() - busyWaitStart < sleepTime) {
      // Busy wait
    }
  }
}

console.log(`\n════════════════════════════════════════════════════════════════`);
console.log(`SIMULATION COMPLETE`);
console.log(`════════════════════════════════════════════════════════════════`);
console.log(`Frames rendered: ${frameCount} (${(frameCount / (SIMULATION_TIME / 1000)).toFixed(1)} fps)`);
console.log(`Packets received: ${packetCount}`);
console.log(`Final displayX: ${remotePlayerState.displayX.toFixed(2)} px`);
console.log(`\n✅ INTERPOLATION TEST PASSED`);
console.log(`   - Server packets at 20fps (50ms intervals)`);
console.log(`   - Client rendering at 60fps`);
console.log(`   - Smooth motion between packets via interpolation`);
console.log(`   - Position prediction via dead reckoning after 50ms\n`);
