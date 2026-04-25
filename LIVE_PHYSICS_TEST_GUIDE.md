# 🏀 Live Physics Testing Guide

## How to Test the Realistic Rim & Backboard Physics

**Site:** https://basketball.lviv.ua/chat  
**Commit:** e51f6b3  
**Date:** 2026-04-25

---

## Setup

1. Open https://basketball.lviv.ua/chat in browser
2. Wait for game to load (may take 5-10 seconds)
3. Click "+ Додати" (Add Player)
4. Enter player name (e.g., "Test Player")
5. Click to confirm

---

## Test Protocol: 10 Shots from Different Distances

### Shot 1: Close Range - Perfect Shot (100% Accuracy)

**Distance:** Closest possible (right next to hoop)  
**Aim:** Click on hoop area, position cursor at Sweet Spot (green vertical line)  
**Power:** Charge until cursor reaches Sweet Spot  
**Expected Outcome:**
- ✓ Ball arcs toward hoop
- ✓ Ball passes through top gate (from above)
- ✓ Ball exits bottom gate
- ✓ Message: "🎯 GATE GOAL!"
- ✓ Score increases by 2 points
- ✓ Net shake animation (0.7 seconds)

**Observations:**
- [ ] Ball visible arc? (Yes/No)
- [ ] Ball bounces off rim? (Yes/No - should NOT if perfect accuracy)
- [ ] Score message appears? (Yes/No)
- [ ] Net animation plays? (Yes/No)

---

### Shot 2: Medium Range - Good Shot (80% Accuracy)

**Distance:** Medium (5-7 canvas units away)  
**Aim:** Position cursor at Sweet Spot
**Power:** Charge to Sweet Spot
**Expected Outcome:**
- ✓ Ball arcs toward hoop
- ✓ Ball likely enters top gate
- ✓ May or may not bounce off rim (depends on trajectory)
- ✓ Either GOAL or MISS

**Observations:**
- [ ] Ball bounces off rim? (Yes/No)
- [ ] If bounce: Ball bounces with 82% velocity? (Visual check)
- [ ] Ball re-enters hoop after bounce? (Yes/No)
- [ ] Score message appears? (Yes/No)

---

### Shot 3: Rim Shot - Front Edge

**Distance:** Medium-far (8-10 units away)
**Aim:** Click slightly to the right of hoop (aim for right rim edge)
**Power:** Less than Sweet Spot (70% charge)
**Expected Outcome:**
- ✓ Ball hits front rim (visible on left side of hoop)
- ✓ Ball bounces away at 82% velocity
- ✓ 25% friction applied (noticeable slowdown)
- ✓ Ball may re-enter gates OR eject downward

**Observations:**
- [ ] Ball clearly hits rim? (Yes/No)
- [ ] Bounce direction correct (away from hoop)? (Yes/No)
- [ ] Ball slows down after bounce? (Yes/No)
- [ ] No teleportation or magnet pull? (Yes/No - should be pure physics)

---

### Shot 4: Rim Shot - Back Edge

**Distance:** Medium-far (8-10 units away)
**Aim:** Click slightly to the left of hoop (aim for back rim edge)
**Power:** Less than Sweet Spot (70% charge)
**Expected Outcome:**
- ✓ Ball hits back rim (right side of hoop)
- ✓ Ball bounces toward center
- ✓ May re-enter gates from new trajectory
- ✓ Possible goal or miss

**Observations:**
- [ ] Ball hits back rim? (Yes/No)
- [ ] Bounce direction toward hoop? (Yes/No)
- [ ] Velocity reduced (82% retention)? (Visual check)
- [ ] Ball continues flying (not stuck)? (Yes/No)

---

### Shot 5: Backboard Bank Shot

**Distance:** Far, angled toward backboard (10+ units)
**Aim:** Aim at backboard (left side of hoop)
**Power:** Medium (60-70% charge)
**Expected Outcome:**
- ✓ Ball hits vertical backboard face
- ✓ Ball bounces away at 66% velocity
- ✓ Friction reduces vertical velocity by 38%
- ✓ Ball returns toward hoop
- ✓ May enter gates or bounce again

