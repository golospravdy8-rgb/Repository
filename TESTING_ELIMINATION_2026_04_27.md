# 🧪 Testing Checklist: Elimination Logic (2026-04-27)

**Status**: Diagnostic build deployed to production  
**URL**: https://basketball.lviv.ua/chat  
**Commit**: 8849530  

---

## Setup

1. Open **two separate browser windows** (or two browsers)
   - Window A: https://basketball.lviv.ua/chat
   - Window B: https://basketball.lviv.ua/chat
2. Open **F12 Console** in both windows to see diagnostic logs
3. Make sure **Console is NOT filtered** (show all messages)

---

## Scenario: 2-Player Elimination Test

### Step 1: Add Player 1 (Alice) in Window A
- Click "Додати гравця"
- Enter name: **Alice**
- Wait for confirmation on both windows

**Expected state:**
```
Window A: Alice (#1) - blinking number
Window B: Alice (#1) - see her too
```

### Step 2: Add Player 2 (Bob) in Window B
- Click "Додати гравця"
- Enter name: **Bob**
- Wait for confirmation on both windows

**Expected state:**
```
Window A: Alice (#1) [first], Bob (#2) [second] → Alice can shoot
Window B: Alice (#1), Bob (#2) → Alice can shoot
```

### Step 3: Alice Throws (Miss) - Window A
- Wait for Alice's number to blink
- Click canvas to aim
- Move mouse to aim (NOT at center green zone)
- Click to charge power
- Click to throw
- **Important**: The shot should **NOT score** (aim away from center)

**Expected logs in Window A Console:**
```
[launchBall] Alice: hasThrown = true
gs.players[0].hasActiveRight = false
gs.players[1].hasActiveRight = true
```

### Step 4: Bob Gets Active Right
- Window B should now show Bob's number blinking
- Bob is first in queue

**Expected state:**
```
Window A: Bob (#2) [blinking], Alice (#1) [tail]
Window B: Same
```

### Step 5: Bob Throws (Score) - Window B
- Wait for Bob's number to blink
- Click canvas to aim
- Aim at **center green zone** (aim for perfect/near-perfect accuracy)
- Click to charge and throw
- **Goal!** Aim for a successful shot

**Expected logs in Window B Console:**
```
[SCORED] Shooter: Bob, idx: 0, hasThrown: false
[SCORED] All players BEFORE elimination: [
  { name: "Bob", hasThrown: false, hasActiveRight: true, playerNumber: 2 },
  { name: "Alice", hasThrown: true, hasActiveRight: false, playerNumber: 1 }
]
[SCORED] prevIdx: 1, prevPlayer: Alice, prevThrown: true
[SCORED] Condition check: prevPlayer exists? true, hasThrown===true? true

[ELIMINATE] Before splice: 2 players
[ELIMINATE] After splice: 1 players. All players: ["Bob"]
[ELIMINATE] Shooter new index: 0, shooter: Bob
```

### Step 6: Verify Alice Disappears
- Window A: Alice should **disappear** with **💥 ВИБУВ: Alice!** message
- Window B: Same - Alice gone, only Bob remains
- Screen should show **VICTORY: Bob ПЕРЕМОЖЕЦЬ!** message
- Bob should get **+10 HP** reward

---

## What to Look For

### ✅ Success Indicators
- [ ] Alice's character vanishes from screen with 💥 flash
- [ ] Consolelogs show `[SCORED]` and `[ELIMINATE]` messages
- [ ] `prevThrown: true` is logged (Alice's hasThrown is true)
- [ ] `Condition check: prevPlayer exists? true, hasThrown===true? true`
- [ ] `Before splice: 2 players`, `After splice: 1 players`
- [ ] Victory message appears: 🏆 Bob ПЕРЕМОЖЕЦЬ!
- [ ] Game ends properly

### ❌ Failure Indicators
- [ ] Alice stays on screen (not removed from gs.players)
- [ ] No `[SCORED]` logs appear (shot logic not running)
- [ ] `prevThrown: false` or `prevThrown: undefined` (hasThrown not set during throw)
- [ ] `Condition check: ... hasThrown===true? false` (condition fails)
- [ ] `Before splice: 2 players`, `After splice: 2 players` (splice didn't work)
- [ ] No victory message

---

## If Alice Doesn't Disappear

### Check Console for These Clues:

1. **No [SCORED] logs?**
   - Shot logic not running
   - Check if collision detection is working
   - Look for any other error messages

2. **[SCORED] logs present, but no [ELIMINATE] logs?**
   - Condition `prevPlayer && prevPlayer.hasThrown === true` failed
   - Check: Is `prevPlayer` null?
   - Check: Is `prevThrown` false?
   - This means Alice's hasThrown was NOT set to true during her throw

3. **[SCORED] + [ELIMINATE] logs both present, but splice didn't work?**
   - `Before splice: 2`, `After splice: 2` (no change)
   - This suggests gs.players.splice() didn't actually remove the player
   - **ISSUE**: prevIdx might be wrong, or player reference is wrong

4. **Victory message appears but Alice still visible?**
   - gs.players was spliced correctly (game logic ran)
   - But rendering layer didn't update
   - This is a rendering/state update issue

---

## Next Steps After Testing

1. **Take screenshot of Console output** with all [SCORED] and [ELIMINATE] logs
2. **Note exact behavior**: Does Alice disappear? When?
3. **Copy console output** and share so we can debug based on actual logs
4. **If no logs appear**, something is preventing shot logic from running entirely

---

## Quick Diagnostic Commands

If you want to manually test in Console:
```javascript
// Check game state
window.gameStateRef?.current?.players.forEach((p, i) => {
  console.log(`${i}: ${p.name} (thrown=${p.hasThrown}, right=${p.hasActiveRight})`);
});

// Simulate elimination
window.gameStateRef?.current?.players.splice(0, 1);
```

---

**Expected Outcome**: Alice (first player who didn't score) should be removed from the game when Bob (second player) scores.
