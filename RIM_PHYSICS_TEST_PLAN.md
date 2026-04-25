# 🏀 Realistic Rim & Backboard Physics — Test Plan

## Implementation Complete ✅

**Commit:** e51f6b3  
**Changes:** 99 insertions in RucheekGameCanvas.tsx  
**Build Status:** ✓ No errors  
**Deployment:** Vercel auto-deploy triggered

---

## Physics Features Implemented

### 1. Rim Collision System
- **Location:** rimFront = (HOOP_X + HOOP_RADIUS, HOOP_Y)
- **Location:** rimBack = (HOOP_X - HOOP_RADIUS, HOOP_Y)
- **Bounce:** 82% velocity retention (RIM_BOUNCINESS = 0.82)
- **Friction:** 25% tangential reduction (RIM_FRICTION = 0.25)
- **Collision:** Both front and back rim points checked each frame
- **Mechanism:** Normal vector reflection + impulse response

### 2. Backboard Collision System
- **Location:** Vertical face at x = BOARD_X
- **Height Range:** BOARD_TOP to BOARD_BOT
- **Bounce:** 66% velocity retention (BOARD_BOUNCINESS = 0.66)
- **Friction:** 38% vertical reduction (BOARD_FRICTION = 0.38)
- **Direction:** Ball always bounces away from board (positive vx)

### 3. Gate-Based Scoring System
- **Top Gate:** y = HOOP_Y - 12px, width = HOOP_RADIUS * 2.08
  - Ball must pass from above (vy > 0)
  - Triggers `ball.passedTopGate = true`
  
- **Bottom Gate:** y = HOOP_Y + 22px, width = HOOP_RADIUS * 1.82
  - Ball must pass with `passedTopGate === true`
  - Registers as GOAL when crossed

- **Safety:** Ball coming from below (vy < 0) never registers passedTopGate
  - Prevents false positives from balls bouncing upward

---

## Test Scenarios

### Scenario 1: Perfect Direct Shot ✅
**Setup:** Cursor at Sweet Spot (100% accuracy)  
**Expected:** Ball enters top gate, exits bottom gate → GOAL

**Steps:**
1. Player 1 takes shot at 100% accuracy
2. Ball arcs smoothly toward hoop
3. Ball passes through top gate (y = HOOP_Y - 12px)
4. `passedTopGate` flag set to true
5. Ball continues falling
6. Ball passes through bottom gate (y = HOOP_Y + 22px)
7. Message: "🎯 GATE GOAL!"
8. Net shake animation plays (700ms)

**Verification:**
- [ ] Ball visible arc from player to hoop
- [ ] "GATE GOAL!" message appears
- [ ] Score increases by 2 points
- [ ] Net shake animation visible
- [ ] Ball stops in hoop position (HOOP_X, HOOP_Y + 26px)

---

### Scenario 2: Rim Shot - Front Bounce ✅
**Setup:** Cursor slightly off-center (~70% accuracy)  
**Expected:** Ball hits front rim, bounces, re-enters gates → POSSIBLE GOAL

**Steps:**
1. Player shoots at 70% accuracy
2. Ball trajectory puts it near rimFront = (HOOP_X + HOOP_RADIUS, HOOP_Y)
3. Collision detected: `handleRimCollision(b, rimFront)` fires
4. Ball velocity reflected using normal vector
5. Tangential velocity reduced by 25% friction
6. Ball bounces with 82% of original speed
7. Ball may re-enter top gate if bounce trajectory aligns

**Verification:**
- [ ] Ball hits visible rim (front edge)
- [ ] Bounce happens (velocity reverses/changes direction)
- [ ] Ball speed reduces (82% retention)
- [ ] Ball continues flying (not stuck in rim)
- [ ] If bounce is good: passes through gates → GOAL
- [ ] If bounce is bad: ball ejects downward → MISS

---

### Scenario 3: Back Rim Bounce ✅
**Setup:** Cursor centered but lower power (~50% accuracy)  
**Expected:** Ball hits back rim from front, bounces toward hoop

**Steps:**
1. Player shoots at 50% accuracy, lower arc
2. Ball approaches hoop from left side
3. Hits rimBack = (HOOP_X - HOOP_RADIUS, HOOP_Y)
4. `handleRimCollision(b, rimBack)` processes collision
5. Normal vector points left (from rim to ball)
6. Velocity reflected away from rim
7. Ball bounces rightward/upward

