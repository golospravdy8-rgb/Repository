# QUICK START — Remediation Execution Guide

**For:** Developers implementing Phase 1-3 fixes  
**Time:** Read 5 minutes, use as reference during development  
**Updated:** 2026-05-11

---

## 🔍 BEFORE YOU START

### 1. Read The Full Docs
- `ARCHITECTURE_STABILIZATION_MASTER_PLAN_2026_05_11.md` (strategy)
- `CONFLICT_MAP_FORENSIC_2026_05_11.md` (detailed analysis)
- This file (execution checklist)

### 2. Create Safe Branch
```bash
git checkout -b remediation/phase-1
npm install  # Ensure dependencies fresh
npm run build
npm run test  # Baseline before any changes
```

### 3. Profile Baseline
```bash
# Measure memory (baseline)
# Measure render times
# Verify timer accuracy
# Document current state
```

---

## 🚀 PHASE 1: QUICK WINS (2 Hours Total)

### FIX #1: ChatPage Memory Leak (5 min)
**File:** `components/public/ChatPage.tsx`  
**Line:** ~383

**Before:**
```typescript
// Called every render → creates new interval each time
setShopTicker(shuffle(shopItems));
```

**After:**
```typescript
useEffect(() => {
  setShopTicker(shuffle(shopItems));
  // Cleanup if ticker cleanup exists
  return () => {
    // cleanup logic if applicable
  };
}, [shopItems]); // Only when shopItems change
```

**Test:**
```bash
# Open DevTools → Memory → Heap snapshots
# Navigate away → back 10 times
# Measure heap before and after
# Should NOT increase >2MB
```

**Checklist:**
- [ ] Code change applied
- [ ] Build passes (`npm run build`)
- [ ] Memory test shows no leak
- [ ] Commit message: "FIX: Move setShopTicker into useEffect to prevent timer leak"

---

### FIX #2: Hydration Mismatch (10 min)
**File:** `components/public/ChatPage.tsx`  
**Lines:** 14-19

**Before:**
```typescript
const isMobile = getIsMobileNow(); // Runs on server AND client → mismatch

return (
  <div className={isMobile ? "mobile-layout" : "desktop-layout"}>
    {/* If server says desktop, client says mobile → flicker */}
  </div>
);
```

**After:**
```typescript
const [isMobile, setIsMobile] = useState(false); // Start neutral

useLayoutEffect(() => {
  // Runs ONLY on client, AFTER paint
  setIsMobile(getIsMobileNow());
}, []);

return (
  <div className={isMobile ? "mobile-layout" : "desktop-layout"}>
    {/* No flicker: server renders neutral, client updates immediately */}
  </div>
);
```

**Test:**
```bash
# Load page on iPhone/Pixel device or DevTools mobile mode
# Watch initial paint → should see target layout (no flicker)
# Measure: Paint timing should be <100ms
```

**Checklist:**
- [ ] useState hook added
- [ ] useLayoutEffect hook added
- [ ] Build passes
- [ ] Mobile load test clean
- [ ] Commit message: "FIX: Use useLayoutEffect for mobile detection to prevent hydration mismatch"

---

### FIX #3: Delete Orphaned /src Directory (5 min)
**Files:** `src/socketServer.ts`, `src/supabase.ts`, `src/updateGameInfo.ts`

**Before:**
```bash
D:\n8n\basket-lviv\
├── src/
│   ├── socketServer.ts       (orphaned, not imported)
│   ├── supabase.ts           (orphaned, not imported)
│   └── updateGameInfo.ts     (orphaned, not imported)
├── app/
├── components/
└── lib/
```

**After:**
```bash
D:\n8n\basket-lviv\
├── app/
├── components/
└── lib/
# /src/ deleted
```

**Before Delete - Verify No Imports:**
```bash
grep -r "socketServer\|supabase\|updateGameInfo" app/ components/ lib/ --include="*.ts" --include="*.tsx"
# Should return 0 results
```

**Test:**
```bash
npm run build  # Should pass
npm run test   # Should pass
```

**Checklist:**
- [ ] Grep confirms no imports
- [ ] /src/ directory deleted
- [ ] Build passes
- [ ] Tests pass
- [ ] Commit message: "CLEANUP: Remove orphaned /src directory (socketServer, supabase, updateGameInfo)"

---

## 📋 PHASE 2: STABILITY (2.5 Hours Total)

### FIX #4: RosterPanel Memo Optimization (20 min)
**File:** `components/live-tracker/LiveScoreTracker.tsx`  
**Lines:** 232-377