**Observations:**
- [ ] Ball clearly hits backboard? (Yes/No)
- [ ] Bounce angle correct (away from board)? (Yes/No)
- [ ] Velocity reduced (66% vx, 62% vy)? (Visual check)
- [ ] Ball continues toward hoop? (Yes/No)
- [ ] Multiple bounces possible? (Yes/No)

---

### Shot 6: High Arc Over the Backboard

**Distance:** Far (12+ units away)
**Aim:** High angle, aim above backboard
**Power:** High (80%+ charge)
**Expected Outcome:**
- ✓ Ball should arc over backboard
- ✓ If clears: enters top gate from above
- ✓ If too high: exits top of screen (miss)
- ✓ If perfect: goal

**Observations:**
- [ ] Ball clears backboard? (Yes/No)
- [ ] Ball arcs smoothly (no magnet pull)? (Yes/No)
- [ ] If goal: gate detection works? (Yes/No)
- [ ] If miss: no false goal message? (Yes/No)

---

### Shot 7: Undershooting (Low Power)

**Distance:** Medium (5-7 units)
**Aim:** At hoop
**Power:** Very low (20-30% charge)
**Expected Outcome:**
- ✓ Ball arc is shallow
- ✓ Ball lands short of hoop
- ✓ Ball.y never reaches topGateY (HOOP_Y - 12px)
- ✓ No goal possible
- ✓ Ball bounces on floor and stops

**Observations:**
- [ ] Ball stops before hoop? (Yes/No)
- [ ] No "GATE GOAL" message? (Yes/No - should NOT appear)
- [ ] Score unchanged? (Yes/No)
- [ ] Ball bounces naturally on floor? (Yes/No)

---

### Shot 8: Ball from Below Prevention

**Distance:** Let previous shot bounce first (from Shot 7)
**Action:** Wait for ball to bounce upward from floor
**Expected Outcome:**
- ✓ Ball bounces upward (vy < 0 in canvas)
- ✓ Ball reaches gate area from below
- ✓ Top gate check: b.vy > 0 FAILS (vy is negative)
- ✓ passedTopGate NOT set to true
- ✓ NO false positive goal
- ✓ Ball bounces past and stops

**Observations:**
- [ ] Ball bounces upward? (Yes/No)
- [ ] No false "GOAL" message? (Yes/No - critical!)
- [ ] Score unchanged? (Yes/No)
- [ ] Gate system correctly rejects upward motion? (Yes/No)

---

### Shot 9: Perfect Accuracy (Sweet Spot Hit)

**Distance:** Any distance
**Aim:** Position cursor EXACTLY on Sweet Spot (green line)
**Power:** Charge until cursor perfectly aligns with green line
**Expected Outcome:**
- ✓ Ball launches at optimal angle/speed
- ✓ Ball trajectory perfectly calculated
- ✓ Ball enters top gate from above
- ✓ Ball exits bottom gate
- ✓ GUARANTEED GOAL (unless physics broken)
- ✓ Message: "🎯 GATE GOAL!"
- ✓ Score +2

**Observations:**
- [ ] Ball follows optimal path? (Yes/No)
- [ ] Always goals at Sweet Spot? (Yes/No - should be consistent)
- [ ] No variation in goal detection? (Yes/No)
- [ ] Message appears reliably? (Yes/No)

---

### Shot 10: Physics-Based - Multiple Bounces

**Distance:** Medium-far (7-10 units)
**Aim:** Aim for rim, intentionally try to get multiple bounces
**Power:** Medium (50-60% charge)
**Expected Outcome:**
- ✓ Ball hits rim
- ✓ Bounces away (82% velocity, 25% friction)
- ✓ May bounce again (floor or rim)
- ✓ Each bounce reduces energy
- ✓ After 2-3 bounces, ball either scores or stops
- ✓ Physics looks realistic (not jumping around randomly)

**Observations:**
- [ ] Multiple bounces visible? (Yes/No)
- [ ] Ball slows down with each bounce? (Yes/No)
- [ ] Physics smooth and realistic? (Yes/No)
- [ ] No jerky or unnatural behavior? (Yes/No)
- [ ] No infinite bounces? (Yes/No)

---

## Critical Checks (All 10 Shots)

