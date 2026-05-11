# REMEDIATION PLAYBOOK — Basket-LVIV Conflicts
**Priority:** Executable fixes with step-by-step instructions  
**Date:** 2026-05-11

---

## QUICK WINS (Low Risk, High Impact)

### FIX #1: ChatPage setShopTicker Cleanup
**File:** `/d/n8n/basket-lviv/components/public/ChatPage.tsx`  
**Time:** 5 minutes  
**Risk:** Minimal (just adds cleanup)

#### Current (LINE 383)
```typescript
const t = setInterval(() => setShopTicker(n => n + 1), 19000);
// Missing return statement
```

#### Fix
```typescript
const t = setInterval(() => setShopTicker(n => n + 1), 19000);
return () => clearInterval(t);  // ← Add this line

// Or find the full useEffect and ensure it returns cleanup:
useEffect(() => {
  // ... other code ...
  const t = setInterval(() => setShopTicker(n => n + 1), 19000);
  
  return () => clearInterval(t);  // ← Cleanup function
}, [/* dependencies */]);
```

#### Verification
```bash
# Build check
npm run build

# Search for other uncleared intervals
grep -rn "setInterval" components/ lib/ --include="*.tsx" --include="*.ts" | grep -v "clearInterval"
```

---

### FIX #2: ChatPage Hydration Mismatch
**File:** `/d/n8n/basket-lviv/components/public/ChatPage.tsx`  
**Time:** 10 minutes  
**Risk:** Low (UI only)

#### Current Code (LINES 232-235)
```typescript
export default function ChatPage() {
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  // ... render logic that uses isMobile
```

#### Problem
```
Server renders with isMobile=false (because window undefined)
Client hydrates with same (false) but should be true on mobile
Layout flickers on mount
```

#### Fix Option A: Defer Content (SAFEST)
```typescript
export default function ChatPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Critical: Render nothing until mounted to prevent hydration mismatch
  if (!mounted) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
        <div>Загружаю...</div>
      </div>
    );
  }

  // Now safe to check window.innerWidth
  const isMobile = window.innerWidth < 768;

  return isMobile ? <ChatPageMobile /> : <ChatPageDesktop />;
}
```

#### Fix Option B: Use Dynamic Import (NEXT.js way)
```typescript
// At file top:
import dynamic from "next/dynamic";

const ChatPageMobile = dynamic(() => import("./ChatPageMobile"), { ssr: false });
const ChatPageDesktop = dynamic(() => import("./ChatPageDesktop"), { ssr: false });

export default function ChatPage() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(window.innerWidth < 768);
  }, []);

  return isMobile ? <ChatPageMobile /> : <ChatPageDesktop />;
}
```

#### Verification
```bash
# Open DevTools, check for hydration mismatch warning
# Network tab: should not see jank/reflow on page load
# Test on mobile and desktop viewports
```

---

### FIX #3: Delete Orphaned socketServer.ts
**File:** `/d/n8n/basket-lviv/src/socketServer.ts`  
**Time:** 5 minutes  
**Risk:** Very low (confirm not used first)

#### Verification
```bash
# Check if anything imports it
grep -rn "socketServer\|from.*socketServer" . --include="*.ts" --include="*.tsx" --include="*.js" | grep -v node_modules

# Check package.json scripts
grep socketServer package.json

# If both return empty, safe to delete
```

#### Action
```bash
# Backup first (git already has it)
rm /d/n8n/basket-lviv/src/socketServer.ts

# Commit
git add -A
git commit -m "Remove orphaned socketServer.ts (Firebase is primary realtime system)"
```

---

## MEDIUM COMPLEXITY (Medium Risk, Medium Impact)

### FIX #4: Firebase Listener Cleanup on Visibility Change
**File:** `/d/n8n/basket-lviv/components/public/RucheekGameCanvas.tsx`  
**Time:** 15 minutes  
**Risk:** Medium (realtime feature)

#### Current Pattern (PROBLEM)
```typescript
useEffect(() => {
  if (roomId) {
    const unsubscribePlayers = listenToPlayers(roomId, handlePlayersUpdate);
    const unsubscribeBall = listenToBall(roomId, handleBallUpdate);
    
    firebaseUnsubscribeRef.current.push(unsubscribePlayers, unsubscribeBall);
    
    return () => {
      firebaseUnsubscribeRef.current.forEach(unsubscribe => {
        unsubscribe();
      });
      firebaseUnsubscribeRef.current = [];
    };
  }
}, [roomId]);  // ← Listeners only cleaned when roomId changes
```