**Current Issue:**
```typescript
const RosterPanel = React.memo(function RosterPanel({ players, boxScores }) {
  // Memo works, but parent passes new boxScores reference every render
  // → Memo equality fails → All children re-render
});

{homePlayers.map(p => (
  <PlayerRow key={p.id} boxScore={boxScore} time={getDisplayTime(p.id)} />
))}
```

**Fix Strategy:**
1. Move boxScore lookup into PlayerRow
2. Memoize PlayerRow with precise dependencies
3. Keep RosterPanel pure

**Implementation:**
```typescript
const PlayerRow = React.memo(function PlayerRow({ playerId, boxScores, gameTimeLeft, isLive }) {
  const boxScore = boxScores.find(bs => bs.playerId === playerId);
  // ... render

}, (prevProps, nextProps) => {
  // Custom equality: only re-render if THIS PLAYER's boxScore changed
  const prevBS = prevProps.boxScores.find(bs => bs.playerId === prevProps.playerId);
  const nextBS = nextProps.boxScores.find(bs => bs.playerId === nextProps.playerId);
  
  return prevBS?.id === nextBS?.id && 
         prevBS?.timeOnCourtSeconds === nextBS?.timeOnCourtSeconds &&
         prevProps.gameTimeLeft === nextProps.gameTimeLeft;
});
```

**Test:**
```bash
# Record substitution → measure re-render time
# Should be <50ms (was 200-400ms)
# Use React DevTools Profiler
```

**Checklist:**
- [ ] PlayerRow memoized with custom equality
- [ ] Parent doesn't pass new boxScores every render
- [ ] Build passes
- [ ] Substitution render <50ms
- [ ] Commit message: "PERF: Optimize RosterPanel memo equality to prevent render cascade"

---

### FIX #5: Firebase Listener Cleanup (15 min)
**File:** `components/public/RucheekGameCanvas.tsx`  
**Issue:** Double subscribe on rapid visibility toggles

**Current Code:**
```typescript
useEffect(() => {
  if (!isVisible) {
    unsubscribeFromGame();
  } else {
    subscribeToGame();
  }
}, [isVisible]);
// Problem: If isVisible flips TRUE→FALSE→TRUE in 100ms, cleanup doesn't complete
```

**Fix:**
```typescript
useEffect(() => {
  let isCleanedUp = false;
  
  const setupListener = async () => {
    if (isVisible) {
      // Subscribe only if still visible after setup
      if (!isCleanedUp) {
        subscribeToGame();
      }
    }
  };

  if (!isVisible) {
    unsubscribeFromGame();
  } else {
    setupListener();
  }

  return () => {
    isCleanedUp = true;
    // Cleanup will prevent subscribe if component unmounts
  };
}, [isVisible]);
```

**Alternative (Simpler):**
```typescript
useEffect(() => {
  if (!isVisible) {
    unsubscribeFromGame();
    return; // Early exit, no subscribe
  }

  subscribeToGame();
  
  return () => {
    // Mark subscription cleanup
  };
}, [isVisible]);
```

**Test:**
```bash
# Rapid tab switch: visible → hidden → visible (5x in 1 second)
# Check: Firebase connection count should stay 1
# Measure: Memory should not increase
```

**Checklist:**
- [ ] Async cleanup race condition fixed
- [ ] Build passes
- [ ] Tab switch test clean
- [ ] Memory profile stable
- [ ] Commit message: "FIX: Prevent Firebase double-subscribe on rapid visibility toggles"

---

### FIX #6: GameOnCourt Migration Cleanup (20 min)
**File:** `prisma/migrations/20250508_add_time_tracking_to_gameoncourt/migration.sql`

**Issue:** Adds columns to deleted table

**Step 1: Check Current Migration Status**
```bash
npx prisma migrate status
# Output will show:
# - 20250508_add_time_tracking_to_gameoncourt [PENDING] or [APPLIED]
```

**Step 2: If PENDING (Safe Path)**
```bash
# Delete the migration file
rm prisma/migrations/20250508_add_time_tracking_to_gameoncourt/migration.sql
rm -rf prisma/migrations/20250508_add_time_tracking_to_gameoncourt/

# Or create corrective migration
npx prisma migrate resolve --rolled-back 20250508_add_time_tracking_to_gameoncourt
```

**Step 3: If APPLIED (DB State Dependent)**
```bash
# Create a NEW migration to undo it
npx prisma migrate dev --name revert_gameoncourt_columns

# In the generated migration.sql:
# ALTER TABLE "GameEvent" DROP COLUMN "secondaryPlayerId" IF EXISTS;
# ... etc (opposite of original)
```

**Test:**
```bash
npx prisma migrate status
# Should show no pending migrations

npx prisma db push
# Should succeed
```

