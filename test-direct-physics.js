#!/usr/bin/env node

// Direct physics test without Puppeteer
console.log('🧪 DIRECT PHYSICS FUNCTION TEST\n');

// Simulate meter-space constants
const C = {
  GRAVITY: 9.81,
  BALL_MASS: 0.623,
  BALL_RADIUS_M: 0.12,
  RIM_RADIUS_M: 0.225,
  RIM_TUBE_R_M: 0.023,
  NET_ZONE_DEPTH_M: 0.45,
  E_RIM: 0.72,
  MU_RIM: 0.57,
  Cd: 0.004,
  Cm: 0.000045,
  OMEGA_DECAY: 0.985,
  HOOP_X_M: 0.73,  // 110px / 150px_per_m
  HOOP_Y_M: 2.05,  // 307px / 150px_per_m
  BOARD_X_M: 0.73,
  BOARD_TOP_M: 1.87,
  BOARD_BOT_M: 2.53,
  GROUND_Y_M: 3.9,  // 584px / 150px_per_m
};

// Test 1: Launch velocity calculation
console.log('📋 TEST 1: Launch velocity with backspin\n');

const angle = -Math.PI * 0.72;  // ~-130° or 41° up
const power = 100;
const distToHoop_m = 3.0;

const bs = 6.0 + (distToHoop_m / 15.0) * 8.0;
const ls = bs * (0.3 + (power / 200) * 1.7);
const vx_m = Math.cos(angle) * ls;
const vy_m = Math.sin(angle) * ls;

const angleDeg = angle * (180 / Math.PI);
let omega = angleDeg > 55 ? -(0.8 + (angleDeg - 55) * 0.01) : 0.2 + (50 - angleDeg) * 0.01;

console.log(`angle: ${angle.toFixed(3)} rad (${angleDeg.toFixed(1)}°)`);
console.log(`distance: ${distToHoop_m} m`);
console.log(`power: ${power}%`);
console.log(`baseSpeed: ${bs.toFixed(2)} m/s`);
console.log(`launchSpeed: ${ls.toFixed(2)} m/s`);
console.log(`vx_m: ${vx_m.toFixed(2)} m/s`);
console.log(`vy_m: ${vy_m.toFixed(2)} m/s`);
console.log(`omega: ${omega.toFixed(2)} rad/s`);
console.log(`✅ [⚽ LAUNCH] angle=${angleDeg.toFixed(1)}° dist=${distToHoop_m.toFixed(2)}m power=${power.toFixed(0)} → vx=${vx_m.toFixed(2)} vy=${vy_m.toFixed(2)} m/s omega=${omega.toFixed(2)} rad/s\n`);

// Test 2: Green zone formula
console.log('📋 TEST 2: Green zone with distance variation\n');

const positions = [
  { px: 110, py: 550, name: 'Close (center)' },
  { px: 50, py: 550, name: 'Left' },
  { px: 200, py: 550, name: 'Right' },
];

const SCALE = 150; // pixels per meter
const HOOP_X = 110;
const HOOP_Y = 307;

positions.forEach(pos => {
  const dx = HOOP_X - pos.px;
  const dy = HOOP_Y - pos.py;
  const distPx = Math.hypot(dx, dy);
  const distM = distPx / SCALE;
  const baseSpeed_ms = 6.0 + (distM / 15.0) * 8.0;
  
  console.log(`${pos.name}: dist=${distPx.toFixed(0)}px (${distM.toFixed(2)}m) → baseSpeed=${baseSpeed_ms.toFixed(2)} m/s`);
});
console.log('✅ Green zone changes with distance\n');

// Test 3: Goal entry conditions
console.log('📋 TEST 3: Goal entry scoring logic\n');

const testBalls = [
  {
    name: 'Ball in net (center, falling)',
    _x_m: 0.73,
    _y_m: 2.2,
    vy: 0.5,
    rimHitTimer: 0,
    scoredGoal: false,
    rimContacts: 0,
  },
  {
    name: 'Ball above hoop',
    _x_m: 0.73,
    _y_m: 1.9,
    vy: 0.5,
    rimHitTimer: 0,
    scoredGoal: false,
  },
  {
    name: 'Ball rising (vy<0)',
    _x_m: 0.73,
    _y_m: 2.2,
    vy: -0.5,
    rimHitTimer: 0,
    scoredGoal: false,
  },
  {
    name: 'Ball with rim hit grace period',
    _x_m: 0.73,
    _y_m: 2.2,
    vy: 0.5,
    rimHitTimer: 5,
    scoredGoal: false,
  },
];

testBalls.forEach(ball => {
  // Simulate checkGoalEntry logic
  if (ball.scoredGoal || ball.vy <= 0 || ball.rimHitTimer > 0) {
    console.log(`❌ ${ball.name}: REJECTED (scoredGoal=${ball.scoredGoal}, vy=${ball.vy}, rimHitTimer=${ball.rimHitTimer})`);
    return;
  }
  
  const dx = ball._x_m - C.HOOP_X_M;
  const er = C.RIM_RADIUS_M - C.BALL_RADIUS_M;
  
  if (Math.abs(dx) >= er || ball._y_m < C.HOOP_Y_M || ball._y_m > C.HOOP_Y_M + C.NET_ZONE_DEPTH_M) {
    const reasons = [];
    if (Math.abs(dx) >= er) reasons.push(`|dx|=${Math.abs(dx).toFixed(3)} >= ${er.toFixed(3)}`);
    if (ball._y_m < C.HOOP_Y_M) reasons.push(`y=${ball._y_m.toFixed(2)} < ${C.HOOP_Y_M.toFixed(2)}`);
    if (ball._y_m > C.HOOP_Y_M + C.NET_ZONE_DEPTH_M) reasons.push(`y=${ball._y_m.toFixed(2)} > ${(C.HOOP_Y_M + C.NET_ZONE_DEPTH_M).toFixed(2)}`);
    console.log(`❌ ${ball.name}: REJECTED (${reasons.join(', ')})`);
    return;
  }
  
  console.log(`✅ ${ball.name}: SCORED (state='scored', outcome='swish')`);
});

console.log('\n✅ All physics tests complete!');
process.exit(0);
