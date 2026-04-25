# 🔧 Physics Debug Checklist

## Potential Issues & How to Detect Them

### Issue 1: Rim Collision Not Triggering

**Symptoms:**
- Ball passes through rim without bouncing
- Ball enters hoop on every shot (even misses)
- No visible rim contact

**Root Cause Possibilities:**
1. Collision distance check too strict
2. Rim geometry not initialized properly
3. rimFront/rimBack coordinates wrong

**How to Debug:**
1. Open browser DevTools (F12)
2. In Console tab, paste:
```javascript
// Check if rim points exist
console.log('rimFront:', window.rimFront);
console.log('rimBack:', window.rimBack);
console.log('BALL_RADIUS:', window.BALL_RADIUS);
console.log('RIM_THICKNESS:', window.RIM_THICKNESS);
```

3. Take a shot, watch console for collision logs
4. Expected output:
```
rimFront: {x: 132, y: 307}
rimBack: {x: 88, y: 307}
BALL_RADIUS: 12
RIM_THICKNESS: 4
```

**Fix if Not Working:**
- Check line 310-318 in RucheekGameCanvas.tsx
- Verify `rimFront.x = HOOP_X + HOOP_RADIUS`
- Verify `rimBack.x = HOOP_X - HOOP_RADIUS`
- Both should be equal distance from HOOP_X

---

### Issue 2: Backboard Collision Not Working

**Symptoms:**
- Ball passes through backboard
- Ball doesn't bounce off board
- No visual backboard impact

**Root Cause Possibilities:**
1. Collision condition inverted or wrong
2. Backboard X position incorrect
3. Y-range check excludes ball

**How to Debug:**
```javascript
// Check backboard coordinates
console.log('BOARD_X:', window.BOARD_X);
console.log('BOARD_TOP:', window.BOARD_TOP);
console.log('BOARD_BOT:', window.BOARD_BOT);
```

Expected output:
```
BOARD_X: 57  (approximately)
BOARD_TOP: 189
BOARD_BOT: 292
```

**Check the condition in code:**
- Line 841: `if (b.x - BALL_RADIUS > BOARD_X` should be `<` not `>`
- If ball.x < BOARD_X, collision should trigger
- If ball.y < BOARD_TOP or > BOARD_BOT, skip collision

**Fix if Not Working:**
- Change `>` to `<` in line 841 if needed
- Verify BOARD_X is to the LEFT of HOOP_X

---

### Issue 3: Gate Scoring Not Working

**Symptoms:**
- Ball passes through hoop but no goal
- False positives (ball from below scores)
- "GATE GOAL!" message never appears

**Root Cause Possibilities:**
1. Gate coordinates wrong
2. Gate width too narrow
3. passedTopGate flag not initializing
4. vy > 0 condition reversed

**How to Debug:**
```javascript
// Check gate positions
console.log('topGateY:', window.topGateY);
console.log('topGateWidth:', window.topGateWidth);
console.log('bottomGateY:', window.bottomGateY);
console.log('bottomGateWidth:', window.bottomGateWidth);
```

Expected output:
```
topGateY: 295 (HOOP_Y - 12)
topGateWidth: 45 (approximately)
bottomGateY: 329 (HOOP_Y + 22)
bottomGateWidth: 40 (approximately)
```

**Add logging to gate check (for testing only):**
Edit line 854-857:
```typescript
if (Math.abs(b.x - HOOP_X) < topGateWidth / 2 &&
    Math.abs(b.y - topGateY) < 6 &&
    b.vy > 0) {
  console.log('TOP GATE HIT:', {x: b.x, y: b.y, vy: b.vy});
  b.passedTopGate = true;
  return false;
}
```

**Fix if Not Working:**
- Verify `b.vy > 0` means falling (positive Y is down in canvas)
- Check topGateWidth calculation: `HOOP_RADIUS * 2.08`
- Ensure `b.passedTopGate` is initialized to `false` in launchBall()

---

### Issue 4: Magnet Effect Still Present

**Symptoms:**
- Ball gets pulled toward hoop even without collision
- Ball teleports into hoop
- Unrealistic trajectory curves

**Root Cause Possibilities:**
1. Old magnet code still running
2. Guided-mode correction too aggressive
3. Accuracy-based modification affecting trajectory

**How to Debug:**
1. Search code for "magnet" (should find 0 results in physics)
2. Check line 908: Should say "Magnet removed"
3. Watch ball trajectory: Should be pure parabola
4. If ball curves unnaturally, check guided-mode (line 911-917)

**Fix if Not Working:**
- Remove any velocity modification that's not physics-based
- Comment out accuracy-based corrections temporarily
- Test with `b.isGuided = false` to disable guided mode

---

### Issue 5: Ball Gets Stuck in Rim

**Symptoms:**
- Ball bounces but gets trapped in rim
- Ball doesn't exit rim properly
- Game hangs or freezes

**Root Cause Possibilities:**
1. Push distance calculation wrong
2. Collision repeatedly triggered same frame
3. rimHandled flag preventing second collision

**How to Debug:**
Check line 832:
```typescript
const pushDist = BALL_RADIUS + RIM_THICKNESS - dist + 1;
```

Should push ball outward by at least `BALL_RADIUS + RIM_THICKNESS`.
If `pushDist <= 0`, ball won't be pushed out.

