# 🎮 STAGE 6: GAMEPLAY TESTING PLAN

**Status**: ⏳ **READY TO TEST**  
**Date**: 2026-05-02 22:45 UTC  
**Dev Server**: Running on localhost:3006

---

## 📋 TESTING OBJECTIVES

The physics integration has changed:
- **E_RIM**: 0.25 → 0.45 (more realistic bounce)
- **MU_RIM**: 0.82 → 0.35 (less sticky friction)

We need to verify these changes produce realistic basketball physics gameplay.

---

## 🎯 TEST SCENARIOS

### TEST A: Clean Swish (High Arc Shot)
**Objective**: Ball should arc gracefully and drop through rim cleanly

**Steps**:
1. Load http://localhost:3006?ag=younger
2. Open DevTools (F12) → Console tab
3. Watch for: `✅ Rim Metrics Validation` message
4. Click on the court to position self
5. Take a shot with HIGH power (75-90%)
6. Observe: Ball should arc up, float down, pass through rim

**Expected Behavior**:
- ✅ Ball bounces realistically (E_RIM = 0.45, not too soft)
- ✅ Rim doesn't grip ball excessively (MU_RIM = 0.35)
- ✅ Smooth arc trajectory visible
- ✅ Ball drops through cleanly (swish or slight bounce)

**Console Logs** (should not see errors):
- ✓ Physics audit clean
- ✓ FIBA validation passed
- ✓ No collision warnings

---

### TEST B: Rim Bounce (Medium Power Shot)
**Objective**: Ball bounces off rim realistically and settles

**Steps**:
1. Take a shot with MEDIUM power (50-65%)
2. Observe rim collision behavior
3. Watch ball settle on or near rim

**Expected Behavior**:
- ✅ Ball bounces off rim (not soft/sticky like before)
- ✅ Energy loss realistic (E_RIM = 0.45)
- ✅ Friction applies gradually (MU_RIM = 0.35)
- ✅ Ball might roll slightly then settle
- ✅ No "sticking" to rim (that was the 0.82 friction bug)

**What to AVOID**:
- ❌ Ball sticking to rim for 5+ seconds
- ❌ Ball bouncing 10+ times (too bouncy)
- ❌ Ball flying off rim erratically

---

### TEST C: Gate Scoring (Multiple Shots)
**Objective**: Verify gate-based scoring still works correctly

**Steps**:
1. Take 5 consecutive shots
2. Note which ones score (top gate) vs bounce (bottom gate)
3. Verify scoring counts correctly

**Expected Behavior**:
- ✅ Top gate triggers on downward ball entry
- ✅ Bottom gate triggers after top gate (ball continues down)
- ✅ Score updates in UI
- ✅ No false positives

---

### TEST D: Back Rim Bounce
**Objective**: Ball hitting back rim should bounce forward realistically

**Steps**:
1. Take a shot that hits the back rim
2. Observe bounce direction and energy

**Expected Behavior**:
- ✅ Ball bounces forward (not backward into rim)
- ✅ Realistic energy loss
- ✅ Natural trajectory continuation

---

### TEST E: Ball Physics Characteristics
**Objective**: Verify ball follows SI physics (meters/seconds)

**Steps**:
1. Take 3 shots from different positions
2. Observe trajectories
3. Compare arc/bounce patterns to real basketball

**Expected Behavior**:
- ✅ Gravity feels right (9.81 m/s²)
- ✅ Arc follows parabolic path
- ✅ Terminal velocity feels natural
- ✅ Consistent physics between shots

---

## 🔍 CONSOLE VERIFICATION

When game loads, check console (F12):

**✅ PASS**: You should see:
```
✅ Rim Metrics Validation
✓ RIM: FIBA compliant (45cm diameter, 18mm thickness)
✓ RESTITUTION: 0.45 (realistic NBA bounce)
✓ FRICTION: 0.35 (realistic rim grip)
✓ BALL: Official FIBA specifications

🏀 Basketball Physics Constants
[table output with all constants]
```

**❌ FAIL**: You should NOT see:
- Validation errors
- Physics audit failures
- Constant mismatch warnings
- NaN or infinity values

---

## 📊 BEFORE vs AFTER COMPARISON

### BEFORE (Old Physics - E_RIM=0.25, MU_RIM=0.82)
```
❌ Ball "sticks" to rim
❌ Friction too high (0.82 = very sticky)
❌ Restitution too low (0.25 = very soft)
❌ Looks unrealistic
```

### AFTER (New Physics - E_RIM=0.45, MU_RIM=0.35)
```
✅ Ball bounces naturally
✅ Friction realistic (0.35 = natural grip)
✅ Restitution realistic (0.45 = NBA standard)
✅ Feels like real basketball
```

---

## 🚨 RED FLAGS (Stop Testing & Report)

If you see ANY of these, something is wrong:

1. **Ball passes through rim** (no collision)
   - Indicates: Physics geometry broken
   
2. **Game crashes on shot**
   - Indicates: Physics engine error
   
3. **Ball behaves erratically**
   - Indicates: Constants or gravity wrong
   
4. **Gravity backwards** (ball falls up)
   - Indicates: FIXED_DT or gravity corrupted
   
5. **Console shows physics audit FAILED**
   - Indicates: Architecture was modified

---

## ✅ TEST CHECKLIST

Run each test and mark complete:

- [ ] TEST A: Clean Swish — PASS / FAIL
- [ ] TEST B: Rim Bounce — PASS / FAIL
- [ ] TEST C: Gate Scoring — PASS / FAIL
- [ ] TEST D: Back Rim Bounce — PASS / FAIL
- [ ] TEST E: Ball Physics — PASS / FAIL
- [ ] Console Validation — PASS / FAIL

---

## 📝 TESTING PROCEDURE

1. **Start Dev Server**
   ```bash
   npm run dev
   ```

2. **Open Game**
   - Navigate to http://localhost:3006?ag=younger
   - Open DevTools (F12)
   - Go to Console tab

3. **Wait for Validation**
   - Should see FIBA metrics validation message
   - Should see physics audit: "clean and pure"

4. **Run Each Test**
   - Complete TEST A through TEST E
   - Note any anomalies

5. **Record Results**
   - Document any issues found
   - Note ball behavior vs expectations

6. **Verify Constraints**
   - Architecture untouched ✓
   - Gravity 9.81 m/s² ✓
   - FIXED_DT 1/120 ✓
   - Launch system 3-click ✓
   - Gate scoring working ✓

---

## 🎯 SUCCESS CRITERIA

All of the following must be TRUE:

✅ Game loads without errors  
✅ Console shows validation PASS  
✅ Ball physics feel realistic  
✅ Rim bounce E_RIM=0.45 visible  
✅ Friction MU_RIM=0.35 working  
✅ Gate scoring still functional  
✅ No crashes or physics errors  
✅ Architecture completely intact  

---

## 🚀 NEXT STEP

After all tests pass:
- **STAGE 7**: Verify safety constraints (gravity, FIXED_DT, algorithms)
- **STAGE 8**: Create Git commit with all changes
- **STAGE 9**: Final verification and deployment

---

## 📞 TESTING NOTES

Use this space to record observations:

```
TEST A Results:
- [description]

TEST B Results:
- [description]

TEST C Results:
- [description]

TEST D Results:
- [description]

TEST E Results:
- [description]

General observations:
- [description]

Issues found:
- [description]
```

**Status**: ⏳ **AWAITING GAMEPLAY TESTING**

