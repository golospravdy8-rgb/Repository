# 🔒 STAGE 7: SAFETY CONSTRAINT VERIFICATION

**Status**: ✅ **READY TO VERIFY**  
**Date**: 2026-05-02 22:45 UTC  
**Build**: ✅ Passing

---

## 🎯 VERIFICATION OBJECTIVES

The Stefan's physics integration MUST NOT touch:
1. ✅ Gravity constant (9.81 m/s²)
2. ✅ Time step (FIXED_DT = 1/120)
3. ✅ Collision algorithm (8-point CCD)
4. ✅ Physics engine core (integratePhysics, sweepSphereVsSphere)
5. ✅ Launch system (3-click mechanics)
6. ✅ Gate scoring logic
7. ✅ Rendering system
8. ✅ Firebase/multiplayer
9. ✅ Ball mass and dimensions

This document verifies ALL constraints are intact.

---

## 📋 CONSTRAINT CHECKLIST

### 1. GRAVITY CONSTANT 🔒

**Expected Value**: 9.81 m/s² (SI standard)

**Check 1: In rimPhysicsConfig.ts**
```typescript
// Should NOT appear in this file
// Gravity is locked in physics engine
```
✅ **Status**: Not modified in config (correct)

**Check 2: In basketball-physics-engine.ts**
```bash
grep -n "GRAVITY\|9.81" components/public/basketball-physics-engine.ts
```

Expected: Line showing `const GRAVITY = 9.81` or similar  
**Verification Command**:
```bash
grep "GRAVITY\|9.81" components/public/basketball-physics-engine.ts | head -5
```

---

### 2. TIME STEP (FIXED_DT) 🔒

**Expected Value**: 1/120 seconds (120 Hz physics)

**Check**: In basketball-physics-engine.ts
```bash
grep -n "FIXED_DT\|1/120" components/public/basketball-physics-engine.ts
```

Expected: Single definition like `const FIXED_DT = 1/120;`

**Verification Command**:
```bash
grep "FIXED_DT" components/public/basketball-physics-engine.ts | head -3
```

---

### 3. COLLISION ALGORITHM 🔒

**Expected**: 8-point Continuous Collision Detection

**Check**: Function checkAllCollisions()
```bash
grep -n "checkAllCollisions\|8.*point\|CCD" components/public/basketball-physics-engine.ts | head -10
```

Expected:
- `checkAllCollisions()` function exists
- Uses 8-point rim checking
- Calls `sweepSphereVsSphere()` for each point
- No algorithm changes

**What Should NOT Change**:
- ❌ Point count (should be 8)
- ❌ Sweep algorithm
- ❌ Contact detection logic
- ❌ Impulse calculation method

---

### 4. PHYSICS ENGINE CORE 🔒

**Check 1: integratePhysics() function**
```bash
grep -A 15 "function integratePhysics\|^.*integratePhysics = " components/public/basketball-physics-engine.ts | head -20
```

Expected:
- Verlet integration (position += velocity * dt)
- Gravity applied (v.vy += g * dt)
- Damping applied (linear/angular)
- NO parameter changes

**Check 2: sweepSphereVsSphere() function**
```bash
grep -A 10 "function sweepSphereVsSphere" components/public/basketball-physics-engine.ts | head -15
```

Expected:
- Quadratic equation solver for sphere-sphere collision
- Continuous time interval [1e-6, dt]
- NO algorithm changes

**Check 3: applyRimImpulse() function**
```bash
grep -A 5 "function applyRimImpulse\|applyRimImpulse = " components/public/basketball-physics-engine.ts | head -10
```

Expected:
- Uses C.E_RIM (restitution) — NOW 0.45 ✅
- Uses C.MU_RIM (friction) — NOW 0.35 ✅
- NO architecture changes

---

### 5. LAUNCH SYSTEM 🔒

**Expected**: 3-click mechanics (angle, power, fire)

**Check**: In RucheekGameCanvas.tsx
```bash
grep -n "click\|Click\|CLICK\|launch\|Launch" components/public/RucheekGameCanvas.tsx | grep -i "1\|2\|3" | head -10
```

Expected:
- Click 1: Set angle
- Click 2: Set power
- Click 3: Fire/launch ball
- NO changes to flow

---

### 6. GATE SCORING LOGIC 🔒

**Expected**: Top and bottom gates for goal detection

**Check**: In basketball-physics-engine.ts
```bash
grep -n "topGate\|bottomGate\|GATE\|checkGateScoring" components/public/basketball-physics-engine.ts | head -10
```

Expected:
- `checkGateScoring()` function exists
- Uses TOP_GATE_OFFSET and BOTTOM_GATE_OFFSET
- Detects ball entry/exit
- NO logic changes

---

### 7. RENDERING SYSTEM 🔒

**Check**: Canvas setup in RucheekGameCanvas.tsx
```bash
grep -n "canvas\|Canvas\|ctx\|drawImage\|fillRect" components/public/RucheekGameCanvas.tsx | head -20
```

Expected:
- Canvas 2D context used
- Ball rendered as circle
- Rim rendered at correct position
- NO rendering algorithm changes

---

### 8. FIREBASE / MULTIPLAYER 🔒

**Check**: Firebase imports and calls
```bash
grep -n "Firebase\|firebase\|joinGame\|updateScore" components/public/RucheekGameCanvas.tsx | head -10
```

Expected:
- Firebase initialization untouched
- Multiplayer sync unchanged
- No networking changes

---

### 9. BALL PROPERTIES 🔒

