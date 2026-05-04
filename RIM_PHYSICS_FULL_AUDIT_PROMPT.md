# 🔬 RIM PHYSICS FULL AUDIT PROMPT

**Purpose**: Complete diagnostic of rim physics system WITHOUT making changes. Measure, analyze, identify all issues.

---

## PART 1: VISUAL RIM MEASUREMENT

### Step 1.1: Find Visual Rim Dimensions
Search in `RucheekGameCanvas.tsx` for:
- `HOOP_R` — visual rim radius in pixels
- `HOOP_X`, `HOOP_Y` — visual rim center coordinates
- `SCALE` — pixel-to-meter conversion factor

**Record**:
```
HOOP_R = ___ px
HOOP_X = ___ px
HOOP_Y = ___ px
SCALE = ___ (px/meter)
Visual rim diameter = HOOP_R × 2 = ___ px
```

### Step 1.2: Calculate Expected Physics Size
Expected physics rim from visual:
```
Visual rim diameter (px) / SCALE = Expected physics diameter (m)
Expected physics radius = Expected diameter / 2
```

**Example**:
- HOOP_R = 27px → diameter = 54px
- SCALE = 66.67 (e.g., 1000px / 15m)
- Expected: 54px / 66.67 = 0.81m diameter → 0.405m radius (WRONG! Should be 0.225m)

---

## PART 2: ACTUAL PHYSICS RIM MEASUREMENT

### Step 2.1: Find Physics Rim Constants
Search in `basketball-physics-engine.ts` and `RucheekGameCanvas.tsx`:
- `RIM_RADIUS_M` — rim radius constant in meters
- `RIM_TUBE_R_M` — rim tube radius in meters
- `EFFECTIVE_RIM_RADIUS` — actual collision radius used

**Record**:
```
RIM_RADIUS_M = ___ m (should be 0.225m FIBA)
RIM_TUBE_R_M = ___ m (should be 0.009m FIBA)
EFFECTIVE_RIM_RADIUS = RIM_RADIUS_M + RIM_TUBE_R_M + buffer = ___ m
```

### Step 2.2: Find All Rim Radius References
Grep for these patterns:
```
RIM_RADIUS
EFFECTIVE_RIM_RADIUS
HOOP_R / SCALE
rimRadius
rimRadiusM
```

**List ALL places** where rim size is calculated or used:
1. Line #: _____ → Formula: _____
2. Line #: _____ → Formula: _____
3. ... (continue for all occurrences)

---

## PART 3: COLLISION GEOMETRY CHECK

### Step 3.1: Find checkAllCollisions() Function
Locate in `basketball-physics-engine.ts`:
```typescript
function checkAllCollisions(b: BallStateM, C: PhysicsConstantsM): void
```

**Record the EXACT collision radius formula**:
```
const EFFECTIVE_RIM_RADIUS = _____
```

### Step 3.2: Check for Double Inflation
Look for patterns like:
- `RIM_RADIUS_M * 1.08` (1.08× inflation)
- `HOOP_R / SCALE * 1.08` (pixel inflation)
- `HOOP_R * 1.1` (10% inflation)
- Any multiplication factor > 1.0

**If found**:
```
❌ DOUBLE INFLATION FOUND:
Line: _____
Formula: _____
Current value: _____
Should be: _____
```

**If NOT found**:
```
✅ No double inflation detected
```

### Step 3.3: Check for Pixel Contamination
Look for:
- `HOOP_R / SCALE` (visual px → physics m conversion) used in collision
- `rimRadius_px` used in physics calculations
- Any px→m conversion inside checkAllCollisions()

**If found**:
```
⚠️ PIXEL CONTAMINATION:
Line: _____
Code: _____
Issue: Visual pixels mixed into physics collision
```

---

## PART 4: COLLISION DETECTION ALGORITHM

### Step 4.1: Understand CCD (Continuous Collision Detection)
Find the 8-point collision checking:
```typescript
const rimAngles = [];
for (let i = 0; i < 8; i++) {
  rimAngles.push((i * Math.PI * 2) / 8);
}
```