**Checklist:**
- [ ] Migration status checked
- [ ] Broken migration removed or corrected
- [ ] `prisma migrate status` shows clean
- [ ] `npx prisma db push` succeeds
- [ ] Commit message: "FIX: Remove broken GameOnCourt migration"

---

### FIX #7: Duplicate Stats-Calculator (30 min)
**Files:**
- `/lib/stats-calculator.ts`
- `/lib/fiba/stats-calculator.ts`

**Investigation:**
```bash
# 1. Compare files
diff lib/stats-calculator.ts lib/fiba/stats-calculator.ts

# 2. Find which is imported where
grep -r "stats-calculator" app/ components/ lib/ --include="*.ts" --include="*.tsx"

# 3. Check if both are used or if one is unused
grep -r "from.*stats-calculator" . --include="*.ts" --include="*.tsx"
grep -r "from.*fiba/stats-calculator" . --include="*.ts" --include="*.tsx"
```

**Consolidation:**
```bash
# Option A: Keep one, delete other
# Option B: Merge if both have unique logic
# Option C: Create unified version

# Then update all imports to single source
```

**Test:**
```bash
# Run stat calculations with both old/new paths
# Verify results match (within tolerance)
```

**Checklist:**
- [ ] Both files analyzed
- [ ] Decision made (keep/merge/delete)
- [ ] All imports updated
- [ ] Build passes
- [ ] Stat calculations verified
- [ ] Commit message: "CLEANUP: Consolidate duplicate stats-calculator files"

---

## 🏗️ PHASE 3: ARCHITECTURE (90 min)

### FIX #8: Shadow State in LiveScoreTracker (90 min)

**This is the big one. See:** `CONFLICT_MAP_FORENSIC_2026_05_11.md` for detailed analysis

**Quick Summary:**
- Client maintains shadow timer state (`gameTimeLeft`)
- Diverges from DB on F5 refresh
- Causes ±10s jump in displayed time

**High-Level Approach:**
1. Add timer validation on mount
2. Compare client calculated vs DB time
3. Resync if diff > 2 seconds
4. Log all resync events

**Effort:** 90 minutes | **Risk:** LOW (defensive)

**Test:**
- F5 during live game scoring
- Timer should ±2s tolerance (vs ±10s currently)

---

## ✅ COMPLETION CHECKLIST

### After Each Fix
- [ ] Code reviewed
- [ ] Build passes (`npm run build`)
- [ ] Tests pass (`npm run test`)
- [ ] Specific fix test passes
- [ ] Commit message clear
- [ ] PR created

### After Phase 1 Complete
- [ ] All 3 fixes merged
- [ ] Staging deployment successful
- [ ] 24h monitoring shows no regressions
- [ ] Memory baseline improved
- [ ] Page load metrics stable

### After Phase 2 Complete
- [ ] 4 fixes merged
- [ ] Render performance improved
- [ ] No listener leaks
- [ ] Migration clean
- [ ] Stat calculations verified

### After Phase 3 Complete
- [ ] Shadow state fixed
- [ ] Timer accuracy ±2s
- [ ] Full regression test passed
- [ ] Production deployment approved

---

## 🆘 TROUBLESHOOTING

### "Build fails after my change"
```bash
npm run build  # See exact error
# Check:
# - TypeScript errors (npm run build output)
# - Missing imports
# - Circular dependencies
```

### "Tests fail"
```bash
npm run test  # Re-run all tests
# If specific test fails:
npm run test -- --testNamePattern="test name"
```

### "Can't find file to edit"
```bash
find . -name "*.tsx" -path "*/live-tracker/*"
# This will find the file paths
```

### "Not sure if deletion is safe"
```bash
grep -r "filename" .  # Search for any imports
# 0 results = safe to delete
```

---

## 🚀 QUICK COMMAND REFERENCE

```bash
# Check current branch
git branch

# Create fix branch
git checkout -b fix/issue-N

# Make changes, then:
git add <file>
git commit -m "FIX: description"

# Test changes
npm run build
npm run test

# Push for PR
git push origin fix/issue-N

# Create PR on GitHub
# Ask for code review
# After approval:
git checkout main
git pull origin main
git merge fix/issue-N
git push origin main
```

---

## 📞 ESCALATION PATH

If you encounter issues:

1. **TypeScript error?** → Check CONFLICT_MAP for similar issues
2. **Test fails?** → Run `npm run test -- --verbose`
3. **Not sure about approach?** → Post question in remediation channel
4. **Risk concern?** → Escalate to Tech Lead before proceeding
5. **Lost?** → Read ARCHITECTURE_STABILIZATION_MASTER_PLAN_2026_05_11.md again

---

**Good luck! You're making the codebase more reliable for everyone. 🚀**
