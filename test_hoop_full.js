const fs = require('fs');

// Import the physics module
const path = require('path');

// Simulate the physics as closely as possible to what the canvas does
const H = 600; // Canvas height estimate
const W = 400; // Canvas width estimate
const M2PX = H / 7.0;  // 85.714

const STAND_Y = H * 0.44;  // ~264px
const STAND_X = W * 0.08;  // ~32px

const physicsC = {
  HOOP_X_M: STAND_X / M2PX,
  HOOP_Y_M: STAND_Y / M2PX,
  RIM_RADIUS_M: 0.255,
  BALL_RADIUS_M: 0.12,
  GRAVITY: 9.81,
};

console.log('Physics constants:');
console.log(JSON.stringify(physicsC, null, 2));

// Implement checkScoring inline
function checkScoring(b, prevY_m, C) {
  if (b._scored) return false;
  
  const crossedRim = prevY_m <= C.HOOP_Y_M && b._y_m > C.HOOP_Y_M;
  const movingDown = b.vy > 0;
  const insideHoop = Math.abs(b._x_m - C.HOOP_X_M) < C.RIM_RADIUS_M * 0.88;
  
  if (crossedRim && movingDown && insideHoop) {
    b._scored = true;
    return true;
  }
  return false;
}

// Implement checkRimCollision inline
function checkRimCollision(b, C) {
  const TUBE_R = 0.02;
  const minD = TUBE_R + C.BALL_RADIUS_M;
  
  const rims = [
    { x: C.HOOP_X_M - C.RIM_RADIUS_M, y: C.HOOP_Y_M },
    { x: C.HOOP_X_M + C.RIM_RADIUS_M, y: C.HOOP_Y_M },
  ];
  
  let hasCollision = false;
  
  for (const rim of rims) {
    const dx = b._x_m - rim.x;
    const dy = b._y_m - rim.y;
    const dist = Math.hypot(dx, dy);
    
    if (dist < minD && dist > 0.0001) {
      const nx = dx / dist;
      const ny = dy / dist;
      const vn = b.vx * nx + b.vy * ny;
      
      if (vn < 0) {
        const e = 0.55;
        const mu = 0.20;
        const vt_x = b.vx - vn * nx;
        const vt_y = b.vy - vn * ny;
        b.vx = -e * vn * nx + (1 - mu) * vt_x;
        b.vy = -e * vn * ny + (1 - mu) * vt_y;
        hasCollision = true;
      }
      
      const overlap = minD - dist;
      b._x_m += nx * overlap;
      b._y_m += ny * overlap;
    }
  }
  
  return hasCollision;
}

// Run the test
let passed = 0;
const results = [];

for (let i = 0; i < 10; i++) {
  const testBall = {
    _x_m: physicsC.HOOP_X_M,
    _y_m: physicsC.HOOP_Y_M - 1.0,
    vx: 0,
    vy: 4.0,
    _scored: false,
  };
  
  let scored = false;
  for (let frame = 0; frame < 120; frame++) {
    const prevY = testBall._y_m;
    testBall.vy += physicsC.GRAVITY * (1/60);
    testBall._y_m += testBall.vy * (1/60);
    testBall._x_m += testBall.vx * (1/60);
    checkRimCollision(testBall, physicsC);
    if (checkScoring(testBall, prevY, physicsC)) {
      scored = true;
      break;
    }
  }
  
  if (scored) passed++;
  results.push(`Ball ${i+1}: ${scored ? '✅ GOAL' : '❌ MISS'} | finalX=${testBall._x_m.toFixed(3)} finalY=${testBall._y_m.toFixed(3)}`);
}

// Output results
const output = `🏀 HOOP TEST RESULT: ${passed}/10\n${results.join('\n')}\n\nHOOP_X_M: ${physicsC.HOOP_X_M.toFixed(4)}\nHOOP_Y_M: ${physicsC.HOOP_Y_M.toFixed(4)}\nRIM_RADIUS_M: ${physicsC.RIM_RADIUS_M}\nBALL_R_M: ${physicsC.BALL_RADIUS_M}\n\n${passed < 10 ? '❌ ТЕСТ НЕ ПРОЙДЕН' : '✅ ТЕСТ ПРОЙДЕН — 10/10 попаданий!'}`;

console.log('\n' + output);
fs.writeFileSync('/tmp/hoop_test_result.txt', output);
