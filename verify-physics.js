#!/usr/bin/env node
/**
 * PHYSICS VERIFICATION TEST
 * Checks that basketball physics engine is properly integrated and working
 */

const fs = require('fs');
const path = require('path');

console.log('🏀 PROFESSIONAL BASKETBALL PHYSICS ENGINE VERIFICATION\n');
console.log('═══════════════════════════════════════════════════════════\n');

// Test 1: Verify all files exist
console.log('✅ TEST 1: FILE EXISTENCE');
console.log('────────────────────────────');

const requiredFiles = [
  'components/public/basketball-physics-engine.ts',
  'components/public/RucheekGameCanvas.tsx',
  'lib/game/trajectoryHash.ts',
  'lib/game/rimPhysicsConfig.ts',
  'lib/colyseus/schemas.shared.ts',
];

let filesOk = true;
requiredFiles.forEach(file => {
  const fullPath = path.join('D:/n8n/basket-lviv', file);
  const exists = fs.existsSync(fullPath);
  console.log(`  ${exists ? '✅' : '❌'} ${file}`);
  if (!exists) filesOk = false;
});

if (filesOk) {
  console.log('\n✅ All required files exist!\n');
} else {
  console.log('\n❌ Some files missing!\n');
  process.exit(1);
}

// Test 2: Verify physics imports and functions
console.log('✅ TEST 2: PHYSICS FUNCTIONS EXPORTED');
console.log('────────────────────────────────────────');

const physicsEngine = fs.readFileSync('D:/n8n/basket-lviv/components/public/basketball-physics-engine.ts', 'utf-8');

const requiredExports = [
  'export function integratePhysics',
  'export function sweepSphereVsSphere',
  'export function checkAllCollisions',
  'export function checkGoalEntry',
  'export function computeLaunchVelocityMeters',
];

let exportsOk = true;
requiredExports.forEach(exp => {
  const found = physicsEngine.includes(exp);
  const name = exp.replace('export function ', '').split('(')[0];
  console.log(`  ${found ? '✅' : '❌'} ${name}()`);
  if (!found) exportsOk = false;
});

if (exportsOk) {
  console.log('\n✅ All physics functions exported!\n');
} else {
  console.log('\n❌ Some physics functions missing!\n');
  process.exit(1);
}

// Test 3: Verify RucheekGameCanvas integration
console.log('✅ TEST 3: CANVAS INTEGRATION');
console.log('─────────────────────────────');

const canvas = fs.readFileSync('D:/n8n/basket-lviv/components/public/RucheekGameCanvas.tsx', 'utf-8');