#### Fix: Add Visibility Handler
```typescript
useEffect(() => {
  if (!roomId) return;

  // Initial setup
  const unsubscribePlayers = listenToPlayers(roomId, handlePlayersUpdate);
  const unsubscribeBall = listenToBall(roomId, handleBallUpdate);
  
  firebaseUnsubscribeRef.current.push(unsubscribePlayers, unsubscribeBall);

  // NEW: Handle visibility changes
  const handleVisibility = () => {
    if (document.hidden) {
      // Page is hidden: cleanup listeners to save bandwidth
      firebaseUnsubscribeRef.current.forEach(unsub => unsub());
      firebaseUnsubscribeRef.current = [];
      console.log("🔴 Firebase: Hidden, listeners cleaned up");
    } else {
      // Page is visible again: only resubscribe if listeners were cleaned
      if (firebaseUnsubscribeRef.current.length === 0) {
        const newUnsub1 = listenToPlayers(roomId, handlePlayersUpdate);
        const newUnsub2 = listenToBall(roomId, handleBallUpdate);
        firebaseUnsubscribeRef.current.push(newUnsub1, newUnsub2);
        console.log("🟢 Firebase: Visible, listeners re-subscribed");
      }
    }
  };

  document.addEventListener("visibilitychange", handleVisibility);

  // Cleanup on unmount or roomId change
  return () => {
    document.removeEventListener("visibilitychange", handleVisibility);
    firebaseUnsubscribeRef.current.forEach(unsub => unsub());
    firebaseUnsubscribeRef.current = [];
  };
}, [roomId]);
```

#### Testing
```javascript
// In browser console while on RucheekGameCanvas page:
// Tab 1: Open console, type:
document.addEventListener("visibilitychange", () => {
  console.log("Visibility:", document.hidden ? "HIDDEN" : "VISIBLE");
});

// Switch to another tab (should log "Visibility: HIDDEN")
// Switch back (should log "Visibility: VISIBLE")

// Check: firebaseUnsubscribeRef listeners count should decrease/increase
```

---

### FIX #5: GameOnCourt Migration Audit (Staging Only)
**Files:**
- `/d/n8n/basket-lviv/prisma/migrations/20250508_add_time_tracking_to_gameoncourt/migration.sql`
- `/d/n8n/basket-lviv/prisma/schema.prisma`

**Time:** 20 minutes (staging), 5 minutes (production)  
**Risk:** HIGH (DB schema)

#### Step 1: Check Current DB
```bash
# Connect to Neon console or local test DB:
SELECT EXISTS(
  SELECT 1 FROM information_schema.tables 
  WHERE table_name = 'GameOnCourt'
);

# If TRUE: Table exists (migration already applied)
# If FALSE: Table doesn't exist (problem!)
```

#### Step 2: If Table Exists (Neon current state)
```bash
# Check columns added by migration 20250508:
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'GameOnCourt'
ORDER BY column_name;

# Expected columns: timeOnCourtSeconds, lastSubInTimestamp, isStarter
```

#### Step 3: Create Cleanup Migration (SAFE FIX)
```sql
-- File: prisma/migrations/20260511_drop_orphaned_gameoncourt/migration.sql
-- Purpose: Remove unused GameOnCourt table (data moved to BoxScore)

-- Backup (if paranoid):
-- SELECT * INTO gameoncourt_backup FROM "GameOnCourt";

-- Drop table
DROP TABLE IF EXISTS "GameOnCourt" CASCADE;
```

#### Step 4: Deploy Steps
```bash
# 1. Create migration
npx prisma migrate dev --name drop_orphaned_gameoncourt

# 2. Test on local DB
npx prisma db push

# 3. Test on staging
# (Tell DevOps to apply to staging first)
# vercel env pull --environment=staging
# npx prisma migrate deploy

# 4. Verify build still passes
npm run build

# 5. After staging verification, deploy to production
# vercel deploy --prod
```

---

### FIX #6: RosterPanel Memo Optimization
**File:** `/d/n8n/basket-lviv/components/live-tracker/LiveScoreTracker.tsx`  
**Lines:** 232-377, 719  
**Time:** 20 minutes  
**Risk:** Medium (performance tuning)