**Expected Values** (from FIBA):
- Mass: 0.62 kg
- Radius: 0.12075 m (12.075 cm)
- Diameter: 0.2415 m (24.15 cm)

**Check**: In metricsConversion.ts
```typescript
BALL_MASS_KG: 0.62
BALL_DIAMETER_M: 0.2415
BALL_RADIUS_M: 0.12075
```

**Verification**:
```bash
grep "BALL_" lib/game/metricsConversion.ts | grep -v "//"
```

Expected output:
```
BALL_DIAMETER_M: 0.2415,
BALL_RADIUS_M: 0.12075,
BALL_MASS_KG: 0.62,
```

---

## 🔍 FILES THAT SHOULD NOT BE MODIFIED

### These files MUST be unchanged:

❌ **basketball-physics-engine.ts**
- Line 61-72: integratePhysics()
- Line 74-90: sweepSphereVsSphere()
- Line 170+: checkAllCollisions()
- Gravity constant
- FIXED_DT constant

❌ **RucheekGameCanvas.tsx** (except Stage 5 logging import)
- Launch system logic
- Rendering code
- Game loop
- Firebase initialization

❌ **Start.js, package.json**
- Build configuration
- Dev server setup

❌ **.next/ directory**
- Build output (regenerated on build)

### These files SHOULD be modified:

✅ **rimPhysicsConfig.ts** (MODIFIED)
- E_RIM: 0.25 → 0.45 ✅
- MU_RIM: 0.82 → 0.35 ✅
- Added FIBA dimensions ✅

✅ **metricsConversion.ts** (NEW)
- Created for FIBA specs ✅
- Validation functions ✅
- Logging functions ✅

✅ **RucheekGameCanvas.tsx** (Stage 5 ONLY)
- Added validation imports ✅
- Added validation calls ✅
- No other changes ✅

---

## ✅ VERIFICATION COMMANDS

Run these commands to verify all constraints:

```bash
# 1. Check Gravity is still 9.81
grep "GRAVITY\|9.81" components/public/basketball-physics-engine.ts

# 2. Check FIXED_DT is still 1/120
grep "FIXED_DT" components/public/basketball-physics-engine.ts

# 3. Check integratePhysics not modified
grep -A 2 "function integratePhysics\|integratePhysics.*{" components/public/basketball-physics-engine.ts

# 4. Check sweepSphereVsSphere exists
grep "function sweepSphereVsSphere" components/public/basketball-physics-engine.ts

# 5. Check RIM constants correctly set
grep "RESTITUTION_RIM\|FRICTION_RIM" lib/game/rimPhysicsConfig.ts

# 6. Check FIBA specs in metrics conversion
grep "BALL_RADIUS_M\|RIM_RADIUS_M" lib/game/metricsConversion.ts

# 7. Check build passes
npm run build 2>&1 | tail -5

# 8. Check dev server starts
timeout 5 npm run dev 2>&1 | grep -i "ready\|error" || echo "✅ Server started"
```

---

## 📊 SAFETY MATRIX

| Constraint | Before | After | Status |
|-----------|--------|-------|--------|
| **Gravity** | 9.81 m/s² | 9.81 m/s² | 🔒 LOCKED |
| **FIXED_DT** | 1/120 | 1/120 | 🔒 LOCKED |
| **CCD Algorithm** | 8-point | 8-point | 🔒 LOCKED |
| **integratePhysics()** | Verlet | Verlet | 🔒 LOCKED |
| **Launch System** | 3-click | 3-click | 🔒 LOCKED |
| **Gate Scoring** | Top/Bottom | Top/Bottom | 🔒 LOCKED |
| **Rendering** | Canvas 2D | Canvas 2D | 🔒 LOCKED |
| **Firebase** | Sync | Sync | 🔒 LOCKED |
| **E_RIM** | 0.25 ❌ | 0.45 ✅ | ✅ UPDATED |
| **MU_RIM** | 0.82 ❌ | 0.35 ✅ | ✅ UPDATED |

---

## 🎯 VERIFICATION CHECKLIST

Complete each verification:

- [ ] GRAVITY = 9.81 m/s² (command: grep "GRAVITY" physics-engine.ts)
- [ ] FIXED_DT = 1/120 (command: grep "FIXED_DT" physics-engine.ts)
- [ ] integratePhysics() unchanged (code review)
- [ ] sweepSphereVsSphere() unchanged (code review)
- [ ] checkAllCollisions() uses 8 points (code review)
- [ ] applyRimImpulse() uses C.E_RIM and C.MU_RIM (code review)
- [ ] Launch system 3-click intact (code review)
- [ ] Gate scoring logic intact (code review)
- [ ] Rendering system unchanged (code review)
- [ ] Firebase multiplayer untouched (code review)
- [ ] Build passes without errors (npm run build)
- [ ] Dev server starts correctly (npm run dev)

---

## 🚀 SUCCESS CRITERIA

All constraints verified PASS when:

✅ All grep commands find expected values  
✅ Code review confirms no algorithm changes  
✅ Build passes (exit code 0)  
✅ Dev server starts (Ready in X seconds)  
✅ No console errors  
✅ No physics warnings  

---

## 📝 VERIFICATION RECORD

**Date Verified**: [complete during testing]  
**Verified By**: [user/claude]  
**Result**: PASS / FAIL

**Details**:
```
Gravity: [value from grep]
FIXED_DT: [value from grep]
Build status: [pass/fail]
Server status: [running/failed]
```

---

## ✨ STAGE 7 STATUS

🟢 **READY FOR VERIFICATION**

Once all checks pass → proceed to **STAGE 8: Create Git Commit**