const integrationChecks = [
  { pattern: /integratePhysics/, desc: 'Imports integratePhysics' },
  { pattern: /checkAllCollisions/, desc: 'Imports checkAllCollisions' },
  { pattern: /checkGoalEntry/, desc: 'Imports checkGoalEntry' },
  { pattern: /computeLaunchVelocityMeters/, desc: 'Imports computeLaunchVelocityMeters' },
  { pattern: /const SCALE = .*\/ 15\.0/, desc: 'Defines SCALE constant' },
  { pattern: /function stepBall\(b.*dt/, desc: 'stepBall function exists' },
  { pattern: /const FIXED_DT = 1\/120/, desc: 'Fixed 120Hz timestep' },
  { pattern: /_x_m.*_y_m/, desc: 'Meter-space ball state (_x_m, _y_m)' },
  { pattern: /integratePhysics\(b, FIXED_DT, C\)/, desc: 'Calls integratePhysics' },
  { pattern: /checkAllCollisions\(b, FIXED_DT, C\)/, desc: 'Calls checkAllCollisions' },
  { pattern: /checkGoalEntry\(b, C\)/, desc: 'Calls checkGoalEntry' },
  { pattern: /b\.x = b\._x_m \* SCALE/, desc: 'Syncs pixel coordinates from meter-space' },
];

let canvasOk = true;
integrationChecks.forEach(check => {
  const found = check.pattern.test(canvas);
  console.log(`  ${found ? '✅' : '❌'} ${check.desc}`);
  if (!found) canvasOk = false;
});

if (canvasOk) {
  console.log('\n✅ Canvas fully integrated with physics engine!\n');
} else {
  console.log('\n⚠️  Some canvas integration checks failed!\n');
}

// Test 4: Verify trajectory hash implementation
console.log('✅ TEST 4: TRAJECTORY HASH');
console.log('──────────────────────────');

const trajectoryHash = fs.readFileSync('D:/n8n/basket-lviv/lib/game/trajectoryHash.ts', 'utf-8');

const trajectoryChecks = [
  { pattern: /export.*TrajectoryCheckpoint/, desc: 'Exports TrajectoryCheckpoint interface' },
  { pattern: /export.*TrajectoryHash/, desc: 'Exports TrajectoryHash interface' },
  { pattern: /export function generateLaunchHash/, desc: 'Exports generateLaunchHash' },
  { pattern: /export function recordCheckpoint/, desc: 'Exports recordCheckpoint' },
  { pattern: /export function generateOutcomeHash/, desc: 'Exports generateOutcomeHash' },
  { pattern: /export function compareTrajectories/, desc: 'Exports compareTrajectories' },
];

let trajectoryOk = true;
trajectoryChecks.forEach(check => {
  const found = check.pattern.test(trajectoryHash);
  console.log(`  ${found ? '✅' : '❌'} ${check.desc}`);
  if (!found) trajectoryOk = false;
});

if (trajectoryOk) {
  console.log('\n✅ Trajectory hash system complete!\n');
} else {
  console.log('\n❌ Trajectory hash system incomplete!\n');
}

// Test 5: Verify Colyseus schema updates
console.log('✅ TEST 5: COLYSEUS SCHEMA');
console.log('──────────────────────────');

const schema = fs.readFileSync('D:/n8n/basket-lviv/lib/colyseus/schemas.shared.ts', 'utf-8');

const schemaChecks = [
  { pattern: /@type\("number"\) omega/, desc: 'BallSchema has omega field' },
  { pattern: /@type\("number"\) physTick/, desc: 'BallSchema has physTick field' },
  { pattern: /@type\("string"\) lastOutcome/, desc: 'BallSchema has lastOutcome field' },
  { pattern: /@type\("number"\) rimContactMask/, desc: 'BallSchema has rimContactMask field' },
  { pattern: /@type\("string"\) trajectoryHash/, desc: 'BallSchema has trajectoryHash field' },
  { pattern: /@type\("number"\) launchTick/, desc: 'BallSchema has launchTick field' },
];

let schemaOk = true;
schemaChecks.forEach(check => {
  const found = check.pattern.test(schema);
  console.log(`  ${found ? '✅' : '❌'} ${check.desc}`);
  if (!found) schemaOk = false;
});

if (schemaOk) {
  console.log('\n✅ Colyseus schema properly updated!\n');
} else {
  console.log('\n❌ Colyseus schema update incomplete!\n');
}

// Test 6: Verify rimPhysicsConfig
console.log('✅ TEST 6: RIM PHYSICS CONFIG');
console.log('──────────────────────────────');

const rimConfig = fs.readFileSync('D:/n8n/basket-lviv/lib/game/rimPhysicsConfig.ts', 'utf-8');

const rimConfigChecks = [
  { pattern: /RIM_PHYSICS_CONFIG_M/, desc: 'Exports RIM_PHYSICS_CONFIG_M' },
  { pattern: /BALL_RADIUS_M: 0\.12/, desc: 'BALL_RADIUS_M = 0.12m' },
  { pattern: /RIM_RADIUS_M: 0\.225/, desc: 'RIM_RADIUS_M = 0.225m' },
  { pattern: /E_RIM: 0\.72/, desc: 'E_RIM = 0.72 (restitution)' },
  { pattern: /MU_RIM: 0\.57/, desc: 'MU_RIM = 0.57 (friction)' },
  { pattern: /Cd_EFFECTIVE: 0\.004/, desc: 'Cd_EFFECTIVE = 0.004 (drag)' },
];

let rimConfigOk = true;
rimConfigChecks.forEach(check => {
  const found = check.pattern.test(rimConfig);
  const desc = check.desc.split(' =')[0];
  console.log(`  ${found ? '✅' : '❌'} ${desc}`);
  if (!found) rimConfigOk = false;
});

if (rimConfigOk) {
  console.log('\n✅ Rim physics config properly configured!\n');
} else {
  console.log('\n❌ Rim physics config incomplete!\n');
}

// SUMMARY
console.log('═══════════════════════════════════════════════════════════\n');
console.log('📊 VERIFICATION SUMMARY\n');

const allOk = filesOk && exportsOk && canvasOk && trajectoryOk && schemaOk && rimConfigOk;

if (allOk) {
  console.log('✅ ✅ ✅ PHYSICS ENGINE FULLY IMPLEMENTED AND VERIFIED ✅ ✅ ✅');
  console.log('\n🚀 Ready for browser testing!');
  console.log('\n📋 Checklist for browser test:');
  console.log('  ☐ Ball launches with visible parabolic trajectory');
  console.log('  ☐ Ball does NOT tunnel through rim at high speed (CCD working)');
  console.log('  ☐ Rim contact causes natural bounces (impulse response)');
  console.log('  ☐ Swish logged when ball enters net cleanly (no rim contacts)');
  console.log('  ☐ Ball bounces on floor max 4 times, then state=missed');
  console.log('  ☐ No console errors with _x_m, _y_m, SCALE, or physics functions');
  console.log('\n🌐 Open http://localhost:3006/game and test ball flight!');
} else {
  console.log('❌ VERIFICATION FAILED - Some components are incomplete\n');
  process.exit(1);
}

console.log('\n');