### Physics Behavior
- [ ] **NO Magnet Effect** — Ball never gets pulled toward hoop (pure physics)
- [ ] **NO Teleportation** — Ball never jumps or warps positions
- [ ] **Gravity Works** — Ball consistently falls (vy increases)
- [ ] **Drag Works** — Ball slows down slightly each frame
- [ ] **Realistic Bounces** — Rim/backboard bounces look natural

### Collision Detection
- [ ] **Rim Collisions Detected** — Ball bounces off rim when it should
- [ ] **Backboard Collisions Detected** — Ball bounces off board when it should
- [ ] **Gate Detection Works** — Ball must pass top THEN bottom to score
- [ ] **False Positives Prevented** — Upward-bouncing balls don't score

### Scoring System
- [ ] **Gate-Based Scoring** — Only scores when entering/exiting gates
- [ ] **No Double Counting** — Score increases only once per goal
- [ ] **Message Display** — "🎯 GATE GOAL!" appears correctly
- [ ] **Net Animation** — Net shakes for 700ms after goal

### Visual Feedback
- [ ] **Ball Arc Visible** — Can see ball trajectory clearly
- [ ] **Bounce Effects Visible** — Collisions produce visible changes
- [ ] **Score Updates** — Score board updates after goals
- [ ] **Flash Messages** — Green flash appears for goals

---

## Troubleshooting

### Issue: Ball Disappears
- **Cause:** Ball may have left canvas boundaries
- **Solution:** Check if ball.x < 0 or ball.y > canvas.height
- **Fix Needed:** Boundary detection to stop ball or wrap it

### Issue: Ball Gets Stuck in Rim
- **Cause:** Ball pushed into rim but not out far enough
- **Solution:** Check `pushDist` calculation in `handleRimCollision()`
- **Fix Needed:** Increase `pushDist` constant or improve ejection logic

### Issue: No Bounce on Rim
- **Cause:** Collision detection distance threshold too small
- **Solution:** Check `dist >= BALL_RADIUS + RIM_THICKNESS`
- **Fix Needed:** Reduce `RIM_THICKNESS` or increase collision range

### Issue: Goal Scoring When Ball from Below
- **Cause:** Gate check doesn't properly verify `b.vy > 0`
- **Solution:** Add console log to verify vy sign before top gate trigger
- **Fix Needed:** Ensure condition `b.vy > 0` is evaluated correctly

### Issue: Backboard Not Bouncing
- **Cause:** Ball position calculation off, or collision not triggered
- **Solution:** Check if `b.x - BALL_RADIUS > BOARD_X` (should be `<`)
- **Fix Needed:** Review collision detection condition

---

## What Should Work ✅

1. **Direct Shot** → Ball arcs, enters gates, scores
2. **Rim Bounce** → Ball bounces off rim at 82% velocity
3. **Backboard Bounce** → Ball bounces off board at 66% velocity
4. **Gate Scoring** → Two-part gate system prevents false positives
5. **No Magnet** → Pure physics, no artificial attraction
6. **No Teleportation** → Smooth continuous motion
7. **Friction Effects** → Visible slowdown on collisions
8. **Floor Bounce** → Ball bounces on ground naturally
9. **Score Consistency** → Sweet Spot always scores
10. **False Positive Prevention** → Ball from below never scores

---

## Report Template

After testing, fill out this report:

**Test Date:** _______________  
**Browser:** _______________  
**Commit:** e51f6b3  

### Working Features ✅
- [ ] Rim collision and bounce
- [ ] Backboard collision and bounce
- [ ] Gate-based scoring
- [ ] No magnet effect
- [ ] No teleportation
- [ ] Realistic gravity and drag
- [ ] Sweet Spot accuracy
- [ ] Score updates correctly

### Issues Found 🐛
1. **Issue:** _______________
   **Observed:** _______________
   **Expected:** _______________
   **Screenshot/Video:** _______________

2. **Issue:** _______________
   **Observed:** _______________
   **Expected:** _______________
   **Screenshot/Video:** _______________

### Recommendations 💡
- _______________
- _______________
- _______________

---

**Live Site:** https://basketball.lviv.ua/chat  
**Test Status:** Ready for manual verification
