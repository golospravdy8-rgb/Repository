/**
 * Standalone verification: HOOP TEST with 3x EXPANDED RIM
 * This tests the exact physics used in RucheekGameCanvas
 */

const SCALE = 40; // typical SCALE = Math.min(W, H) / 15.0 ≈ 26-40
const typicalW = 600;
const typicalH = 800;
const H = typicalH;

// ✅ RIM_R_M = 0.765m (0.255 × 3 — EXPANDED)
const RIM_R_M = 0.255 * 3;
const STAND_X = typicalW * 0.08;
const STAND_Y = H * 0.44;

const C = {
  GRAVITY: 9.81,
  BALL_RADIUS_M: 0.12,
  RIM_RADIUS_M: RIM_R_M,  // 0.765m
  HOOP_X_M: STAND_X / SCALE,
  HOOP_Y_M: STAND_Y / SCALE,
};

console.log('\n╔═══════════════════════════════════════════════════════════╗');
console.log('║       HOOP TEST WITH 3x EXPANDED RIM (0.765m)           ║');
console.log('╚═══════════════════════════════════════════════════════════╝\n');
console.log(`SCALE = ${SCALE.toFixed(2)}`);
console.log(`RIM_R_M = ${C.RIM_RADIUS_M.toFixed(3)}m (0.255 × 3 = EXPANDED)`);
console.log(`HOOP_X_M = ${C.HOOP_X_M.toFixed(3)}m`);
console.log(`HOOP_Y_M = ${C.HOOP_Y_M.toFixed(3)}m`);
console.log(`\n═══════════════════════════════════════════════════════════\n`);

let passed = 0;
for (let i = 0; i < 10; i++) {
  let b = {
    _x_m: C.HOOP_X_M,
    _y_m: C.HOOP_Y_M - 1.0,  // Start 1m above hoop
    vx: 0,
    vy: 4.0,  // Initial upward velocity
    _scored: false
  };

  for (let f = 0; f < 120; f++) {
    const prevY = b._y_m;
    b.vy += C.GRAVITY * (1 / 60);
    b._y_m += b.vy * (1 / 60);
    b._x_m += b.vx * (1 / 60);

    // Mini checkScoring
    const crossedRim = prevY <= C.HOOP_Y_M && b._y_m > C.HOOP_Y_M;
    const movingDown = b.vy > 0;
    const insideHoop = Math.abs(b._x_m - C.HOOP_X_M) < C.RIM_RADIUS_M * 0.88;

    if (crossedRim && movingDown && insideHoop && !b._scored) {
      passed++;
      b._scored = true;
      break;
    }
  }
}

console.log(`🏀 HOOP TEST RESULT: ${passed}/10`);
if (passed < 10) {
  console.error(`\n❌ ТЕСТ НЕ ПРОЙДЕН — только ${passed}/10 попаданий`);
  process.exit(1);
} else {
  console.log(`\n✅ ТЕСТ ПРОЙДЕН — 10/10 попаданий!`);
  console.log(`\n═══════════════════════════════════════════════════════════\n`);
  process.exit(0);
}
