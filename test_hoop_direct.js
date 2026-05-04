// Minimal test to check scoring logic
const H = 600; // Canvas height
const W = 400; // Canvas width
const M2PX = H / 7.0;

const STAND_Y = H * 0.44;
const STAND_X = W * 0.08;

const HOOP_X_M = STAND_X / M2PX;
const HOOP_Y_M = STAND_Y / M2PX;
const RIM_RADIUS_M = 0.255;
const BALL_RADIUS_M = 0.12;
const GRAVITY = 9.81;

console.log('=== PHYSICS CONSTANTS ===');
console.log('M2PX:', M2PX.toFixed(3));
console.log('HOOP_X_M:', HOOP_X_M.toFixed(3), 'HOOP_Y_M:', HOOP_Y_M.toFixed(3));
console.log('RIM_RADIUS_M:', RIM_RADIUS_M);

// Test ball
let testBall = {
  _x_m: HOOP_X_M,
  _y_m: HOOP_Y_M - 1.0,
  vx: 0,
  vy: 4.0,
  _scored: false,
};

let scored = false;
let frame = 0;

for (frame = 0; frame < 120; frame++) {
  const prevY = testBall._y_m;
  
  // Integrate physics
  testBall.vy += GRAVITY * (1/60);
  testBall._y_m += testBall.vy * (1/60);
  testBall._x_m += testBall.vx * (1/60);
  
  // Check scoring
  if (!testBall._scored) {
    const crossedRim = prevY <= HOOP_Y_M && testBall._y_m > HOOP_Y_M;
    const movingDown = testBall.vy > 0;
    const insideHoop = Math.abs(testBall._x_m - HOOP_X_M) < RIM_RADIUS_M * 0.88;
    
    if (crossedRim && movingDown && insideHoop) {
      scored = true;
      testBall._scored = true;
      console.log(`Frame ${frame}: ✅ SCORED`);
      console.log('  prevY:', prevY.toFixed(4), '_y_m:', testBall._y_m.toFixed(4));
      console.log('  crossedRim:', crossedRim, 'movingDown:', movingDown, 'insideHoop:', insideHoop);
      console.log('  vy:', testBall.vy.toFixed(3), '_x_m:', testBall._x_m.toFixed(4));
      break;
    }
  }
  
  // Debug early frames
  if (frame < 5 || frame % 20 === 0) {
    console.log(`Frame ${frame}: _y_m=${testBall._y_m.toFixed(4)} vy=${testBall.vy.toFixed(3)}`);
  }
}

console.log('\n=== RESULT ===');
console.log(scored ? '✅ GOAL' : '❌ MISS');
console.log('Final position: x=' + testBall._x_m.toFixed(4) + ' y=' + testBall._y_m.toFixed(4));
console.log('Final velocity: vy=' + testBall.vy.toFixed(3));
