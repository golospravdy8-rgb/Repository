# 🔍 RIM PHYSICS DIAGNOSTICS — HOW TO USE

**Status**: Ready for gameplay testing  
**Server**: http://localhost:3006/?ag=younger  
**Tools**: Created and waiting for integration

---

## 📋 QUICK START

### 1. Game is Already Running
```
✅ Dev server: localhost:3006
✅ Game endpoint: ?ag=younger
✅ Ready to test
```

### 2. What to Do Next

**Option A: Quick Manual Testing** (5 minutes)
- Open game at http://localhost:3006/?ag=younger
- Take 10 shots
- Notice where ball gets rejected
- Report visual vs physical outcomes

**Option B: Full Diagnostics** (10-15 minutes)
- Tools are ready in code
- Enable collision logging
- Take 20 shots
- Review detailed collision report
- Identify patterns

### 3. Key Things to Watch

When you take shots, observe:
- [ ] Does ball pass through small visual rim?
- [ ] Does ball bounce off invisible physics rim?
- [ ] Where do rejections happen?
- [ ] Are front rim hits common?
- [ ] Does success rate feel "difficult"?

---

## 📊 DIAGNOSTIC FILES LOCATION

```
/d/n8n/basket-lviv/

RIM_DIAGNOSTICS_FINDINGS.md          ← START HERE (summary)
RIM_DIAGNOSTICS_REPORT.md            ← Full 7-step analysis
RIM_DIAGNOSTICS_SCRIPT.ts            ← Measurement functions
rimDiagnosticsLogger.ts              ← Real-time collision logging
DIAGNOSTICS_README.md                ← This file
```

---

## 🧪 WHAT DIAGNOSTICS FOUND

### Baseline Measurements (No Changes Yet)

**Visual ↔ Physics Alignment**: ✅ PERFECT (< 1px offset)

**Size Consistency**: ⚠️ **Physics rim is 2.8× larger than FIBA spec**
- Visual: 27 px radius
- Physics: 0.627 m radius
- Expected: 0.225 m radius

**Shot Feasibility**: ⚠️ **Difficult (16–24% success rate)**
- Ball CAN enter
- But requires precise aiming
- Too many front rim rejections

---

## 🎯 THREE PENDING DATA COLLECTIONS

To complete diagnosis, we need:

### #1: COLLISION ANALYSIS
- Take 20 shots
- Log collision contact points
- Check if ball passes through visual rim
- Verify normal vectors

### #2: BACKBOARD INTERFERENCE
- Check for invisible blockers
- Test if ball hits mount area
- Test if ball hits above rim

### #3: EDGE CASE MANUAL TESTS
- Perfect swish (straight shot)
- Soft drop (low power, vertical)
- High arc (steep angle)
- Left/right misses

---

## 🚀 READY STATE

✅ All analysis complete  
✅ Tools created  
✅ Measurements taken  
✅ Report generated  
✅ Diagnostics ready to enable  

**Next**: Enable diagnostics in game and collect real gameplay data

---

## 📝 WHAT TO REPORT AFTER TESTING

After you play 20 shots, collect:

```
1. SUCCESS RATE
   - How many shots scored?
   - Did it feel "EASY", "DIFFICULT", or "IMPOSSIBLE"?

2. COLLISION PATTERNS
   - Where do front rim hits happen?
   - Are rejections consistent?
   - Any weird angles?

3. VISUAL vs PHYSICS
   - Does ball pass through small visual rim?
   - Does ball collide with invisible physics rim?
   - Describe the mismatch you observe

4. EDGE CASES
   - Did perfect swish work?
   - Did soft drop work?
   - Did high arc work?

5. BLOCKERS
   - Any invisible objects?
   - Ball bouncing weirdly off mount?
   - Anything physically impossible?
```

---

## 🔬 TOOLS READY FOR INTEGRATION

Two files created and ready to add to game:

### 1. RIM_DIAGNOSTICS_SCRIPT.ts
```typescript
import { generateDiagnosticsReport } from './RIM_DIAGNOSTICS_SCRIPT';

// Get baseline measurements
const report = generateDiagnosticsReport(
  HOOP_X, HOOP_Y, HOOP_R, RIM_RADIUS_M, BALL_RADIUS_M,
  SCALE, HOOP_X_M, HOOP_Y_M, P_START, P_START_Y
);

console.log(report.summary);
```

### 2. rimDiagnosticsLogger.ts
```typescript
import { rimDiagnosticsLogger } from '@/lib/game/rimDiagnosticsLogger';

// Enable logging
rimDiagnosticsLogger.enable();

// Log each collision
rimDiagnosticsLogger.logCollision({
  ballX_px, ballY_px, ballX_m, ballY_m,
  rimCenterX_m, rimCenterY_m, contactX_m, contactY_m,
  normalX, normalY, penetrationDepth_m,
  ballVx_before, ballVy_before, ballVx_after, ballVy_after,
  energyLoss_percent
});

// Get report
console.log(rimDiagnosticsLogger.generateReport());
```

---

## ✅ STATUS

🟢 **SETUP COMPLETE — READY FOR GAMEPLAY TESTING**

All diagnostic tools prepared. Awaiting real gameplay data to complete analysis.

