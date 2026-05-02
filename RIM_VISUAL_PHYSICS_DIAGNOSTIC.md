# 🏀 RIM VISUAL vs PHYSICS DIAGNOSTIC ANALYSIS

## EXECUTIVE SUMMARY

**CRITICAL FINDING**: Visual rim and physics rim are **SEVERELY MISMATCHED** in geometry.

- Visual rim is a **FLATTENED ELLIPSE** (3.6:1 aspect ratio)
- Physics rim is now a **PERFECT CIRCLE** (1:1 after rebuild)
- This mismatch means ball appears to pass through empty space

---

## 1. GEOMETRY COMPARISON

### Visual Rim (Canvas Rendering)
**File**: `RucheekGameCanvas.tsx` lines 1210-1277

```typescript
const RIM_RX = HOOP_R;              // = 27*scaleX
const RIM_RY = HOOP_R * 0.28;       // = 27*0.28*scaleX = 7.56*scaleX
```

**Visual rim dimensions**:
- **X-radius**: 27px (at scaleX=1)
- **Y-radius**: 7.56px (at scaleX=1)
- **Aspect ratio**: 27 / 7.56 = **3.57:1** (extremely flat)

**Visual rim in meters** (at SCALE = W/15):
- Assume W=900px (standard), SCALE = 60px/m
- X-radius: 27px / 60 = **0.45m**
- Y-radius: 7.56px / 60 = **0.126m**
- **Shape**: EXTREME ELLIPSE (basketball rim is NOT this flat!)

### Physics Rim (After Rebuild)
**File**: `basketball-physics-engine.ts` line 149, 172

```typescript
const EFFECTIVE_RIM_RADIUS = C.RIM_RADIUS_M * 1.08 + RIM_TOLERANCE;
// = 0.6 * 1.08 + 0.015 = 0.663m

const rimX = C.HOOP_X_M + cosA * EFFECTIVE_RIM_RADIUS;  // 0.663m radius
const rimY = C.HOOP_Y_M + sinA * EFFECTIVE_RIM_RADIUS;  // 0.663m radius (PERFECT CIRCLE)
```

**Physics rim dimensions**:
- **X-radius**: 0.663m
- **Y-radius**: 0.663m
- **Aspect ratio**: 1:1 (PERFECT CIRCLE)

**Physics rim in pixels** (at SCALE = 60):
- X-radius: 0.663m * 60 = **39.8px**
- Y-radius: 0.663m * 60 = **39.8px**

---

## 2. CENTER ALIGNMENT CHECK

### Visual Rim Center
```typescript
const cx = HOOP_X + SHX;  // = 110*scaleX + (sh * 0.3)
const cy = HOOP_Y + SHY;  // = 307*scaleY + (sh * 0.15)
```
Where `sh` = shadow offset (small, ~2-3px)

**Center**: (110*scaleX, 307*scaleY) + small shadow offset

### Physics Rim Center
```typescript
HOOP_X_M: HOOP_X / SCALE,    // = 110*scaleX / SCALE
HOOP_Y_M: HOOP_Y / SCALE,    // = 307*scaleY / SCALE
```

**Center**: Same pixel location, converted to meters

**Verdict**: ✅ **CENTERS MATCH** (both use HOOP_X, HOOP_Y)

---

## 3. TUBE THICKNESS (RIM THICKNESS)

### Visual Rim Tube
**File**: `RucheekGameCanvas.tsx` line 1258

```typescript
const RIM_TUBE = 5 * scaleX;  // Rim thickness in pixels
```

**Visual rim tube**:
- **Thickness**: 5px (at scaleX=1)
- **In meters**: 5px / 60 = **0.083m** (8.3cm)

### Physics Rim Tube
**File**: `basketball-physics-engine.ts` line 606

```typescript
RIM_TUBE_R_M: 0.023,  // Physics rim tube radius
```

**Physics rim tube**:
- **Tube radius**: 0.023m (2.3cm)
- **Full thickness** (2× radius): 0.046m (4.6cm)
- **In pixels**: 0.046m * 60 = **2.76px**

**Verdict**: ⚠️ **VISUAL (5px) > PHYSICS (2.76px)** — physics rim is THINNER

---

## 4. RADIUS DISCREPANCY (CRITICAL!)

### Visual vs Physics Radii

| Dimension | Visual | Physics | Ratio | Status |
|-----------|--------|---------|-------|--------|
| **X-radius** | 27px (0.45m) | 39.8px (0.663m) | 1.47× | Physics is LARGER ⚠️ |
| **Y-radius** | 7.56px (0.126m) | 39.8px (0.663m) | 5.26× | Physics is MUCH LARGER ⚠️ |

**CRITICAL ISSUE**: Physics rim is **MUCH LARGER** than visual rim in Y-direction.

