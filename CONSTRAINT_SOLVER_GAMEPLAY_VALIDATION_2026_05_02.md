# Constraint Solver — Gameplay Validation Guide
**Date:** 2026-05-02  
**Status:** READY FOR TESTING  
**Server:** localhost:3007  

---

## QUICK START

### 1. Verify Build & Server
```bash
npm run build      # Should complete without errors
npm run dev -- --turbo --port 3007  # Start dev server
# Wait 3-4 seconds, then:
curl http://localhost:3007/game  # Should return HTML (not error)
```

### 2. Open Game in Browser
```
http://localhost:3007/game
```

### 3. Run 5 Validation Scenarios
See sections below for each scenario.

---

## EXPECTED CHANGES FROM SOLVER

### What Changed Physically
1. **Impulse Phase:** Unchanged (CCD, rim collision detection, enter/continue dwell)
2. **NEW: Constraint Solver Phase (runs after impulse):**
   - Reads contact manifold from rim contacts detected in CCD
   - Runs 4 PGS iterations per frame
   - Corrects ball velocity/omega to satisfy constraints:
     - Normal: Prevents re-penetration
     - Friction: Gradually removes tangential velocity
     - Rolling: Couples ω to v if rolling condition met

### What This Feels Like
- **More natural contact:** Ball touches rim smoothly (not sharp bounces)
- **Gradual friction:** Tangential velocity removed over solver iterations, not instantly
- **Rolling develops slowly:** ω blends toward v/R ratio over 4+ frames
- **Settling is smoother:** Multiple gentle contacts instead of arcade sticking

---

## VALIDATION SCENARIO 1: SIDE RIM GRAZE

**Setup:** Shoot ball at rim edge, shallow angle (side graze)

**Test:** Stand at left player position, aim ball at right side of rim

**Expected Behavior:**
```
Impact frame:    Ball touches rim side
                 ├─ CCD detects contact
                 ├─ Impulse enters dwell (small upward bounce)
                 └─ Solver runs 4 iterations (friction kicks in)

Frames +1-5:     2-3 sequential rim contacts
                 ├─ Ball slides with grip (looks like tennis ball on court)
                 ├─ Speed decreases per contact
                 └─ Omega (spin) gradually increases

Frames +5-20:    Ball rolls off naturally
                 ├─ May settle in net or bounce backward
                 ├─ Final velocity <0.5 m/s
                 └─ No "stuck" feeling
```

**Pass Criteria:**
- [ ] 2-3 rim contacts (not 1, not 5+)
- [ ] Energy retention 40-70% per contact (not 100% bounce, not 0% dead)
- [ ] Positive omega develops (rolling condition activates)
- [ ] No velocity reversals that don't match physics
- [ ] Ball doesn't "stick" to rim indefinitely

**Fail Indicators:**
- ❌ Ball bounces away sharply (impulse too strong)
- ❌ Ball sticks to rim (velocity → 0 suddenly)
- ❌ Ball orbits hoop (magnetic capture)
- ❌ Only 1 contact (friction not kicking in)
- ❌ 5+ contacts (over-damped oscillation)

---

## VALIDATION SCENARIO 2: FRONT RIM HIT (HIGH SPEED)

**Setup:** Throw ball straight at rim from medium distance, hard power

**Test:** Stand 0.5m from hoop, aim straight at center of rim top, press HARD on power meter

**Expected Behavior:**
```
Impact frame:    Ball flying forward (vx > 0)
                 ├─ Hits rim face
                 ├─ Velocity reverses (vx becomes NEGATIVE)
                 └─ Vertical component becomes upward

Rebound:         Ball bounces away
                 ├─ Speed retained 40-60% (not full bounce, not dead)
                 ├─ Arc: shoots up and away from hoop
                 ├─ Should NOT slow to rolling speed artificially
                 └─ Omega (if any) NOT amplified
```

**Pass Criteria:**
- [ ] Velocity reverses (vx goes negative, vy goes upward)
- [ ] Speed retained 40-60% (e.g., 15 m/s → 6-9 m/s)
- [ ] Vertical rebound >= 1.0 m/s
- [ ] Ball clearly bounces away (not forced to roll)
- [ ] Shot outcome unchanged (if was a make before, still a make)

**Fail Indicators:**
- ❌ Ball barely bounces (v_after < 0.2 m/s)
- ❌ Ball doesn't reverse direction (vx still positive)
- ❌ Ball velocity increases (energy created from nowhere)
- ❌ High-speed shot becomes low-speed rolling shot
- ❌ Omega increases after contact (friction amplified)