**Record**:
```
8-point CCD active: YES / NO
Collision check count per frame: 8 / other ___
```

### Step 4.2: Check Penetration Handling
Find how penetration is handled:
```typescript
const dist = Math.hypot(dx, dy);
const penetration = dist - EFFECTIVE_RIM_RADIUS;
if (penetration < 0) {
  // How is penetration handled?
}
```

**Record**:
```
Penetration threshold: < 0 / < 0.01 / < ___ m
Penetration response: [describe]
```

---

## PART 5: DOUBLE PHYSICS CHECK

### Step 5.1: Find All Physics Engines
Search for:
- `checkAllCollisions` — main collision
- `checkGateCollision` / `checkGateScoringGeometry` — gate collision
- `checkBackboardCollision` — backboard physics
- `applyRimImpulse` / `applyRimForce` — impulse response
- `solveContactsWithPGS` — constraint solver

**List ALL physics functions**:
```
1. checkAllCollisions() — Line: ___
2. checkGateCollision() — Line: ___
3. checkBackboardCollision() — Line: ___
4. applyRimImpulse() — Line: ___
5. solveContactsWithPGS() — Line: ___
... (continue)
```

### Step 5.2: Check for Redundant Collision Detection
Look for:
- **Same collision checked twice** (different functions)
- **Overlapping collision zones** (rim + gate both checking same area)
- **Velocity corrections applied twice** (impulse + constraint solver both modifying v)

**If found**:
```
🔴 REDUNDANT COLLISION:
Function A: checkAllCollisions() — Line: _____
Function B: checkGateCollision() — Line: _____
Issue: Both checking rim collision in same area
Result: Ball gets double impulse / double damping
```

### Step 5.3: Check State Machine
Find where collision state is tracked:
```typescript
b.onRim = true / false
b.rimContactTime = 0
b.dwell = 0
```

**Record**:
```
Rim contact state tracked: YES / NO
Dwell time tracked: YES / NO
State prevents duplicate collisions: YES / NO
```

---

## PART 6: ASSIST LOGIC CHECK

### Step 6.1: Find "Invisible Assist" Functions
Search for:
- `calculateRealisticAccuracy` — arcade accuracy
- `calculateGreenZone` — green zone assist
- `matchPct` — percentage matching
- `getShootingPhysics` — arcade shooting
- `magnet` / `magnetForce` — automatic aiming

**If found**:
```
⚠️ ARCADE LOGIC FOUND:
Function: _____
Location: _____
Effect: [describe]
```

**If NOT found**:
```
✅ No arcade assist logic detected
```

### Step 6.2: Find Gate Scoring vs Trajectory Scoring
Search for:
- `checkGateScoringGeometry()` — geometric gate check
- `prev_y` tracking — trajectory-based scoring
- `velocityMagnitude` — speed-based scoring

**Record**:
```
Scoring method: Gate geometry / Trajectory / Mixed
Gate scoring active: YES / NO
Trajectory scoring active: YES / NO
```

---

## PART 7: GENERATE FULL REPORT

### Summary Table

Create table with actual values:

| Measurement | Value | Expected (FIBA) | Match? | Issue |
|------------|-------|-----------------|--------|-------|
| Visual rim radius | ___ px | 27 px | ✅/❌ | — |
| Physics rim radius | ___ m | 0.225 m | ✅/❌ | [if mismatch] |
| Rim tube radius | ___ m | 0.009 m | ✅/❌ | — |
| Collision radius | ___ m | ~0.235 m | ✅/❌ | — |
| SCALE constant | ___ px/m | — | ✅ | — |
| Double inflation | ___ % | 0% | ✅/❌ | [if found] |
| Pixel contamination | [present/absent] | Absent | ✅/❌ | — |
| Double physics | [yes/no] | No | ✅/❌ | [if found] |
| Assist logic | [present/absent] | Absent | ✅/❌ | — |

### Problems Found List