**Fix if Not Working:**
- Increase the `+ 1` to `+ 3` for more aggressive push
- Or reduce RIM_THICKNESS from 4px to 2px
- Add rimHandled flag to prevent repeated collisions:
```typescript
if (!b.rimHandled && handleRimCollision(b, rimFront)) {
  b.rimHandled = true;
}
```

---

### Issue 6: Ball Bounces Too Much (Energy Not Lost)

**Symptoms:**
- Ball bounces infinitely
- Ball gains height on each bounce
- Physics looks unrealistic

**Root Cause Possibilities:**
1. Bounciness constant too high (> 0.82)
2. Friction not applied correctly
3. Floor bounce restitution wrong

**How to Debug:**
```javascript
console.log('RIM_BOUNCINESS:', window.RIM_BOUNCINESS);
console.log('RIM_FRICTION:', window.RIM_FRICTION);
console.log('BOARD_BOUNCINESS:', window.BOARD_BOUNCINESS);
console.log('BOARD_FRICTION:', window.BOARD_FRICTION);
```

Expected values:
```
RIM_BOUNCINESS: 0.82 (82% velocity retained)
RIM_FRICTION: 0.25 (25% friction)
BOARD_BOUNCINESS: 0.66 (66% velocity retained)
BOARD_FRICTION: 0.38 (38% friction)
```

**Fix if Not Working:**
- Reduce bounciness values if too bouncy
- Increase friction values if ball bounces too much
- Check floor bounce code (should be around line 1000+)

---

### Issue 7: Ball Scoring from Below (False Positive)

**Symptoms:**
- Ball bounces upward, passes gates, scores false goal
- "GATE GOAL!" appears when it shouldn't
- Upward-moving balls incorrectly counted as goals

**Root Cause Possibilities:**
1. Top gate doesn't check `b.vy > 0`
2. vy sign convention reversed
3. passedTopGate flag not cleared properly

**How to Debug:**
Check line 856:
```typescript
if (Math.abs(b.x - HOOP_X) < topGateWidth / 2 &&
    Math.abs(b.y - topGateY) < 6 &&
    b.vy > 0) {
```

The `b.vy > 0` is CRITICAL. In canvas coords:
- vy > 0 = ball falling (downward)
- vy < 0 = ball rising (upward)

If ball bounces from floor, vy should be NEGATIVE (upward).
Condition `b.vy > 0` should FAIL and passedTopGate should NOT be set.

**Fix if Not Working:**
- Verify `b.vy > 0` is correct (not `b.vy < 0`)
- Add safety check:
```typescript
// Ensure passedTopGate is cleared for new shots
if (b.state === 'flying' && !b.passedTopGate) {
  // Initialize at shot start
}
```

---

### Issue 8: Score Not Incrementing

**Symptoms:**
- Goal message appears but score doesn't change
- Net shakes but score stays same
- Player points not updating

**Root Cause Possibilities:**
1. Score update not connected to gate goal
2. gs.players[idx].score not being incremented
3. Leaderboard not syncing

**How to Debug:**
Check what happens after goal is detected (line 895-906).
Should have code like:
```typescript
gs.players[idx].score += 2;
forceUpdate(n => n + 1);
```

**Fix if Not Working:**
- Add score increment after gate goal:
```typescript
if (checkScoringGates(b)) {
  gs.players[idx].score = (gs.players[idx].score || 0) + 2;
  // ... rest of goal handling
}
```

---

## Testing Commands for Browser Console

### Verify Physics Constants
```javascript
console.table({
  G: 0.102,
  BALL_RADIUS: 12,
  HOOP_RADIUS: 22,
  RIM_BOUNCINESS: 0.82,
  RIM_FRICTION: 0.25,
  BOARD_BOUNCINESS: 0.66,
  BOARD_FRICTION: 0.38
});
```

### Monitor Ball State During Shot
```javascript
// After taking a shot, paste this repeatedly to monitor:
// Ball.x, Ball.y, Ball.vx, Ball.vy, passedTopGate
console.log({
  x: Math.round(ball.x),
  y: Math.round(ball.y),
  vx: ball.vx.toFixed(2),
  vy: ball.vy.toFixed(2),
  state: ball.state,
  passedTopGate: ball.passedTopGate
});
```

### Force Collision Test
```javascript
// Manually trigger rim collision for testing
ball.x = HOOP_X + HOOP_RADIUS; // Position at front rim
ball.y = HOOP_Y;
ball.vx = -5; // Moving toward hoop
ball.vy = 2; // Falling
// Now take a shot, should bounce
```

---

## Quick Checklist ✓

Before reporting issues, verify:

- [ ] Build: `npm run build` passes without errors
- [ ] Deploy: Vercel shows green checkmark
- [ ] URL: https://basketball.lviv.ua/chat loads
- [ ] Game: Can add player and take shots
- [ ] Browser: Open DevTools (F12)
- [ ] Console: No red error messages

---

## If All Else Fails

**Nuclear Option - Revert and Rebuild:**
```bash
cd D:\n8n\basket-lviv
git revert e51f6b3
npm run build
npm run dev
```

Then test again to see if physics works on older version.
If it does, the issue is in the new code.
If it doesn't, the issue is elsewhere.

---

**Last Updated:** 2026-04-25  
**Commit:** e51f6b3  
**Status:** Ready for testing