---

## VALIDATION SCENARIO 3: SOFT DROP NEAR RIM

**Setup:** Drop ball gently on rim from above (vertical drop)

**Test:** Position player directly above rim (if possible), minimal power

**Expected Behavior:**
```
Drop frame:      Ball falling (vy ~ 2-3 m/s down, vx ~ 0)
                 └─ First contact with rim top

Settling:        Multiple gentle contacts as ball settles
                 ├─ Frame N: First touch (small impulse)
                 ├─ Frame N+k: 2-3 more gentle touches (friction develops)
                 ├─ Each touch slightly slower than last
                 └─ Omega develops toward v/r ratio

Final state:     Ball settles or rolls
                 ├─ Within 1-2 seconds (120-240 frames @ 120Hz)
                 ├─ Final velocity < 0.2 m/s
                 ├─ Omega/velocity ratio approaches rolling (v ≈ ω×R)
                 └─ No rapid oscillation
```

**Pass Criteria:**
- [ ] 2-4 rim contacts (settles gradually)
- [ ] Settles within ~1 second (120 frames)
- [ ] Final velocity < 0.2 m/s (at rest)
- [ ] Omega approaches v/R ratio (smooth rolling)
- [ ] No micro-bouncing or oscillation

**Fail Indicators:**
- ❌ 5+ contacts (won't settle, keeps bouncing)
- ❌ Never settles (trapped in orbit or oscillation)
- ❌ Settles too fast (<20 frames, unrealistic)
- ❌ Final velocity still high (>1 m/s)
- ❌ Rapid velocity changes (oscillating, not smooth)

---

## VALIDATION SCENARIO 4: MULTIPLE RIM CONTACTS

**Setup:** Shoot ball at angle that hits rim 2-4 times before exiting

**Test:** Aim at rim edge, 45° angle, medium power

**Expected Behavior:**
```
Frame N:         Ball approaches at angle
Frame N+k:       First contact (e.g., left rim edge)
                 ├─ Impulse + solver correction
                 ├─ Velocity modified, ball moves right/up
                 └─ Omega may increase from friction coupling

Frame N+j:       Second contact (right rim edge)
                 ├─ Another impulse + solver
                 ├─ Energy decreased from first contact
                 └─ Solver prevents re-penetration

Frame N+K:       Ball exits rim region naturally
                 ├─ Trajectory carries it away
                 ├─ NOT orbiting or trapped
                 └─ Distance from hoop increases
```

**Pass Criteria:**
- [ ] 2-4 rim contacts total (natural trajectory)
- [ ] Each contact reduces remaining energy (no gain)
- [ ] Ball exits naturally (doesn't orbit)
- [ ] No velocity increases during contacts
- [ ] Distance from hoop increases after settling

**Fail Indicators:**
- ❌ 5+ contacts (magnetic capture)
- ❌ Ball velocity increases during contact (energy created)
- ❌ Ball remains <0.2m from hoop after settling
- ❌ Repeated contacts at same location (trapped)
- ❌ Orbital behavior (circles hoop multiple times)

---

## VALIDATION SCENARIO 5: SPIN SHOTS

**Setup:** Shoot with heavy backspin or topspin

**Test:** If game has spin mechanics, launch ball with spin animation

**Expected Behavior:**
```
Launch:          Ball has high omega (~15-20+ rad/s)
                 └─ Initial rotation energy high

Contact:         Ball hits rim
                 ├─ Friction couples spin to translational velocity
                 ├─ Omega slightly decreases (solver dissipates energy)
                 └─ Velocity affected by spin-surface interaction

Settling:        Rolling condition blends in
                 ├─ Omega gradually approaches v/R ratio
                 ├─ NO amplification (omega should decrease or stay same)
                 └─ Natural coupling, not artificial boost
```

**Pass Criteria:**
- [ ] Backspin preserved (not eliminated, still visible)
- [ ] Backspin NOT amplified (no energy creation)
- [ ] Omega decreases naturally (dissipation via damping)
- [ ] Final omega <= initial omega (energy conserved)
- [ ] Rolling develops from friction coupling

**Fail Indicators:**
- ❌ Backspin increased (20 rad/s → 25 rad/s)
- ❌ Ball gains speed from spin (v increased after contact)
- ❌ Spin artificially boosted by friction
- ❌ Non-physical spin coupling (energy from nowhere)
- ❌ Spin affects trajectory in unrealistic way

---

## KEY BEHAVIORAL INDICATORS

### ✅ SIGNS CONSTRAINT SOLVER IS WORKING

**"Ball feels rim as surface"**
- Glancing contacts feel smooth (not sharp jarring)
- Multiple contacts form connected sequence
- No "point collision" sensation

**"Friction develops naturally"**
- Tangential velocity decreases over solver iterations
- At low speeds, transition from bouncing to rolling
- Omega couples to velocity naturally (v ≈ ω×R)

**"Energy is realistic"**
- Each contact reduces speed predictably
- Energy loss ~8-22% per contact (realistic)
- Ball settles within 1-2 seconds

**"High-speed bounces work"**
- Fast shots still bounce away (not forced rolling)
- Vertical rebound clear and strong
- Direction reverses naturally

---

### ❌ SIGNS OF PROBLEMS

**"Ball sticks to rim"**
- Ball becomes stationary on rim
- Multiple repeated contacts at same point
- Can't escape hoop region

**"Forced rolling boost"**
- Omega increases from contact (should decrease/stay same)
- Ball velocity increases (energy from nowhere)
- Backspin amplified unnaturally

**"Magnetic capture"**
- Ball orbits hoop for 5+ contacts
- Velocity doesn't decrease
- Shot fairness affected (should-be misses become makes)

**"Over-damping"**
- Ball loses all energy in one contact
- Never develops rolling
- Bounces become tiny micro-bounces

---

## HOW TO DEBUG IF ISSUES OCCUR

### 1. Check Solver is Running
In browser console, add debug output:
```javascript
// In basketball-physics-engine.ts, solveContactsWithPGS():
console.log(`[Solver] Iteration ${iter}: manifold ${manifold.length} contacts`);
```

### 2. Check Contact Manifold
```javascript
console.log(`[Manifold] Penetration: ${pt.penetration.toFixed(4)}, vn: ${pt.separation_v.toFixed(2)}`);
```

### 3. Check Solver Convergence
```javascript
console.log(`[Constraint] J_n=${J_n.toFixed(4)}, J_t=${J_t.toFixed(4)}, J_ω=${J_ω.toFixed(4)}`);
```

### 4. Check Ball State After Solver
```javascript
console.log(`[Post-Solver] vx=${b.vx.toFixed(2)}, vy=${b.vy.toFixed(2)}, ω=${b.omega.toFixed(2)}`);
```

---

## PARAMETER ADJUSTMENTS (if needed)

If testing reveals issues, adjust these in `solveContactsWithPGS()`:

**Too bouncy (ball won't settle):**
```typescript
iterations: 4 → 6    // More solver iterations
bias: -0.8 → -1.0   // Stronger separation bias
mu_rim: 0.65 → 0.75 // More friction
```

**Too sticky (ball settles too fast):**
```typescript
iterations: 4 → 3    // Fewer iterations
bias: -0.8 → -0.5   // Weaker separation bias
mu_rim: 0.65 → 0.55 // Less friction
```

**Spinning issues (backspin amplified):**
```typescript
// In rolling constraint section:
J_ω_influence: 0.35 → 0.15  // Weaker spin coupling
```

---

## VALIDATION CHECKLIST

### Before Testing
- [ ] Build succeeds without errors
- [ ] Dev server runs at localhost:3007
- [ ] Game page loads (http://localhost:3007/game)
- [ ] Canvas renders properly
- [ ] Player can aim and shoot

### During Testing
- [ ] Run Scenario 1: Side rim graze (5 shots)
- [ ] Run Scenario 2: Front rim hit high speed (5 shots)
- [ ] Run Scenario 3: Soft drop (3 shots)
- [ ] Run Scenario 4: Multiple contacts (5 shots)
- [ ] Run Scenario 5: Spin shots (5 shots)

### After Testing
- [ ] Record pass/fail for each scenario
- [ ] Note any unexpected behaviors
- [ ] Compare to expected behavior section above
- [ ] Identify if adjustments needed

### Decision
- ✅ **All 5 scenarios pass:** Physics fix is behavior-correct → ready for Vercel deployment
- ⚠️ **Some issues:** Adjust parameters (iterations, bias, friction) and retest
- ❌ **Major problems:** Debug solver, check integration, verify manifold building

---

**Next Step:** Open http://localhost:3007/game and run scenarios. Report results and any issues.