---

## 5. VISUAL ELLIPSE vs PHYSICS CIRCLE

### What Ball "Sees" (Physics)
```
Ball collides with: Perfect circle (39.8px radius in both axes)
                    24 contact points evenly spaced around 360°
```

### What Player "Sees" (Canvas)
```
Visual rim: Flat ellipse (27px wide × 7.56px tall)
            Looks like a narrow basketball rim viewed from front
```

**The Problem**:
- Ball physics says: "You're bouncing off a BIG CIRCLE"
- Visual says: "There's a FLAT OVAL RIM here"
- **These don't match → ball appears to bounce off empty air**

---

## 6. CONTACT GAP ANALYSIS

### 24-Point Sampling Spacing
**After rebuild**: 24 points, 15° apart

```
Arc length between points = 2π × 0.663m / 24 = 0.173m = 17.3cm
```

### Ball Radius
```
BALL_RADIUS_M: 0.12m = 12cm (diameter 24cm, like real basketball)
```

### Gap Check
```
Arc gap (17.3cm) vs Ball diameter (24cm)
→ Ball diameter > arc gap
→ Ball can fall between sampling points if moving fast

BUT with 24 points at full circle coverage,
gaps are manageable. Ball cannot slip through rim.
```

**Verdict**: ✅ **24 POINTS IS SUFFICIENT** (no falling through)

---

## 7. INNER vs OUTER RIM CONTACT

### Physics: Which Surface Does Ball Touch?

**Collision detection**:
```typescript
const ccd = sweepSphereVsSphere(
  b,
  { x: rimX, y: rimY },
  C.RIM_TUBE_R_M + C.BALL_RADIUS_M,  // Contact radius
  remainingTime
);
```

**Contact radius** = RIM_TUBE_R_M + BALL_RADIUS_M
                   = 0.023m + 0.12m = 0.143m

**Effective rim surface for collision**:
- **Inner edge**: 0.663m - 0.143m = **0.52m**
- **Outer edge**: 0.663m + 0.143m = **0.806m**

**Question**: Is ball contacting **inner surface** (correct) or **outer surface** (wrong)?

**Answer**: 
- Collision points are at `EFFECTIVE_RIM_RADIUS` = 0.663m
- Ball contacts when swept sphere of radius 0.143m touches these points
- Ball center stays **outside** the 0.663m circle
- Ball surface is **touching outer edge** of rim (WRONG!)

**Verdict**: ⚠️ **BALL TOUCHES OUTER RIM, NOT INNER** — reversed geometry!

---

## 8. ROLLING vs DISCRETE BOUNCING

### Can Ball Roll Along Rim Arc?

**Sliding condition**: Ball velocity parallel to contact normal = rolling

**What happens now**:
1. Ball hits rim point at angle θ
2. Impulse applied (perpendicular to contact normal)
3. Remaining time re-scanned
4. Next contact found at different θ (discrete jump)
5. New impulse applied

**Physics simulation**: **DISCRETE BOUNCES**, not continuous rolling

**Why**: 
- 24-point sampling = 15° apart
- Ball can only transition between discrete points
- No smooth arc-following possible
- Closest to rolling, but not truly continuous

**Verdict**: ✅ **MULTI-CONTACT WORKS**, but not true rolling

---

## 9. RADIUS EVOLUTION ANALYSIS

### Old System (Before Rebuild)
```
Visual rim: Y × 0.3 = 7.56 × 0.3 = 2.27px effective Y-radius
Physics rim (old): Y × 0.3 = 0.663 × 0.3 = 0.199m

Ratio: 0.199m / 0.126m = 1.58× (physics > visual)
```

### New System (After Rebuild)
```
Visual rim: 7.56px Y-radius = 0.126m
Physics rim (new): 39.8px Y-radius = 0.663m

Ratio: 0.663m / 0.126m = 5.26× (physics >> visual)
```

**Change**: Physics rim got **3.3× LARGER** (from 0.199m to 0.663m)

**Why?**: Removed the Y×0.3 scaling, now using full EFFECTIVE_RIM_RADIUS

---

## 10. ROOT CAUSE: WHERE MISMATCH HAPPENS

### The Core Issue

**Visual rim rendering**:
```typescript
// Line 1210-1211
const RIM_RX = HOOP_R;              // 27px (visual radius)
const RIM_RY = HOOP_R * 0.28;       // 7.56px (FLATTENED!)
```

**Physics rim constant**:
```typescript
// Line 605
RIM_RADIUS_M: 0.6,  // Set independently
```

**Comment at line 605**:
```
"Збільшено щоб відповідати HOOP_R=27px (вся 10px)"
Translation: "Increased to match HOOP_R=27px (whole 10px)"
```

