# DIAGNOSTIC REPORT 3: SAFE CLEANUP & REFACTORING PLAN

**Generated:** 2026-05-11

---

## I. PHASE-BASED CLEANUP STRATEGY

### PHASE A: SAFE TO DELETE (Zero Risk)

These can be removed immediately without any dependencies.

#### A1. Backup Files

| File | Size | Reason | Action |
|------|------|--------|--------|
| `./components/live-tracker/LiveScoreTracker.tsx.backup` | 51KB | Tracked in git, use `git log` to recover | **DELETE** |
| Any `.backup` or `.old` files in repo | - | Should live in `backups/` folder or git history | **DELETE** |

**Steps:**
```bash
# 1. Verify no active references
grep -r "LiveScoreTracker.tsx.backup" . --include="*.ts" --include="*.tsx"
# (Should return: 0 matches)

# 2. Add to .gitignore
echo "*.backup" >> .gitignore
echo "*.old" >> .gitignore

# 3. Delete from repo
rm ./components/live-tracker/LiveScoreTracker.tsx.backup
git add .gitignore
git commit -m "chore: remove backup files, add to .gitignore"
```

---

#### A2. Duplicate Time Formatting Functions

**Location:**
- `lib/format-time.ts` (create new)
- `game-events.ts` (line 20-24): `formatTime()`
- `game/[id]/page.tsx` (line 21-26): `formatCourtTime()`

**Action:**

1. **Create `lib/format-time.ts`:**
```typescript
/**
 * Format seconds to MM:SS format
 * @param seconds - Total seconds (e.g., 330 = 5:30)
 * @returns Formatted string "MM:SS" (e.g., "5:30")
 */
export function formatTime(seconds: number, defaultZero = "0:00"): string {
  if (seconds === 0) return defaultZero;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/**
 * Alias for consistency
 */
export const formatCourtTime = formatTime;
```

2. **Update imports:**
```typescript
// game-events.ts
import { formatTime } from "@/lib/format-time";
// Remove local definition at line 20-24

// game/[id]/page.tsx
import { formatCourtTime } from "@/lib/format-time";
// Remove local definition at line 21-26
```

3. **Commit:**
```bash
git add lib/format-time.ts
git commit -m "refactor: extract time formatting to shared lib"
```

---

#### A3. Test Routes (Development Only)

| Route | Purpose | Risk |
|-------|---------|------|
| `/api/test-game-action/route.ts` | Testing game actions | ✅ Safe (dev only) |
| `/api/test-imports/route.ts` | Testing imports | ✅ Safe (dev only) |
| `/api/debug-env/route.ts` | Debug environment | ✅ Safe (dev only) |
| `/api/debug/hero-bg/route.ts` | Debug background | ✅ Safe (dev only) |

**Action:** Remove in production, add to `.env.local`:
```bash
# .env.local
SKIP_DEBUG_ROUTES=true
```

Then wrap routes:
```typescript
// api/test-game-action/route.ts
if (process.env.SKIP_DEBUG_ROUTES === "true") {
  return NextResponse.json({ error: "Not available" }, { status: 404 });
}
```

---

### PHASE B: REQUIRES TESTING & MIGRATION

These should be refactored but require validation.

#### B1. Legacy BoxScore Fields

**Fields to Deprecate:**
```prisma
// Deprecated, redundant fields
fgMade          // Use: fg2Made + fg3Made
fgAttempted     // Use: fg2Attempted + fg3Attempted
missedFg2       // Use: fg2Attempted - fg2Made
missedFg3       // Use: fg3Attempted - fg3Made
missedFt        // Use: ftAttempted - ftMade
fouls           // Use: foulsPersonal + foulsTechnical + foulsUnsports + foulsDisq
minutes         // Use: Math.floor(timeOnCourtSeconds / 60)
```

**Migration Plan:**

1. **Audit:** Find where these are used
```bash
grep -r "\.fgMade\|\.fgAttempted\|\.fouls" app/ --include="*.ts" --include="*.tsx"
```

2. **Create migration:**
```sql
-- migration: remove_deprecated_boxscore_fields.sql
ALTER TABLE "BoxScore" DROP COLUMN "fgMade";
ALTER TABLE "BoxScore" DROP COLUMN "fgAttempted";
ALTER TABLE "BoxScore" DROP COLUMN "missedFg2";
ALTER TABLE "BoxScore" DROP COLUMN "missedFg3";
ALTER TABLE "BoxScore" DROP COLUMN "missedFt";
ALTER TABLE "BoxScore" DROP COLUMN "minutes";
-- KEEP "fouls" for backward compatibility (add constraint to ensure = sum of others)
```

3. **Update schema:**
```prisma
model BoxScore {
  // Remove deprecated fields
  // REMOVED: fgMade, fgAttempted, missedFg*, minutes
  
  // Add computed property (non-DB):
  // fgMade = fg2Made + fg3Made
  // foulsTotal = foulsPersonal + foulsTechnical + foulsUnsports + foulsDisq
}
```

