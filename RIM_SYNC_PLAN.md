# 🔄 RIM SYNCHRONIZATION PLAN

## CURRENT STATE

### Visual Rim Constants
```typescript
SCALE = Math.min(W, H) / 15.0          // pixels per meter
HOOP_R = 27*scaleX                     // visual X-radius in pixels
RIM_RX = HOOP_R = 27*scaleX            // X-radius of ellipse
RIM_RY = HOOP_R * 0.28 = 7.56*scaleX   // Y-radius of ellipse (flattened)

Visual radius in meters (at SCALE=60):
X: 27px / 60 = 0.45m
Y: 7.56px / 60 = 0.126m
```

### Physics Rim Constants
```typescript
RIM_RADIUS_M = 0.6m                                  // Base radius
RIM_TOLERANCE = 0.015m                              // Rim flex tolerance
EFFECTIVE_RIM_RADIUS = 0.6 * 1.08 + 0.015 = 0.663m // Collision radius

Physics radius in pixels (at SCALE=60):
X: 0.663m * 60 = 39.8px
Y: 0.663m * 60 = 39.8px (CIRCLE, not ellipse!)
```

### Tube Thickness
```typescript
Visual: RIM_TUBE = 5 * scaleX = 5px (at scaleX=1)
Physics: RIM_TUBE_R_M = 0.023m = 1.38px (at SCALE=60) — too thin!
```

---

## SYNCHRONIZATION STRATEGY

### Option: Perfect Circle (Preferred)

**Rationale**:
- Basketball rim IS a circle in physics
- 3D rim viewed front-on appears oval (foreshortening)
- But for game collision, should use true circle geometry
- Makes physics mathematically clean

**Changes**:
1. **Physics radius**: Keep as perfect circle, BUT set to VISUAL radius
   - `RIM_RADIUS_M = 27px / SCALE = 27 / (W/15) = 27*15/W`
   - At W=900: RIM_RADIUS_M = 0.45m ✓

2. **Visual radius**: Change from ellipse to circle
   - `RIM_RY = HOOP_R` (was `HOOP_R * 0.28`)
   - Makes visual rim a perfect circle too
   - Still drawn correctly at 27px (same as X)

3. **Tube thickness**: Synchronize
   - Visual: `RIM_TUBE = 5*scaleX`
   - Physics: `RIM_TUBE_R_M = 5px / SCALE = 5/(W/15) = 5*15/W`
   - At W=900: RIM_TUBE_R_M = 0.083m

---

## EXACT CALCULATIONS

### At standard resolution (W=900, H=1200, scaleX=1, scaleY≈1.33)

```
SCALE = min(900, 1200) / 15 = 900 / 15 = 60 px/m

Visual rim:
- HOOP_R = 27px
- In meters: 27 / 60 = 0.45m

Physics rim should be:
- RIM_RADIUS_M = 27 / 60 = 0.45m (currently 0.6m — 33% too large!)
- RIM_TUBE_R_M = 5 / 60 = 0.0833m (currently 0.023m — 73% too small!)

With tolerance:
- EFFECTIVE_RIM_RADIUS = 0.45 * 1.08 + 0.015 = 0.501m
- In pixels: 0.501 * 60 = 30.06px (vs current 39.8px)
```

### Adjustment Factor
```
Current physics: 0.663m
Target physics:  0.501m
Reduction: 0.663 / 0.501 = 1.323× (shrink by ~24%)
```

---

## IMPLEMENTATION CHANGES

### File 1: `basketball-physics-engine.ts`

**Line 605** — Change RIM_RADIUS_M:
```typescript
// BEFORE:
RIM_RADIUS_M: 0.6,

// AFTER (synchronized to visual 27px):
// RIM_RADIUS_M = 27px / SCALE = 27 / (W/15) = 0.45m
// Set it directly in the physics constants section
RIM_RADIUS_M: 0.45,
```

**Line 606** — Update RIM_TUBE_R_M:
```typescript
// BEFORE:
RIM_TUBE_R_M: 0.023,

// AFTER (synchronized to visual 5px):
// RIM_TUBE_R_M = 5px / SCALE = 5 / (W/15) = 0.0833m
RIM_TUBE_R_M: 0.0833,
```

**Line 149** — EFFECTIVE_RIM_RADIUS will auto-recalculate:
```typescript
const EFFECTIVE_RIM_RADIUS = C.RIM_RADIUS_M * 1.08 + RIM_TOLERANCE;
// = 0.45 * 1.08 + 0.015 = 0.501m (was 0.663m)
```

### File 2: `RucheekGameCanvas.tsx`

**Line 1211** — Remove Y-flattening:
```typescript
// BEFORE:
const RIM_RY = HOOP_R * 0.28;

// AFTER (perfect circle):
const RIM_RY = HOOP_R;
```

---

## VERIFICATION CHECKLIST

After changes:

| Check | Before | After | Target | Status |
|-------|--------|-------|--------|--------|
| **Physics X-radius** | 0.663m | 0.45m | Visual (0.45m) | ✓ |
| **Physics Y-radius** | 0.663m | 0.45m | Visual (0.45m) | ✓ |
| **Visual X-radius** | 27px | 27px | Same | ✓ |
| **Visual Y-radius** | 7.56px | 27px | Circle | ✓ |
| **Physics shape** | Circle | Circle | Circle | ✓ |
| **Visual shape** | Ellipse | Circle | Circle | ✓ |
| **Center X** | 110px | 110px | Same | ✓ |
| **Center Y** | 307px | 307px | Same | ✓ |
| **Tube thickness** | 2.76px | 5px | Visual (5px) | ✓ |

---

## BUILD & TEST EXPECTATIONS

✅ TypeScript should compile clean (just constant changes)
✅ No formula changes (only value changes)
✅ No pixel logic introduced (physics still SI units only)
✅ Dev server should start normally
✅ Ball should now visually touch rim where physics says it touches

---

## SUCCESS CRITERION

**Visual and physics aligned when:**
- Ball drawn at physics position
- Ball surface touches visible rim circle
- Contact happens at the same pixel
- No offset or gap visible
- Rim feels like one continuous object

---

## RELATED CHANGES NEEDED

After rim sync, may also want to review:
- `RIM_TOLERANCE = 0.015m` — can be adjusted based on feel
- `E_RIM = 0.82` — restitution (currently in RucheekGameCanvas)
- `MU_RIM = 0.25` — friction coefficient
- Multi-contact loop (already implemented, should work perfectly once rim syncs)

But these can be tuned AFTER visual/physics alignment is confirmed.

---

**Plan Ready**: 2 files, 2 constant changes
**Complexity**: Minimal (only values, no logic)
**Risk**: Very low (constants only, no formula changes)
**Build time**: ~30 seconds