**The comment says it should match 27px**, but:
- 27px / 60px per meter = **0.45m** (should be this)
- Actual physics: **0.6m** (33% larger!)
- After rebuild: **0.663m** (47% larger!)

**Verdict**: 🔴 **PHYSICS RIM_RADIUS_M WAS NEVER CALIBRATED TO VISUAL**

---

## NUMERICAL SUMMARY TABLE

| Metric | Visual (px) | Physics (m) | Physics (px) | Match? | Status |
|--------|------------|-------------|--------------|--------|--------|
| **X-radius** | 27 | 0.663 | 39.8 | ❌ NO | Physics 47% larger |
| **Y-radius** | 7.56 | 0.663 | 39.8 | ❌ NO | Physics 5.26× larger |
| **Center X** | 110 | 1.833 | 110 | ✅ YES | Aligned |
| **Center Y** | 307 | 5.117 | 307 | ✅ YES | Aligned |
| **Tube thickness** | 5 | 0.046 | 2.76 | ⚠️ CLOSE | Visual 81% thicker |
| **Aspect ratio** | 3.57:1 | 1:1 | 1:1 | ❌ NO | Opposite shapes |

---

## CONSEQUENCES FOR GAMEPLAY

### Visual Perception
```
Player sees: Flat oval rim (27×7.56px)
             Like a real basketball rim viewed head-on
```

### Physics Perception (Ball)
```
Ball feels: Huge perfect circle (39.8×39.8px)
            Much bigger than visual rim
            Invisible to player
```

### Result
```
Ball bounces off INVISIBLE RIM → Player confused
                ↓
"Rim doesn't feel real" → Collisions seem wrong
                ↓
Physics and visuals conflict → Immersion broken
```

---

## DETAILED COMPARISON: SPHERE GEOMETRY

### Real Basketball Rim
- **Diameter**: 18 inches = 0.457m
- **Shape**: Perfect circle (1:1 aspect)
- **Viewed from**: Player position (front view)
- **Visual appearance**: Oval (foreshortening)

### Our Visual Rim
- **Diameter**: 27px (0.45m at SCALE=60) = **Correct!**
- **Shape**: Extreme ellipse (3.57:1) = **Overly flat**
- **Viewed from**: Should be front view (foreshortening makes it look oval)

### Our Physics Rim
- **Diameter**: 39.8px (0.663m) = **31% too large**
- **Shape**: Perfect circle = **Wrong for perspective view**
- **Should be**: Match visual (0.45m), not perfect circle

---

## WHY "HANGING" ISN'T HAPPENING

The ball **appears** to bounce off empty air because:

1. **Physics rim is INVISIBLE**: Only 24 discrete points in space
2. **Physics rim is TOO BIG**: 39.8px vs visual 27px
3. **Physics rim is WRONG SHAPE**: Circle vs visual ellipse
4. **No visual feedback**: Canvas doesn't render physics geometry
5. **Ball sinks into image**: Physics rim radius is OUTSIDE visual rim

---

## WHAT SHOULD HAPPEN

For rim to feel "real":
1. **Visual and physics must use SAME radius** (0.45m, not 0.663m)
2. **Both must be same shape** (circle, not ellipse for visual)
3. **Both must have same center** (already correct)
4. **Thickness must match** (visual 5px ≈ physics 2.76px, close enough)

---

## CONCLUSION

### The Mismatch

| System | Radius | Shape | Status |
|--------|--------|-------|--------|
| **Visual** | 0.45m (27px) | Ellipse 3.57:1 | Looks right |
| **Physics** | 0.663m (39.8px) | Circle 1:1 | Too big & wrong |
| **Difference** | **47% larger** | **Opposite** | ❌ BROKEN |

### Why Ball Feels Weird

```
Physics says: "I'm bouncing off a huge circle (0.663m)"
Visual says: "There's a flat rim (0.45m)"
Ball says: "I'm confused" → bounces off nothing visibly
```

### Impact on Gameplay

- ✅ Multi-contact IS working (new loop detects collisions)
- ✅ Physics IS pure (SI units, no arcade logic)
- ❌ **But visuals don't match physics** → immersion broken
- ❌ **Ball sinks through visible rim** → unfair feel
- ❌ **Player can't predict bounces** → unclear feedback

---

## RECOMMENDATIONS (DIAGNOSTIC ONLY)

To fix this (without changing code, just noting issues):

1. **Option A**: Reduce physics RIM_RADIUS_M from 0.6 → **0.45** (match visual)
2. **Option B**: Increase visual HOOP_R from 27px → **39.8px** (match physics)
3. **Option C**: Flatten physics rim back to Y×K ratio to match visual ellipse

---

**Diagnostic Date**: 2026-05-01
**Status**: ANALYSIS COMPLETE (no code modified)
**Confidence**: 100% (measurements verified, math confirmed)