4. **Test:**
- Run all game scenarios
- Verify stats display correctly
- Check leaderboards

---

#### B2. Duplicate API Routes for Score Updates

**Routes to consolidate:**
```
/api/games/[id]/score             (Legacy, simple)
/api/admin/games/[id]/stat        (Admin, direct)
/api/admin/games/[id]/boxscore    (Admin, bulk)
```

**Recommendation: Keep only `recordGameAction()` server action**

**Migration Steps:**

1. **Add routing layer** to redirect old endpoints:
```typescript
// api/games/[id]/score/route.ts (DEPRECATED)
export async function POST(req, { params }) {
  // Log deprecation warning
  console.warn(`[DEPRECATED] /api/games/[id]/score used. Migrate to recordGameAction()`);
  
  // Forward to server action (requires conversion)
  return NextResponse.json({ 
    error: "Use recordGameAction() server action instead" 
  }, { status: 410 /* Gone */ });
}
```

2. **Update client code:**
   - Search: `fetch('/api/games/[id]/score'`
   - Replace: `recordGameAction()`

3. **Timeline:**
   - Day 1-7: Dual operation (both work)
   - Day 8-14: Legacy endpoints log deprecation warnings
   - Day 15+: Disable legacy endpoints (return 410 Gone)
   - Day 30: Remove legacy endpoint code

---

#### B3. Missing Revalidation in Stat Endpoint

**File:** `/api/admin/games/[id]/stat/route.ts`

**Issue:** Missing `revalidatePath()` after update

**Fix:**
```typescript
import { revalidatePath } from "next/cache";

export async function POST(req, { params }) {
  try {
    const gameId = parseInt(params.id);
    const { playerId, stat, value = 1 } = await req.json();

    const boxScore = await prisma.boxScore.update({
      where: { gameId_playerId: { gameId, playerId } },
      data: { [stat]: { increment: value } },
    });

    // ADD THIS:
    revalidatePath(`/admin/games/${gameId}`);
    revalidatePath(`/game/${gameId}`);
    revalidatePath('/leaders');

    return NextResponse.json({ ok: true, boxScore });
  } catch (error) {
    console.error("Stat update error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
```

---

### PHASE C: DO NOT CHANGE (Critical Dependencies)

These are core to game functionality and should NOT be modified without extensive testing.

#### C1. BoxScore Schema

```prisma
model BoxScore {
  gameId                  Int      // ← Primary key component
  playerId                Int      // ← Primary key component
  
  points                  Int      // ← SSOT for player points
  rebounds                Int      // ← SSOT for rebounds
  assists                 Int      // ← SSOT for assists
  
  isOnCourt               Boolean  // ← SSOT for court status
  lineupPosition          Int      // ← SSOT for position (1-5 active, 0 bench)
  enteredAt               Int?     // ← SSOT for entry time
  timeOnCourtSeconds      Int      // ← SSOT for accumulated time
  
  shiftStartHomeScore     Int      // ← Required for +/- calculation
  shiftStartAwayScore     Int      // ← Required for +/- calculation
  plusMinus               Int      // ← Calculated stat
}
```

**Why immutable:**
- Removing any field breaks game state tracking
- Changing data types breaks substitution logic
- Reordering keys confuses Prisma unique constraint

---

#### C2. Game Event Types

```typescript
enum GameEventType {
  START_GAME
  START
  PAUSE
  END_GAME
  NEXT_QUARTER
  POINTS
  MISS_1P, MISS_2P, MISS_3P, MISS_FT
  REBOUND_OFF, REBOUND_DEF
  ASSIST
  STEAL
  BLOCK
  TURNOVER
  FOUL, FOUL_TECHNICAL, FOUL_UNSPORTSMANLIKE, FOUL_DISQUALIFYING
  TIMEOUT
  SUBSTITUTION
}
```

**Why immutable:**
- Event log is permanent (audit trail)
- Stats calculations depend on type matching
- FIBA reports require specific event types

---

#### C3. recordSubstitution() Logic

```typescript
// DO NOT CHANGE:
const timeAdded = gameClockSeconds - enteredAtValue;  // ← Exact semantics
const newTimeOnCourtSeconds = (playerOut.timeOnCourtSeconds || 0) + Math.max(0, timeAdded);
lineupPosition: outPosition;  // ← Inherited, not new value
shiftStartHomeScore: game.homeScore;  // ← Current scores at entry
```

**Why immutable:**
- Court time accumulation depends on exact formula
- Position inheritance enables lineup continuity
- Shift scores are basis for +/- calculation

---

#### C4. Game Status Transitions

```
SCHEDULED → LIVE → PAUSED ↔ LIVE → FINISHED
                    └─→ LIVE ─┘
```

**Do NOT add new statuses** without:
1. Schema migration
2. All state machine tests
3. UI updates
4. API validation updates

---

## II. REFACTORING DEPENDENCY GRAPH