#### Current Problem
```
RosterPanel re-renders every 100ms (on timer tick) even if data unchanged
```

#### Fix: Extract granular props
```typescript
// BEFORE: Pass full game object
<RosterPanel 
  game={game}  // ← Changes on every state change
  // ...
/>

// AFTER: Pass only needed fields
const boxScoresForTeam = useMemo(
  () => game.boxScores.filter(bs => bs.teamId === (isHome ? game.homeTeamId : game.awayTeamId)),
  [game.boxScores, game.homeTeamId, game.awayTeamId, isHome]
);

<RosterPanel 
  boxScores={boxScoresForTeam}  // ← Only changes on substitution
  // ... other props without full `game`
/>
```

#### Alternative: Memo Wrapper
```typescript
// Wrap game prop with useMemo at call site
const memoizedGame = useMemo(
  () => game,
  [game.id, game.boxScores, game.homeTeamId, game.awayTeamId]
);

<RosterPanel
  game={memoizedGame}
  // ...
/>
```

#### Testing
```bash
# React DevTools Profiler:
# 1. Open React DevTools > Profiler
# 2. Record for 5 seconds while game is LIVE
# 3. Check RosterPanel render count:
#    - BEFORE: ~50 renders (every 100ms)
#    - AFTER: <5 renders (only on data change)
```

---

## HIGH COMPLEXITY (High Risk, Critical Impact)

### FIX #7: LiveScoreTracker Shadow State Elimination
**File:** `/d/n8n/basket-lviv/components/live-tracker/LiveScoreTracker.tsx`  
**Time:** 90 minutes  
**Risk:** VERY HIGH (core logic)

#### Current Architecture
```typescript
// Component receives initialGame prop from server
export default function LiveScoreTracker({ game: initialGame }: { game: GameWithAll }) {
  const router = useRouter();
  
  // ❌ Shadow state: Creates copy that diverges from server
  const [game, setGame] = useState<GameWithAll>(initialGame);

  // Sync effect tries to keep in sync
  useEffect(() => {
    setGame(initialGame);
  }, [initialGame.id, initialGame.status, ...]);

  // Actions update shadow state + router.refresh()
  recordGameAction() → setGame(result) + router.refresh()
  //                    ↑ Local update NOW  ↑ Server refresh LATER (async)
}
```

#### Target Architecture
```typescript
// Use initialGame directly (single source of truth from server)
export default function LiveScoreTracker({ game }: { game: GameWithAll }) {
  const router = useRouter();
  
  // NO shadow state
  // game = initialGame (from props)

  // Actions ONLY call server (no local optimistic update)
  recordGameAction() → await server → router.refresh()
  //                                    ↑ Server refresh brings new props
}
```

#### Migration Steps

**STEP 1: Remove useState for game**
```typescript
// ❌ DELETE:
const [game, setGame] = useState<GameWithAll>(initialGame);

// Component now uses game directly from props
```

**STEP 2: Remove useEffect sync**
```typescript
// ❌ DELETE:
useEffect(() => {
  setGame(initialGame);
}, [initialGame.id, initialGame.status, ...]);
```

**STEP 3: Remove local optimistic updates**
```typescript
// ❌ CHANGE:
const result = await recordGameAction({...});
if (result.success && result.updatedGame) {
  setGame(result.updatedGame);  // ← DELETE THIS LINE
  router.refresh();
}

// ✅ TO:
const result = await recordGameAction({...});
if (result.success) {
  router.refresh();  // ← Only refresh from server
}
```

**STEP 4: Update action handlers to not rely on local state**
```typescript
// recordAction() callback (LINE 569-641)
// Currently reads: game, gameTimeLeft, etc. from closure

// Must change to always use:
// - initialGame instead of game
// - currentTimeLeft from DB instead of gameTimeLeft state

const recordAction = useCallback(async (actionType: string, payload = {}) => {
  if (!selectedPlayerId && !["START_GAME", ...].includes(actionType)) return;

  try {
    const result = await recordGameAction({
      gameId: game.id,  // ← Now: always initialGame.id
      actionType,
      gameClockSeconds: gameTimeLeft,  // ← Still needed for timer
      // ...
    });

    if (result.success) {
      router.refresh();  // ← Single source of sync
    }
  } catch (error) {
    console.error("Error:", error);
  }
}, [game.id, gameTimeLeft]);  // ← Still need these for action data
```