```
❌ PROBLEM 1: [Title]
   Location: [file] Line: [#]
   Code: [snippet]
   Impact: [effect on gameplay]
   Severity: CRITICAL / HIGH / MEDIUM / LOW

❌ PROBLEM 2: [Title]
   Location: [file] Line: [#]
   Code: [snippet]
   Impact: [effect on gameplay]
   Severity: CRITICAL / HIGH / MEDIUM / LOW

... (continue for each problem)
```

### Root Cause Analysis

```
🔴 ROOT CAUSE: [Main issue causing poor performance]
   Chain:
   1. [What causes what]
   2. [What causes what]
   3. [Final effect on ball]
   
   Example:
   1. HOOP_R=27px → visual rim diameter = 54px
   2. 54px / SCALE → 0.81m physics diameter (WRONG!)
   3. Physics rim is 3.6× too large
   4. Ball collides too far from visual rim
   5. Player sees rim but ball bounces off "invisible rim" outside
```

### Recommendation

```
🎯 NEXT STEPS:

1. [Specific fix needed]
   File: [name]
   Line: [#]
   Change: [from] → [to]
   
2. [Specific fix needed]
   File: [name]
   Line: [#]
   Change: [from] → [to]

... (continue)
```

---

## HOW TO USE THIS PROMPT

1. **Read this entire prompt carefully**
2. **Go through PARTS 1-6 in order**
3. **Record ALL findings (numbers, formulas, locations)**
4. **Fill in the Summary Table**
5. **List all Problems Found**
6. **Create Root Cause Analysis**
7. **Provide Recommendations**
8. **Do NOT make any code changes yet**

---

## EXPECTED OUTPUT FORMAT

```
╔════════════════════════════════════════════════════════════════╗
║         🔬 RIM PHYSICS FULL AUDIT REPORT                     ║
║              (Complete diagnostic findings)                   ║
╚════════════════════════════════════════════════════════════════╝

PART 1: VISUAL RIM MEASUREMENT
  HOOP_R = 27 px
  SCALE = 66.67 px/m
  Expected physics radius = 0.405m ❌ (should be 0.225m)

PART 2: ACTUAL PHYSICS RIM
  RIM_RADIUS_M = 0.225 m ✅
  RIM_TUBE_R_M = 0.009 m ✅
  EFFECTIVE_RIM_RADIUS = 0.235 m ✅

PART 3: COLLISION GEOMETRY
  Formula: const EFFECTIVE_RIM_RADIUS = C.RIM_RADIUS_M + RIM_TUBE_HALF + COLLISION_BUFFER
  Double inflation: ❌ NOT FOUND ✅
  Pixel contamination: ❌ NOT FOUND ✅

PART 4: CCD ALGORITHM
  8-point CCD: YES ✅
  Penetration threshold: < 0 ✅

PART 5: DOUBLE PHYSICS
  checkAllCollisions() — Line: 180
  checkGateCollision() — Line: 280
  applyRimImpulse() — Line: 320
  solveContactsWithPGS() — Line: 380
  
  Redundancy check: ✅ NO DOUBLE COLLISION

PART 6: ASSIST LOGIC
  Arcade functions found: ❌ NONE ✅
  Scoring method: Trajectory-based ✅

SUMMARY TABLE
  [Table with all values]

PROBLEMS FOUND
  [List of issues if any]

ROOT CAUSE ANALYSIS
  [Analysis of main issues]

RECOMMENDATIONS
  [What to fix next]
```

---

## TIME ESTIMATE

- Reading code: 5-10 minutes
- Recording measurements: 5 minutes
- Analysis: 5 minutes
- Writing report: 5 minutes
- **Total: 20-30 minutes**

---

## IMPORTANT NOTES

✅ This is **DIAGNOSTIC ONLY** — no code changes
✅ All findings must be **backed by code references** (file + line #)
✅ **Exact formulas** must be copied from actual code
✅ **Numbers** must be measured from actual constants
✅ Use **exact code snippets** as evidence
✅ Be **specific** about what is wrong and where
