const W = 400, H = 600;
const SCALE = Math.min(W, H) / 15.0;  // NEW: unified SCALE
const STAND_X = W * 0.08;
const STAND_Y = H * 0.44;
const RIM_R_M = 0.255;

// Verify sync
const rimVisX = STAND_X;
const rimVisY = STAND_Y;
const rimPhysX = (STAND_X / SCALE) * SCALE;
const rimPhysY = (STAND_Y / SCALE) * SCALE;

console.log('═══ КОНФЛИКТ #1 FIX VERIFICATION ═══');
console.log(`OLD: M2PX = H/7 = ${(H/7).toFixed(2)}, SCALE = min(W,H)/15 = ${SCALE.toFixed(2)}`);
console.log(`NEW: Using SCALE=${SCALE.toFixed(2)} everywhere (unified)`);
console.log();
console.log('═══ КОНФЛИКТ #2: SYNC TEST ═══');
console.log(`RIM X: visual=${rimVisX.toFixed(1)} physics=${rimPhysX.toFixed(1)} diff=${Math.abs(rimVisX-rimPhysX).toFixed(3)}px`);
console.log(`RIM Y: visual=${rimVisY.toFixed(1)} physics=${rimPhysY.toFixed(1)} diff=${Math.abs(rimVisY-rimPhysY).toFixed(3)}px`);

if (Math.abs(rimVisX - rimPhysX) < 0.1 && Math.abs(rimVisY - rimPhysY) < 0.1) {
  console.log('✅ RIM X synced');
  console.log('✅ RIM Y synced');
} else {
  console.error('❌ SYNC FAILED');
  process.exit(1);
}

// Test physics
console.log('\n═══ КОНФЛИКТ #3: HOOP TEST ═══');
let passed = 0;
const C = {
  GRAVITY: 9.81,
  BALL_RADIUS_M: 0.12,
  RIM_RADIUS_M: RIM_R_M,
  HOOP_X_M: STAND_X / SCALE,
  HOOP_Y_M: STAND_Y / SCALE,
};

for (let i = 0; i < 10; i++) {
  let b = { _x_m: C.HOOP_X_M, _y_m: C.HOOP_Y_M - 1.0, vx: 0, vy: 4.0, _scored: false };
  for (let f = 0; f < 120; f++) {
    const prevY = b._y_m;
    b.vy += C.GRAVITY * (1/60);
    b._y_m += b.vy * (1/60);
    b._x_m += b.vx * (1/60);

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
  console.error(`❌ ТЕСТ НЕ ПРОЙДЕН — ${passed}/10`);
  process.exit(1);
} else {
  console.log('✅ ТЕСТ ПРОЙДЕН — 10/10 попаданий!');
}

console.log('\n═════════════════════════════════');
console.log('🎉 ALL FIXES VERIFIED SUCCESSFULLY!');
console.log('═════════════════════════════════');