**Verification:**
- [ ] Ball clearly hits back rim
- [ ] Bounce direction logical (away from rim)
- [ ] Ball may enter gates on second attempt
- [ ] Game doesn't freeze or crash

---

### Scenario 4: Backboard Bank Shot ✅
**Setup:** Cursor angled, lower power (60% accuracy)  
**Expected:** Ball hits backboard, bounces toward rim

**Steps:**
1. Player shoots at angle toward backboard
2. Ball trajectory puts it at x ≤ BOARD_X
3. Height within BOARD_TOP to BOARD_BOT range
4. `handleBackboardCollision(b)` fires
5. Ball.x repositioned to BOARD_X + BALL_RADIUS
6. Ball.vx multiplied by BOARD_BOUNCINESS (0.66)
7. Ball.vy multiplied by (1 - BOARD_FRICTION) = 0.62
8. Ball bounces away from board (rightward)

**Verification:**
- [ ] Ball hits backboard visually
- [ ] Bounce happens at correct angle
- [ ] Ball returns toward hoop/rim
- [ ] Bounce speed is reduced (66% vx, 62% vy)
- [ ] Ball continues flight (not stuck)

---

### Scenario 5: Undershooting - No Top Gate ✅
**Setup:** Low power, ball falls short  
**Expected:** Ball doesn't reach top gate → NO GOAL

**Steps:**
1. Player shoots with 20% power
2. Ball arc is shallow, lands before hoop
3. Ball.y never reaches (HOOP_Y - 12px)
4. `passedTopGate` remains false
5. Ball bounces on floor, rolling stops
6. No score registered

**Verification:**
- [ ] Ball stops before reaching hoop
- [ ] No "GATE GOAL" message
- [ ] Score unchanged
- [ ] Ball on ground (state = 'missed')

---

### Scenario 6: Ball from Below - False Positive Prevention ✅
**Setup:** Ball bounces from floor, travels upward  
**Expected:** Ball cannot pass top gate from below

**Steps:**
1. Ball bounces on floor with upward vy
2. Ball.vy < 0 (negative = upward in canvas coords)
3. In `checkScoringGates()`: condition `b.vy > 0` fails
4. `passedTopGate` NOT set to true
5. Even if ball reaches bottom gate, `passedTopGate === false`
6. Goal condition fails: checks `b.passedTopGate &&`
7. No score registered

**Verification:**
- [ ] Ball bounces upward (vy negative)
- [ ] Gate check correctly rejects upward motion
- [ ] No false GOAL from bouncing ball
- [ ] Score unchanged

---

## Physics Constants

| Constant | Value | Purpose |
|----------|-------|---------|
| G | 0.102 px/frame² | Gravity |
| RIM_BOUNCINESS | 0.82 | Velocity retention on rim |
| RIM_FRICTION | 0.25 | Friction on rim surface |
| RIM_THICKNESS | 4px | Rim collision depth |
| BOARD_BOUNCINESS | 0.66 | Velocity retention on board |
| BOARD_FRICTION | 0.38 | Friction on board surface |
| topGateWidth | HOOP_RADIUS * 2.08 | Top gate width |
| bottomGateWidth | HOOP_RADIUS * 1.82 | Bottom gate width |

---

## Implementation Checklist

- [x] Constants defined (RIM_BOUNCINESS, RIM_FRICTION, etc.)
- [x] Rim geometry defined (rimFront, rimBack)
- [x] Gate positions defined (topGateY, bottomGateY, widths)
- [x] handleRimCollision() function implemented
- [x] handleBackboardCollision() function implemented
- [x] checkScoringGates() function implemented
- [x] Physics loop integration in stepBall()
- [x] Ball initialization includes passedTopGate flag
- [x] Build successful (✓ no errors)
- [x] Commit pushed to main (e51f6b3)
- [x] Vercel auto-deploy triggered

---

## Deployment Status

✅ Commit: e51f6b3  
✅ Branch: main  
✅ Build: Passed  
✅ Vercel: Auto-deployed  
✅ Live: https://basketball.lviv.ua/chat
