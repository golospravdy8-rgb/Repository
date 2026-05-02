# CONSTRAINT SOLVER OVERLAY — ARCHITECTURE DESIGN
**Date:** 2026-05-02  
**Status:** DESIGN PHASE (ready for implementation)  
**Principle:** "Physics = TRUTH. Impulse = baseline. Constraints = post-correction overlay."

---

## EXECUTIVE SUMMARY

Current architecture uses **event-based impulse physics**: each rim contact generates one impulse, ball state updates once, frame advances. This creates "arcade" feel because:
- Contact treated as instantaneous point event, not continuous dwell
- Single impulse can't balance competing forces (bounce vs friction vs rolling)
- No mechanism to enforce rolling condition (v_tangent ≈ ω×R)
- Spin/friction coupling happens via torque approximation, not constraint satisfaction

**Solution:** Add a **parallel constraint solver layer** (Projected Gauss-Seidel / PGS) that:
1. Runs **after** impulse physics (non-invasive)
2. Takes rim contacts as input (from existing `checkAllCollisions`)
3. Outputs correction impulses for rolling, friction, contact stability
4. Integrates corrections into ball velocity/omega
5. Never modifies core impulse engine — purely post-processing

**Result:** Ball behavior becomes continuous (dwell), multi-constraint (spring + friction + rolling), and realistic (soft rim contact with energy damping).

---

## ARCHITECTURE DIAGRAM

```
┌─────────────────────────────────────────────────────────────────┐
│                     PHYSICS LOOP (120 Hz)                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  [1] INTEGRATION PHASE (unchanged)                              │
│      ├─ integratePhysics(b, dt, C)  → gravity + velocity update │
│      └─ checkAllCollisions(b, C)    → returns contact list      │
│                                                                   │
│  [2] IMPULSE PHYSICS PHASE (unchanged)                          │
│      ├─ For each contact:                                        │
│      │  ├─ computeRimCollision(b, ccd, C)                       │
│      │  ├─ applyRimImpulse(b, C)     → vx,vy,omega updated     │
│      │  └─ Track _dwellFrames, _contactRimAngle                 │
│      └─ Result: ball state after rebound logic                  │
│                                                                   │
│  [3] CONSTRAINT SOLVER PHASE (NEW)                              │
│      ├─ buildContactManifold(contacts) → 2-4 constraint points  │
│      ├─ FOR 4-8 PGS iterations:                                 │
│      │  ├─ solveContactConstraints()   → normal impulse         │
│      │  ├─ solveFrictionConstraints()  → tangential impulse     │
│      │  └─ solveRollingConstraint()    → ω vs v/R coupling      │
│      ├─ applyConstraintCorrections(J_n, J_t)  → final v, ω      │
│      └─ Result: smooth multi-constraint contact behavior        │
│                                                                   │
│  [4] RENDER PHASE (unchanged)                                   │
│      └─ Draw ball with corrected position/rotation              │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘

Key: Constraint solver processes OUTPUT of impulse engine,
     does NOT modify impulse inputs or bypass CCD/collision detection.
```

---

## CONSTRAINT SOLVER DESIGN

### Contact Manifold (Input to Solver)

```typescript
interface ContactManifoldPoint {
  x: number;              // Contact point on rim (world space)
  y: number;
  nx: number;             // Contact normal (rim→ball)
  ny: number;
  penetration: number;    // > 0 = ball overlapping rim
  vx_rel: number;         // Relative velocity at contact (ball - rim_surface)
  vy_rel: number;
  separation_v: number;   // vn_rel = (vx_rel·nx + vy_rel·ny)
}

interface ContactManifold {
  points: ContactManifoldPoint[];  // 1-4 contact points per rim segment
  rimAngle: number;               // For continuous angle tracking
  dwellFrames: number;            // How many frames in contact
}
```

### Constraint Types

#### 1. **Contact Constraint (Separation Constraint)**
Goal: Prevent penetration, enforce e (restitution)

```
Constraint: vn >= -e·vn_old   (separation velocity must be positive or small rebound)
Solver: J_n = max(0, -vn_relative - e·vn_old_bias) / (inv_mass + inv_inertia·r_cross_n²)
Apply: v_new = v_old + J_n·n / mass
       ω_new = ω_old + J_n·r×n / inertia
```