**STEP 5: Keep timer state separate (necessary)**
```typescript
// gameTimeLeft is OK to keep as separate state
// (it's UI state, not business logic state)
const [gameTimeLeft, setGameTimeLeft] = useState(initialGame.currentTimeLeft || 600);

useEffect(() => {
  // Timer logic stays as-is
  if (!isLive) return;
  
  const interval = setInterval(() => {
    setGameTimeLeft(prev => Math.max(0, prev - 0.1));
  }, 100);

  return () => clearInterval(interval);
}, [isLive, game.id]);
```

#### Testing Checklist
```
[ ] Build passes (npm run build)
[ ] Component renders without errors
[ ] Timer updates every 100ms
[ ] +2 button: action → router.refresh() → game updates
[ ] Substitution: action → router.refresh() → RosterPanel updates
[ ] F5 reload: page loads with current game state (no stale data)
[ ] Modal: action recorded, modal closes, data persists after F5
[ ] Race condition test:
    - Click +2 at 10:00
    - Immediately click +3 at 9:58
    - Both should record (no data loss)
```

#### Rollback Plan
```bash
git revert [commit-hash]  # If things break
```

---

## DEPLOYMENT ORDER

### Phase 1: Quick Wins (No Risk)
1. **FIX #1:** ChatPage setShopTicker cleanup
   - Deploy: Next regular release
   - Risk: None
   
2. **FIX #2:** ChatPage hydration mismatch
   - Deploy: Next regular release
   - Risk: None

3. **FIX #3:** Delete socketServer.ts
   - Deploy: Next regular release
   - Risk: None

### Phase 2: Stability (Medium Risk)
4. **FIX #4:** Firebase visibility listener
   - Deploy: After Phase 1 verified
   - Risk: Medium (realtime feature)
   - Test: 30 minutes on staging

5. **FIX #5:** GameOnCourt migration cleanup
   - Deploy: After Phase 1 verified
   - Risk: High (DB schema)
   - Test: 1 hour on staging

6. **FIX #6:** RosterPanel memo optimization
   - Deploy: After Phase 2 verified
   - Risk: Medium (performance)
   - Test: Profiler on staging

### Phase 3: Architecture (Very High Risk)
7. **FIX #7:** LiveScoreTracker shadow state
   - Deploy: After Phase 2 fully verified
   - Risk: Very High (core logic)
   - Test: 3+ hours on staging, E2E tests

---

## VERIFICATION CHECKLIST BY PHASE

### Phase 1 Quick Wins
```
[ ] Build succeeds: npm run build
[ ] No TypeScript errors
[ ] Unit tests pass: npm test
[ ] Local dev works: npm run dev
[ ] Deploy to staging
[ ] Staging smoke tests pass
```

### Phase 2 Stability
```
[ ] ChatPage loads without errors
[ ] ChatPage doesn't log "setState on unmounted component"
[ ] Firebase listeners active when visible, inactive when hidden
[ ] GameOnCourt migration applies cleanly
[ ] RosterPanel renders < 5 times per substitution
[ ] Browser console: No hydration warnings
```

### Phase 3 Architecture
```
[ ] Full E2E game scenario:
    - Create new game
    - Start game (timer ticks)
    - Add players
    - Record +2 (persists after F5)
    - Substitution (data syncs)
    - Timer works correctly
    - End game (no stale data)
[ ] Stress test: 10 rapid actions
[ ] F5 recovery: Reload during live game (no data loss)
[ ] Browser DevTools: No memory leaks (check heap growth)
```

---

## MONITORING POST-DEPLOYMENT

### Key Metrics
```
1. Timer drift (should be < 1 second per minute)
2. RosterPanel re-render count (should be < 5 per game)
3. Memory usage (should not grow >100MB during 30-min game)
4. Listener count (should be 0-2, not 10+)
5. Server refresh latency (should be < 2 seconds)
```

### Alert Thresholds
```
🔴 CRITICAL:
  - Memory > 300MB
  - Timer drift > 5 seconds
  - Router refresh > 10 seconds
  - Listener count > 20

🟠 WARNING:
  - Memory > 200MB
  - Timer drift > 2 seconds
  - Router refresh > 5 seconds
  - Listener count > 5
```

---

**Generated by:** Claude Code Forensic Audit  
**Next Review:** 2026-05-25 (post-deployment monitoring)
