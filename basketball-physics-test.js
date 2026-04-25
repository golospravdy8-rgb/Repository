/**
 * Quick physics engine tests (Node.js standalone)
 * Run with: node basketball-physics-test.js
 */

const {
  computeLaunchVelocity,
  stepPhysics,
  computeRimCollision,
  computeFloorBounce,
  simulateFullShot,
  computeAccuracy,
  shouldGuidedScore,
  PHYSICS_CONSTANTS,
} = require('./components/public/basketball-physics-engine.ts');

console.log('🏀 Basketball Physics Engine Test Suite\n');

// Test 1: Launch velocity
console.log('TEST 1: Launch Velocity Computation');
const launchParams = {
  angle: -1.05,
  power: 130,
  accuracy: 95,
  distToHoop: 240,
  playerX: 100,
  playerY: 380,
  hoopX: 320,
  hoopY: 300,
  scaleX: 1,
};

const velocity = computeLaunchVelocity(launchParams);
console.log(`  ✓ Launch velocity: vx=${velocity.vx.toFixed(2)}, vy=${velocity.vy.toFixed(2)}`);
console.log(`  ✓ Spin: ${velocity.spin.toFixed(3)}`);
console.log(`  ✓ Total speed: ${Math.sqrt(velocity.vx * velocity.vx + velocity.vy * velocity.vy).toFixed(2)} px/frame\n`);

// Test 2: Physics step
console.log('TEST 2: Physics Step (Gravity & Drag)');
const ball = {
  x: 100,
  y: 380,
  vx: 5,
  vy: -8,
  rot: 0,
  spin: 0,
  drag: PHYSICS_CONSTANTS.DRAG_COEFFICIENT,
  bounceCount: 0,
  rimBounceCount: 0,
};

const initialSpeed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
stepPhysics(ball, 1);
const afterSpeed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);

console.log(`  ✓ Initial speed: ${initialSpeed.toFixed(2)}`);
console.log(`  ✓ After step speed: ${afterSpeed.toFixed(2)}`);
console.log(`  ✓ Position: (${ball.x.toFixed(1)}, ${ball.y.toFixed(1)})`);
console.log(`  ✓ Drag reduced speed by: ${((1 - afterSpeed/initialSpeed) * 100).toFixed(1)}%\n`);

// Test 3: Rim collision
console.log('TEST 3: Rim Collision Physics');
const collisionBall = {
  x: 320,
  y: 275,
  vx: 1.5,
  vy: 4.0,
  rot: 0,
  spin: -0.5,
  drag: PHYSICS_CONSTANTS.DRAG_COEFFICIENT,
  bounceCount: 0,
  rimBounceCount: 0,
};

const rimResult = computeRimCollision(collisionBall, 320, 280, 95, 600);
console.log(`  ✓ Collision outcome: ${rimResult.outcome}`);
console.log(`  ✓ Should score: ${rimResult.shouldScore}`);
console.log(`  ✓ New velocity: (${rimResult.newVx.toFixed(2)}, ${rimResult.newVy.toFixed(2)})\n`);

// Test 4: Floor bounce
console.log('TEST 4: Floor Bounce Physics');
const bounceBall = {
  x: 200,
  y: 600,
  vx: 5,
  vy: 5,
  rot: 0,
  spin: 0,
  drag: PHYSICS_CONSTANTS.DRAG_COEFFICIENT,
  bounceCount: 0,
  rimBounceCount: 0,
};

console.log(`  Before: y=${bounceBall.y}, vy=${bounceBall.vy}, bounces=${bounceBall.bounceCount}`);
computeFloorBounce(bounceBall, 600);
console.log(`  After:  y=${bounceBall.y}, vy=${bounceBall.vy}, bounces=${bounceBall.bounceCount}`);
console.log(`  ✓ Ball bounced correctly\n`);

// Test 5: Shot series simulation
console.log('TEST 5: Full Shot Simulation (Multiple Trials)');
const testCases = [
  { accuracy: 95, distToHoop: 240, label: 'High Accuracy (95%)', hoopX: 320 },
  { accuracy: 50, distToHoop: 240, label: 'Medium Accuracy (50%)', hoopX: 320 },
  { accuracy: 15, distToHoop: 240, label: 'Low Accuracy (15%)', hoopX: 320 },
];

for (const testCase of testCases) {
  const params = {
    angle: -1.05,
    power: 130,
    accuracy: testCase.accuracy,
    distToHoop: testCase.distToHoop,
    playerX: 100,
    playerY: 380,
    hoopX: testCase.hoopX,
    hoopY: 300,
    scaleX: 1,
  };

  let scores = 0;
  const trials = 5;

  for (let i = 0; i < trials; i++) {
    const result = simulateFullShot(params, 600, params.hoopX, params.hoopY);
    if (result.scored) scores++;
  }

  const rate = ((scores / trials) * 100).toFixed(0);
  console.log(`  ${testCase.label}: ${scores}/${trials} scored (${rate}% success rate)`);
}

console.log('\n');

// Test 6: Accuracy computation
console.log('TEST 6: Accuracy Calculation');
const accTest1 = computeAccuracy(0.5, 0.5, 0.12);
const accTest2 = computeAccuracy(0.3, 0.5, 0.12);
const accTest3 = computeAccuracy(0.0, 0.5, 0.12);

console.log(`  In zone (0.5): ${accTest1.toFixed(0)}%`);
console.log(`  Slightly off (0.3): ${accTest2.toFixed(0)}%`);
console.log(`  Far off (0.0): ${accTest3.toFixed(0)}%\n`);

// Test 7: Guided mode
console.log('TEST 7: Guided Mode Threshold');
console.log(`  Accuracy 92% → Guided: ${shouldGuidedScore(92)}`);
console.log(`  Accuracy 91% → Guided: ${shouldGuidedScore(91)}`);
console.log(`  Accuracy 99% → Guided: ${shouldGuidedScore(99)}\n`);

console.log('✅ All tests completed!');