#### 2. **Friction Constraint (Coulomb Model)**
Goal: Limit tangential velocity via friction coefficient

```
Max friction impulse: J_t_max = μ·J_n
Tangential velocity: vt = (vx·tx + vy·ty)  where t = [-ny, nx]
Constraint: |vt| <= μ·vn_relative (or vt → 0 if settling)
```

If rolling (v_tangent ≈ ω×R):
- J_t = 0 (no slipping, no friction)

If static (v_tangent < 0.12):
- J_t = -vt_relative·inv_mass / denom  (remove tangential motion)

If kinetic (v_tangent >= 0.12):
- J_t = -sign(vt)·μ·J_n  (kinetic friction cap)

#### 3. **Rolling Constraint (Spinning Condition)**
Goal: Couple rotation to translational velocity: ω·R ≈ v_tangent

```
Constraint: ω·R = v_tangent  (ball rolls without slip)
Error: e_roll = |ω·R - v_tangent|  (should be ~0)

If NOT rolling (e_roll > 0.15):
  Skip this constraint (ball is bouncing/sliding)

If rolling (e_roll < 0.15):
  J_ω = (target_ω - ω) / (inv_inertia)  with blending
  ω_new = ω_old + J_ω·0.35  (35% influence per iteration)
```

---

## IMPLEMENTATION STEPS

### Step 1: Build Contact Manifold from Collision Results

```typescript
function buildContactManifold(
  b: BallStateM,
  contacts: CollisionResult[],
  C: PhysicsConstantsM
): ContactManifold[] {
  const manifolds: ContactManifold[] = [];
  
  for (const contact of contacts) {
    if (!contact.isRim) continue;
    
    // Get contact point on rim
    const contactPt = findContinuousContactPoint(b, contact, C);
    
    // Calculate penetration depth
    const penetration = calculatePenetrationDepth(b, contactPt, C);
    if (penetration < 0.0001) continue;  // Skip negligible penetration
    
    // Calculate relative velocity at contact
    const r_x = contactPt.x - b._x_m;
    const r_y = contactPt.y - b._y_m;
    const vx_rel = b.vx + b.omega * (-r_y);  // v + ω × r
    const vy_rel = b.vy + b.omega * r_x;
    
    // Normal (outward from rim)
    const dist = Math.sqrt(r_x*r_x + r_y*r_y) || 1;
    const nx = r_x / dist;
    const ny = r_y / dist;
    const vn = vx_rel * nx + vy_rel * ny;
    
    manifolds.push({
      points: [{
        x: contactPt.x,
        y: contactPt.y,
        nx, ny,
        penetration,
        vx_rel, vy_rel,
        separation_v: vn
      }],
      rimAngle: contact.rimAngle || b._contactRimAngle || 0,
      dwellFrames: b._dwellFrames || 0
    });
  }
  
  return manifolds;
}
```

### Step 2: PGS Solver Loop (4-8 iterations)

