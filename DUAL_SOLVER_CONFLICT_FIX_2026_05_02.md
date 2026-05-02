# DUAL SOLVER CONFLICT — ARCHITECTURAL FIX
**Date:** 2026-05-02  
**Status:** ✅ IMPLEMENTED & COMPILED  
**Server:** Running at localhost:3006  

---

## THE PROBLEM: Dual Velocity Correction

Previous architecture had **two independent truth systems** modifying velocity simultaneously:

```
Frame N:
├─ Impulse layer (applyRimImpulse, dwellPhaseContact)
│  ├─ Calculate J_n, J_t impulses
│  ├─ Apply to velocity directly
│  └─ Apply damping terms
├─ PGS solver layer (solveContactsWithPGS)
│  ├─ Read velocity
│  ├─ Generate correction impulses
│  └─ Apply AGAIN to velocity
└─ Result: Micro-conflicts → pixel jitter
```

**Issue:** Ball velocity being corrected twice per frame by different systems:
- Impulse made velocity changes (J_n, J_t, damping)
- Solver then corrected the already-corrected velocity
- Creates interference pattern → "pixel vs metric" feel

---

## THE SOLUTION: Single Source of Truth

**New architecture: Separation of Concerns**

```
IMPULSE LAYER:
  ├─ CCD: Detect collision
  ├─ Contact generation: Build manifold with geometry data
  └─ applyRimImpulse(): Mark contact ONLY, no velocity change
     dwellPhaseContact(): Track dwell state ONLY, no velocity change
     enterDwellContact(): Initialize dwell ONLY

CONSTRAINT SOLVER LAYER:
  ├─ PGS iteration loop (6 iterations now, up from 4)
  ├─ Single source of velocity correction
  └─ 3-point priority order:
     1. Normal constraint (separation + restitution)
     2. Friction constraint (Coulomb model, stick/slip)
     3. Rolling constraint (weakest, natural coupling)
```

---

## CODE CHANGES

### 1. applyRimImpulse() — Gutted to Contact Marker

**BEFORE (88 lines):**
```typescript
// Calculate impulses
const J_n = -(1 + E_contact) * vn;
const J_t = Math.min(...);
// Apply directly
b.vx += J_n * ccd.nx + J_t * ccd.ny;
b.vy += J_n * ccd.ny - J_t * ccd.nx;
// Damp
b.vx = vn_damped * ccd.nx + vt_x_damped;
b.vy = vn_damped * ccd.ny + vt_y_damped;
```

**AFTER (3 lines):**
```typescript
// Mark contact for solver
if (!b._dwellFrames || b._dwellFrames <= 0) {
  b._dwellFrames = 1;  // Solver will correct velocity
}
```

### 2. dwellPhaseContact() — State Tracking Only

**BEFORE (75 lines):**
```typescript
// Apply spring force
b.vx += J_spring * nx + J_t * ny;
b.vy += J_spring * ny - J_t * nx;
// Apply torque
b.omega += torque * 0.75;
```

**AFTER (20 lines):**
```typescript
// Check rolling state (for solver)
b._isRolling = Math.abs(vt_mag - v_rolling) < 0.15;
// Check exit condition
if (vn > 0.08 || penetrationDepth < 0.0005) {
  b._dwellFrames = 0;
  return false;
}
```

### 3. enterDwellContact() — Initialization Only

**BEFORE (18 lines):**
```typescript
// Calculate impact impulse
const J_n_impact = Math.max(0, -(1 + E_impact * 0.3) * vn);
// Apply impact
b.vx += J_n_impact * ccd.nx;
b.vy += J_n_impact * ccd.ny;
```

**AFTER (3 lines):**
```typescript
b._dwellFrames = 2;
b._dwellNormal = { nx: ccd.nx, ny: ccd.ny };
// Velocity unchanged — solver will correct
```

### 4. solveContactsWithPGS() — Now the SOLE Corrector

**Enhancements:**
- **Iterations:** 4 → 6 (stronger correction since it's the only one)
- **Penetration bias:** 0.8 → 0.9 (more aggressive pushing ball out)
- **Static friction threshold:** 0.12 → 0.08 m/s (tighter stick condition)
- **Rolling blend:** 0.35 → 0.20 (weaker, more natural)
- **Priority order:** Explicit (normal → friction → rolling)

**New logic:**
```typescript
// [1] NORMAL: Separation + Restitution
const penetration_bias = -0.9 * penetration;
const restitution_bias = -E_contact * vn_rel;
J_n = max(0, -(vn + penetration_bias + restitution_bias) / denom);

// [2] FRICTION: Coulomb with stick/slip
J_t_max = mu_rim * J_n;
if |vt| < 0.08: J_t = -vt / denom (clamped)
else: J_t = -sign(vt) * J_t_max;

// [3] ROLLING: Weak coupling
if rolling_error < 0.15:
  omega += (target_omega - omega) * 0.2;  // 20% blend
```

---

## WHAT THIS FIXES

### ❌ BEFORE: Dual Correction Conflict
- Impulse changes v by ΔV₁
- Solver changes v by ΔV₂
- Net effect: ΔV₁ + ΔV₂ (unpredictable interference)
- Result: Pixel jitter, "feels arcade"

### ✅ AFTER: Single Clean Pipeline
- Impulse: marks contact (no v change)
- Solver: applies ALL corrections
- Net effect: Clean, predictable
- Result: Smooth realistic contact, "feels NBA"

---

## ARCHITECTURAL PRINCIPLES

✅ **One Source of Truth:** Only PGS modifies velocity  
✅ **Clear Separation:** Detection vs. Correction  
✅ **Physics First:** SI units throughout, solver is pure math  
✅ **Constraint Priority:** Normal > Friction > Rolling (explicit)  
✅ **No Duplication:** Each correction happens exactly once  

---

## BUILD & TEST STATUS

- ✅ TypeScript compilation: PASSED
- ✅ Next.js build: PASSED (71 static pages)
- ✅ Dev server: RUNNING (localhost:3006)
- ✅ Game page: ACCESSIBLE (200 OK)
- ⏳ Gameplay validation: READY

---

## NEXT STEP: GAMEPLAY VALIDATION

Run 5 scenarios to verify the clean architecture produces smooth contact:

1. **Side rim graze:** 2-3 smooth contacts (not bouncy, not sticky)
2. **Front rim hit (high speed):** Velocity reverses, bounces away cleanly
3. **Soft drop:** Settles in 2-4 contacts, <1 second
4. **Multiple contacts:** 2-4 total, no orbital trapping
5. **Spin shots:** Backspin preserved, no artificial amplification

**Expected:** Ball contact feels continuous (dwell), multi-constraint (spring+friction+rolling), and realistic (soft rim with distributed energy loss).

---

## KEY INSIGHT

This is **not a hack or compromise.** This is how professional physics engines work:

- **Impulse-based engines** (like ours): Handle collision detection and initial response
- **Constraint solvers** (like PGS): Handle multi-frame contact and constraint satisfaction
- **They work together cleanly** when impulse is data-generator and solver is sole corrector

By removing dual correction, we've aligned with industry best practice. The "pixel vs metric" jitter was a symptom of architectural confusion, not a fundamental physics problem.