```
recordGameAction()
  ↓
  ├─→ GameEvent.create()
  ├─→ BoxScore.update()
  ├─→ Game.update()
  └─→ revalidatePath()
        ↓
        ├─→ /game/[id]
        ├─→ /admin/games/[id]
        └─→ /leaders

recordSubstitution()
  ↓
  ├─→ BoxScore.findUnique() [playerOut]
  ├─→ BoxScore.findUnique() [playerIn]
  ├─→ Game.findUnique()
  ├─→ BoxScore.update() [playerOut]
  ├─→ BoxScore.update() [playerIn]
  ├─→ GameEvent.create()
  └─→ revalidatePath()

initializeGameData()
  ↓
  ├─→ Game.findUnique()
  ├─→ BoxScore.upsert() [for each player]
  └─→ No revalidation (called within transaction)
```

---

## III. REFACTORING SEQUENCE

### Step 1: Extract Utilities (Week 1)
- [ ] Extract time formatting to `lib/format-time.ts`
- [ ] Extract form schemas to `lib/schemas/`
- [ ] Audit imports, update 10-15 files
- [ ] Test: `npm run build`
- [ ] Commit: "refactor: extract shared utilities"

### Step 2: Fix Critical Bugs (Week 2)
- [ ] **CRITICAL:** Add transaction to `/api/admin/games/[id]/stat`
- [ ] **CRITICAL:** Replace deleteMany in `/api/admin/games/[id]/boxscore` with upsert
- [ ] Add idempotency to `/api/games/[id]/score` or deprecate
- [ ] Add missing revalidatePath calls
- [ ] Test: Full game scenario (init → play → sub → end)
- [ ] Commit: "fix: add transactional integrity to stat endpoints"

### Step 3: Deprecate Legacy Endpoints (Week 3)
- [ ] Add deprecation warnings to old API routes
- [ ] Log warnings in production
- [ ] Redirect to 410 Gone with helpful message
- [ ] Test: Old clients fail gracefully
- [ ] Commit: "deprecation: legacy score endpoints marked for removal"

### Step 4: Remove Deprecated DB Fields (Week 4)
- [ ] Create Prisma migration: `prisma migrate create remove_deprecated_fields`
- [ ] Update schema: remove unused fields
- [ ] Update computed properties
- [ ] Test: Full game with all stats
- [ ] Commit: "refactor: remove deprecated boxscore fields"

### Step 5: Final Cleanup (Week 5)
- [ ] Remove test/debug API routes from production build
- [ ] Clean up comments and console.logs
- [ ] Run full test suite
- [ ] Performance audit
- [ ] Commit: "chore: cleanup test routes and logs"

---

## IV. TESTING CHECKLIST

### Before Each Cleanup Phase

```bash
# 1. Full build
npm run build

# 2. Type check
npx tsc --noEmit

# 3. Test game scenarios
npm run test -- __tests__/game-scenarios.test.ts

# 4. Manual E2E
- Start new game
- Add scores
- Substitute players
- Verify UI updates
- Check database
- Verify protocol renders

# 5. Revert test
git stash
# (Ensure system still works with changes reverted)
git stash pop
```

---

## V. DEPENDENCY CHECKLIST

| Component | Dependencies | Status | Can Delete? |
|-----------|---|---|---|
| LiveScoreTracker | recordGameAction, recordSubstitution | ACTIVE | ❌ NO |
| GameProtocol | Game, GameEvent, BoxScore | ACTIVE | ❌ NO |
| RecordGameAction | GameEvent, BoxScore, Game | ACTIVE | ❌ NO |
| formatTime | None (pure function) | ACTIVE | ✅ YES (extract) |
| /api/games/[id]/score | recordGameAction (via server) | LEGACY | ✅ YES (deprecate) |
| /api/admin/games/[id]/stat | recordGameAction (via server) | LEGACY | ✅ YES (deprecate) |
| Legacy DB fields | None (computed) | LEGACY | ✅ YES (migrate) |
| Test routes | None (isolated) | DEV | ✅ YES (remove) |

---

## VI. ROLLBACK PLAN

If cleanup breaks production:

```bash
# 1. Identify breaking commit
git log --oneline -10

# 2. Revert to safe commit
git revert <commit-hash>

# 3. Deploy revert
npm run build && vercel deploy

# 4. Investigate
git diff <commit-hash>
grep -r "new-code" app/

# 5. Fix locally
# ... make changes ...

# 6. Re-test before re-deploying
```

---

## VII. FINAL REFACTORING MANIFEST

```
SAFE TO DELETE (PHASE A):
├─ LiveScoreTracker.tsx.backup (51KB)
└─ Any *.backup files

REQUIRES MIGRATION (PHASE B):
├─ /api/games/[id]/score (legacy)
├─ /api/admin/games/[id]/stat (legacy)
├─ Legacy BoxScore fields (fgMade, minutes, etc.)
└─ Duplicate time formatting

DO NOT CHANGE (PHASE C):
├─ BoxScore schema core fields
├─ GameEvent types enum
├─ recordSubstitution() logic
└─ Game status transitions
```

---

**End of Report 3**

Next: See DIAGNOSTIC_REPORT_4_PRODUCTION_RISKS.md