```typescript
function solveContactsWithPGS(
  b: BallStateM,
  manifolds: ContactManifold[],
  C: PhysicsConstantsM,
  iterations: number = 4
): void {
  for (let iter = 0; iter < iterations; iter++) {
    for (const manifold of manifolds) {
      for (const pt of manifold.points) {
        // ==================== CONTACT NORMAL ====================
        const vn_relative = pt.separation_v;
        const bias = -0.8 * Math.max(0, pt.penetration - 0.001) / (1/C.BALL_MASS);
        const J_n_num = -(vn_relative + bias);
        
        const r_x = pt.x - b._x_m;
        const r_y = pt.y - b._y_m;
        const r_cross_n = r_x * (-pt.ny) - r_y * pt.nx;  // r × n
        
        const inv_inertia = 1 / (0.4 * C.BALL_MASS * C.BALL_RADIUS_M * C.BALL_RADIUS_M);
        const denom = 1/C.BALL_MASS + r_cross_n*r_cross_n*inv_inertia;
        
        const J_n = Math.max(0, J_n_num / denom);  // Clamp to non-negative
        
        // Apply normal impulse
        b.vx += J_n * pt.nx / C.BALL_MASS;
        b.vy += J_n * pt.ny / C.BALL_MASS;
        b.omega += J_n * r_cross_n * inv_inertia;
        
        // ==================== FRICTION TANGENT ====================
        const tx = -pt.ny;  // Tangent = rotate normal 90°
        const ty = pt.nx;
        
        const vx_rel_new = b.vx + b.omega * (-r_y);
        const vy_rel_new = b.vy + b.omega * r_x;
        const vt_relative = vx_rel_new * tx + vy_rel_new * ty;
        
        const mu_rim = 0.65;  // Friction coefficient
        const J_t_max = mu_rim * J_n;
        
        let J_t = 0;
        if (Math.abs(vt_relative) < 0.12) {
          // Static friction: remove tangential motion
          J_t = -vt_relative / denom;
          J_t = Math.max(-J_t_max, Math.min(J_t_max, J_t));
        } else {
          // Kinetic friction: cap at μ·J_n
          J_t = -Math.sign(vt_relative) * J_t_max;
        }
        
        // Apply friction impulse
        b.vx += J_t * tx / C.BALL_MASS;
        b.vy += J_t * ty / C.BALL_MASS;
        b.omega += J_t * r_cross_n * inv_inertia;
        
        // ==================== ROLLING CONSTRAINT ====================
        // Only if ball is in "rolling" state (low relative velocity)
        const vt_mag = Math.sqrt(vx_rel_new*vx_rel_new + vy_rel_new*vy_rel_new);
        const v_rolling = Math.abs(b.omega) * C.BALL_RADIUS_M;
        
        if (Math.abs(vt_mag - v_rolling) < 0.15 && vt_mag > 0.05) {
          // Ball should be rolling: enforce ω·R ≈ v_tangent
          const target_omega = vt_mag / C.BALL_RADIUS_M;
          const J_ω = (target_omega - b.omega) / (inv_inertia * 0.5);  // Weak coupling
          b.omega += J_ω * 0.35;  // 35% correction per iteration
        }
      }
    }
  }
}
```

### Step 3: Integration into Physics Loop

In `stepPhysics()`, after `checkAllCollisions()`:

```typescript
export function stepPhysics(b: BallStateM, C: PhysicsConstantsM, dt: number = 1/120): void {
  // [1] INTEGRATION
  integratePhysics(b, dt, C);
  
  // [2] IMPULSE PHYSICS (existing)
  checkAllCollisions(b, C);
  // ... (rim collision, backboard, etc. — all unchanged)
  
  // [3] CONSTRAINT SOLVER (NEW)
  const collisionContacts = extractContactsFromDwell(b, C);
  if (collisionContacts.length > 0) {
    const manifolds = buildContactManifold(b, collisionContacts, C);
    solveContactsWithPGS(b, manifolds, C, 4);  // 4 iterations
  }
  
  // [4] RENDER
  // (ball position already updated by solver)
}
```

---

## DWELL PHASE INTEGRATION

The constraint solver is **especially valuable** during dwell contact (when `_dwellFrames > 0`):

**Without Solver:**
- Contact loses energy too fast (single impulse)
- Friction direction changes abruptly
- Rolling doesn't develop smoothly

**With Solver:**
- Spring force distributed over 4+ solver iterations per frame
- Friction magnitude changes gradually as relative velocity decreases
- Rolling constraint smoothly blends velocity and omega

**Dwell Contact → Constraint Solver Loop:**
```
Frame N:   Ball touches rim → enterDwellContact()
           _dwellFrames = 20 (20 frames of contact)
Frame N+1-20: dwellPhaseContact() → _dwellFrames counts down
             BUT solver now handles spring + friction + rolling
             Instead of hand-coded forces
```

**Modified dwellPhaseContact:**
```typescript
function dwellPhaseContact(
  b: BallStateM,
  rimContact: any,
  C: PhysicsConstantsM
): void {
  // [OLD] Manual spring + friction (being replaced)
  // const spring_force = penetration * K_spring
  // const friction = ... hand-coded
  
  // [NEW] Solver handles it
  // This function now just:
  // - Updates _dwellFrames countdown
  // - Tracks contact point continuity
  // - Exits dwell when appropriate
  
  b._dwellFrames = (b._dwellFrames || 0) - 1;
  
  if (b._dwellFrames <= 0) {
    // Exit dwell when:
    // - Contact normal velocity > 0 (separating)
    // - Penetration < threshold
    const vn = b.vx * rimContact.normal.x + b.vy * rimContact.normal.y;
    if (vn > 0.08) {
      b._dwellFrames = 0;
      b._dwellNormal = undefined;
    }
  }
}
```

---

## PARAMETER TUNING GUIDE

### Solver Iterations
```
iterations = 4:  Fast (16.7ms frame time), less stable
iterations = 8:  Slow (costly), very stable, over-damped
iterations = 4-6: Recommended for 120Hz physics
```

### Spring Stiffness (via penetration bias)
```
Current: bias = -0.8 * penetration
Lower bias (0.3-0.5): Softer contact, longer dwell, smoother
Higher bias (0.9-1.2): Harder contact, quicker rebound, bouncy
```

### Friction Coefficient
```
MU_RIM = 0.65:  Realistic (basketball on metal)
0.40-0.50:      Slippery rim (low friction)
0.80-1.00:      Sticky rim (high friction, forces rolling)
```

### Rolling Tolerance
```
tolerance = 0.15 m/s:  Current, allows 15% slip before enforcing rolling
tolerance = 0.10:      Stricter rolling enforcement (more arcade)
tolerance = 0.20:      Looser (ball rolls earlier, settles faster)
```

---

## VALIDATION CHECKLIST

### Phase 1: Build & Compile
- [ ] TypeScript compiles without errors
- [ ] Dev server runs at localhost:3007
- [ ] No runtime crashes on ball launch

### Phase 2: Manifold Building
- [ ] Contact manifold correctly identifies rim contact points
- [ ] Penetration depth calculated from real geometry
- [ ] Relative velocity at contact matches ball state

### Phase 3: Solver Convergence
- [ ] PGS iterations reduce contact constraint errors
- [ ] After 4 iterations, penetration should be ~0
- [ ] Impulses should decrease with iterations (convergence)

### Phase 4: Gameplay Behavior
- **Scenario 1: Side Rim Graze**
  - [ ] 2-3 contacts (not 1, not 5+)
  - [ ] Energy retention 40-70%
  - [ ] Smooth rolling transition
  
- **Scenario 2: Front Rim Hit (High Speed)**
  - [ ] Velocity reverses
  - [ ] Bounces away (not forced to roll)
  - [ ] 40-60% speed retention
  
- **Scenario 3: Soft Drop**
  - [ ] Settles in 2-4 contacts
  - [ ] <1 second settling time
  - [ ] Final velocity <0.2 m/s
  
- **Scenario 4: Multiple Contacts**
  - [ ] 2-4 total rim contacts
  - [ ] No orbital trapping
  - [ ] Energy decreases per contact
  
- **Scenario 5: Spin Shots**
  - [ ] Backspin preserved
  - [ ] No artificial amplification
  - [ ] Rolling develops naturally

---

## IMPLEMENTATION ORDER

1. **Step 1:** Add ContactManifoldPoint, ContactManifold interfaces
2. **Step 2:** Implement buildContactManifold()
3. **Step 3:** Implement solveContactsWithPGS() core loop
4. **Step 4:** Integrate into stepPhysics() after impulse phase
5. **Step 5:** Test compile and basic gameplay
6. **Step 6:** Adjust parameters (iterations, friction, bias) based on gameplay
7. **Step 7:** Run 5 validation scenarios
8. **Step 8:** Commit and document

---

## KEY PRINCIPLES HONORED

✅ **Physics = TRUTH:** Constraint solver is based on real physics (PGS, SI units, spring-damper)  
✅ **No Impulse Bypass:** Existing collision detection and impulse engine untouched  
✅ **Post-Processing Only:** Solver runs after impulse phase, corrects to enforce constraints  
✅ **Deterministic:** Given same input, produces same output (no randomness)  
✅ **Scalable:** 2-4 contact points, 4-8 iterations, easily tunable  
✅ **Dwell Integration:** Solver naturally handles multi-frame contact via constraint iteration  

---

**Next Step:** Implement buildContactManifold() and solveContactsWithPGS() in basketball-physics-engine.ts, then integrate into stepPhysics() flow.

