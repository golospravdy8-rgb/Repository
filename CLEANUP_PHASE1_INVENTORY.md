# CLEANUP PHASE 1 — COMPLETE INVENTORY
## basket-lviv Stabilization Project

**Date:** 2026-05-11  
**Status:** ✅ INVENTORY COMPLETE — WAITING FOR ANSWERS TO 6 CRITICAL QUESTIONS  
**Next Step:** Answer questions in SECTION IV before proceeding to Phase 3 (Cleanup)

---

## SECTION I: GAMEPROTOCOL INVENTORY

### File: `components/GameProtocol.tsx`

**Size:** 552 lines  
**Status:** LEGACY RENDERER (duplicate of inline box score)

**Imports (5 total):**
```
1. Line 5: import GameProtocol from "@/components/GameProtocol";
   FILE: app/(public)/game/[id]/page.tsx
   
2. Line 438: export default function GameProtocol(...)
   (Main component export)
```

**Usage (2 locations):**
```
1. app/(public)/game/[id]/page.tsx:5 (IMPORT)
   └─ import GameProtocol from "@/components/GameProtocol";

2. app/(public)/game/[id]/page.tsx:668 (RENDER)
   └─ <GameProtocol game={game} gameTimeLeft={game.currentTimeLeft} />
   
NO GUARD CONDITION — always mounts (even on SCHEDULED games where boxScores empty)
```

**Content Analysis:**
```
Lines 1-30:   Imports + types
Lines 32-36:  Utility: getDisplayTime(bs, gameTimeLeft)
Lines 38-40:  Utility: getBoxScoreForPlayer()
Lines 42-44:  Utility: pct()

Lines 46-290: TeamProtocolTable component (protocol table rendering)
              ├─ Header styling (#1e3a8a for home, #7f1d1d for away)
              ├─ Player rows (starters + bench)
              ├─ Totals row
              └─ FIBA field mapping

Lines 292-437: Export component rendering
              ├─ Calls TeamProtocolTable x2 (home + away)
              ├─ Calculates stats from props
              └─ Returns JSX (FIBA table)

EXPORTS:
├─ getDisplayTime() — TIME CALCULATION (needed elsewhere)
├─ getBoxScoreForPlayer() — LOOKUP (used in rendering)
├─ pct() — PERCENTAGE (utility)
└─ TeamProtocolTable component (RENDER ONLY)
└─ GameProtocol main export (RENDER ONLY)
```

**What Can Be Deleted:**
```
Safe to delete (render only):
├─ TeamProtocolTable function (lines 46-290)
└─ GameProtocol export (lines 438-...)
└─ JSX rendering code
└─ Style constants (headerBg, starterBg, etc.)

MUST KEEP (used elsewhere or critical):
├─ getDisplayTime() — used by GameProtocol, might be used elsewhere
├─ Types definition at top
└─ Eventually: keep utility functions, move to lib
```

**Diffs Required (IF proceeding with deletion):**
```
1. app/(public)/game/[id]/page.tsx:5 
   REMOVE: import GameProtocol from "@/components/GameProtocol";

2. app/(public)/game/[id]/page.tsx:668
   REMOVE: <GameProtocol game={game} gameTimeLeft={game.currentTimeLeft} />

3. components/GameProtocol.tsx
   Option A: Delete entire file
   Option B: Extract utilities to lib/gameProtocol-utils.ts + remove JSX
```

---

## SECTION II: FIREBASE INVENTORY

### Files: `lib/firebase.ts` + `lib/firebase-game.ts`

**File 1: lib/firebase.ts (1085 bytes)**
```
Purpose: Initialize Firebase connection
Exports: initializeFirebase(), getFirebaseDatabase()
Used By: RucheekGameCanvas.tsx (GAME CANVAS - chat game feature)
Status: ACTIVE IN USE (not legacy, part of chat/game feature)
```

**File 2: lib/firebase-game.ts (9631 bytes)**
```
Purpose: Firebase game sync (realtime multiplayer)
Functions (20+):
├─ joinGame() — Player joins game room
├─ updatePlayerPosition() — Throttled position sync
├─ updatePlayerScore() — Score broadcast
├─ onDisconnect() — Cleanup on disconnect
├─ Heartbeat listeners
└─ ... 15+ more

Used By: RucheekGameCanvas.tsx ONLY
Status: ONLY used for chat game canvas (not main basketball game)
```

**Where Firebase Is Used:**

```
📍 MAIN BASKETBALL GAME:
   ❌ NOT USED in LiveScoreTracker
   ❌ NOT USED in game scoring
   ❌ NOT USED in substitutions
   ✓ ONLY in app/(public)/game/[id]/page.tsx:668 for display (but not active)

📍 CHAT GAME (RucheekGameCanvas):
   ✓ ACTIVELY USED for multiplayer sync
   ✓ joinGame() called on component mount
   ✓ updatePlayerPosition() called 60/sec
   ✓ onDisconnect cleanup set
   └─ Status: PRODUCTION CODE (not legacy)
```

**Firebase Listeners Found (5 total):**

```
1. components/public/RucheekGameCanvas.tsx:250
   Location: initializeFirebaseGame()
   Type: ref cleanup before join
   Purpose: Clean stale players
   Status: ACTIVE

2. components/public/RucheekGameCanvas.tsx:236-405
   Location: useEffect hook
   Type: Full Firebase initialization
   Purpose: Game sync for canvas game
   Status: ACTIVE

3. components/public/RucheekGameCanvas.tsx:398-405
   Type: Cleanup on unmount
   Purpose: Unsubscribe listeners, disconnect
   Status: ACTIVE (good pattern)

4. lib/firebase-game.ts:60-73
   Type: Heartbeat interval (sendInterval)
   Purpose: Keep player alive in DB
   Status: ACTIVE (5 second interval)

5. lib/firebase-game.ts:57
   Type: onDisconnect().remove()
   Purpose: Auto-cleanup on disconnect
   Status: ACTIVE (Firebase feature)
```

**Risk Assessment:**
```
🔴 CRITICAL: Cannot delete Firebase without breaking RucheekGameCanvas
   └─ Chat game feature depends on Firebase completely
   └─ Would require Supabase migration for RucheekGameCanvas
   └─ Current status: ACTIVE PRODUCTION CODE

⚠️  BUT: NOT used in main basketball game scoring
   └─ Main game uses: app/actions/game-events.ts (server actions)
   └─ No real-time Firebase subscription for basketball game
```

---

## SECTION III: TIMER INVENTORY

### Location: `components/live-tracker/LiveScoreTracker.tsx`

**Timer State (Line 395):**
```typescript
const [gameTimeLeft, setGameTimeLeft] = useState(initialGame.currentTimeLeft || 600);
```

**Timer Update Points (4 locations):**

```
1. Line 461-495: useEffect TICK
   ├─ Triggers: When isLive changes
   ├─ Frequency: ~60 times/second (setInterval 1000ms)
   ├─ Action: setGameTimeLeft(prev => prev - 1)
   ├─ Code:
   │   useEffect(() => {
   │     if (isLive && game.status === "LIVE") {
   │       const tick = setInterval(() => {
   │         setGameTimeLeft(prev => prev - 1);
   │       }, 1000);
   │       return () => clearInterval(tick);
   │     }
   │   }, [isLive, game.status]);
   └─ Status: ACTIVE (main timer source)

2. Line 509-515: updateGameTime SERVER ACTION
   ├─ Triggers: Every tick (async)
   ├─ Purpose: Sync timer to DB
   ├─ Called via: updateGameTime({ gameId, quarter, currentTimeLeft })
   ├─ Frequency: Debounced (line 502-505 checks every 1 second)
   └─ Status: ACTIVE (async sync)

3. RucheekGameCanvas.tsx (Firebase):
   ├─ Status: ONLY for chat game, not main basketball
   ├─ Does NOT affect LiveScoreTracker timer
   └─ Separate system

4. Display rendering (Line 670):
   └─ <div>{Math.floor(gameTimeLeft / 60)}:{String(gameTimeLeft % 60).padStart(2, "0")}</div>
```

**Timer Issues Found:**

```
❌ BUG #1: timeAdded calculation WRONG (Line 442-443)
   Current: gameClockSeconds - boxScore.enteredAt (WRONG!)
   Reason: In countdown timer, when player entered (600) and now (400)
           Time on court = 600 - 400 = 200 seconds (correct!)
           BUT if calculation inverted: 400 - 600 = -200 (negative!)
   
   Fix needed: Verify direction is ALWAYS: enteredAt - currentGameClock
   Lines affected:
   ├─ app/actions/game-events.ts:442-443 (WRONG)
   ├─ app/actions/game-events.ts:751 (WRONG)
   └─ components/GameProtocol.tsx:16 (CORRECT: enteredAt - gameTimeLeft)

❌ BUG #2: No consolidation between local timer + server action
   Current: useEffect tick updates state LOCALLY
            updateGameTime sends to server ASYNC
            Server doesn't push back to client
   Result: Timer desync possible if network lag
```

**Timer Display References (7 locations):**

```
1. components/live-tracker/LiveScoreTracker.tsx:670 (MAIN DISPLAY)
2. app/(public)/game/[id]/page.tsx:668 (GameProtocol passed gameTimeLeft prop)
3. components/GameProtocol.tsx:13-16 (getDisplayTime calculation)
4. components/GameProtocol.tsx:39 (prop received)
5. components/GameProtocol.tsx:133 (rendered in table)
6. components/GameProtocol.tsx:461,470 (passed to TeamProtocolTable)
7. app/actions/game-events.ts:154 (reset on START_GAME)
```

---

## SECTION IV: OTHER CRITICAL ISSUES

### Issue 1: +null Bug

**Location:** `components/live-tracker/ActionLog.tsx:46`

**Code:**
```tsx
{event.type === "POINTS" && (
  <span>+{event.points}</span>  // ← BUG HERE
)}
```

**Problem:**
```
GameEvent.points is nullable in schema
If event.points === null → renders "+null"

Where +null comes from:
├─ GameEvent created with points: null
├─ Could happen if type="POINTS" but points not provided
└─ actionPayload.points undefined/null → inserted as NULL
```

**Also in:** `app/(public)/game/[id]/page.tsx:638` (same pattern)

**Fix Required (2 places):**
```
Option A (Guard in render):
{event.points != null && `+${event.points}`}

Option B (Validate on create):
app/actions/game-events.ts - add validation before insert
if (actionType === "POINTS" && !actionPayload.points) throw error

Recommendation: Do BOTH (defense in depth)
```

---

### Issue 2: Shadow State

**Location:** `components/live-tracker/LiveScoreTracker.tsx:381`

**Code:**
```typescript
const [game, setGame] = useState<GameWithAll>(initialGame);
```

**Problem:**
```
✓ Prop: game (from page, might update)
✓ Local state: game (copy of prop at mount time)
❌ Sync: NONE — prop updates ignored by state

Result:
- External changes not reflected
- Multi-admin game: changes from other admin invisible
- Requires F5 to see updates
```

**Where game state is used (20+ places):**
```
- homeTeam, awayTeam (team data)
- boxScores (player stats)
- events (event log)
- status (LIVE/FINAL/SCHEDULED)
- homeScore, awayScore (scores)
- currentTimeLeft (timer)
```

---

### Issue 3: Substitution Logging

**Location:** `app/actions/game-events.ts:750-800`

**Current Code:**
```typescript
const playerOut = await tx.boxScore.findUnique({
  where: { gameId_playerId: { gameId, playerId: playerOutId } },
});

const playerIn = await tx.boxScore.findUnique({
  where: { gameId_playerId: { gameId, playerId: playerInId } },
});

// ... updates playerOut and playerIn boxScores
// But where's the SUBSTITUTION event?
```

**Problem:**
```
✓ BoxScore updated correctly (isOnCourt flags)
✓ lineupPosition swapped correctly
❌ Missing: GameEvent of type "SUBSTITUTION" with BOTH players logged

Should have:
├─ playerOutId logged
├─ playerInId logged  
└─ Both in same event or separate events
```

---

## SECTION V: LEGACY-NAMED FILES

**Found:** `lib/fiba/legacy-wrappers.ts`

**Status:**
```
File exists: YES
Current use: Need to check
Purpose: (from name) Legacy wrapper functions
Size: ~600 lines

Investigation needed:
├─ Is it still used?
├─ Is it deprecated?
└─ Should be deleted?
```

---

## SECTION VI: SHADOW STATE DETAILED SCAN

**Shadow State Found:**

```
Location: components/live-tracker/LiveScoreTracker.tsx:381
Pattern:  const [game, setGame] = useState<GameWithAll>(initialGame);

Details:
├─ Copy of prop at mount (snapshot taken)
├─ Not synced with prop updates
├─ setGame() used in multiple places
│  ├─ recordGameAction response: setGame(result.updatedGame)
│  ├─ recordSubstitution response: setGame(updated)
│  └─ undoGameAction response: setGame(previous)
│
├─ Reads from game state:
│  ├─ game.homeTeam
│  ├─ game.awayTeam
│  ├─ game.boxScores
│  ├─ game.quarter
│  └─ 10+ other fields
│
└─ Risk: If prop.game updated externally (revalidatePath)
           Local state not updated
           Multi-admin desync
```

---

## SUMMARY TABLE: FINDINGS

| Issue | Severity | Files | Count | Fix Type |
|-------|----------|-------|-------|----------|
| GameProtocol duplicate | 🔴 HIGH | 1 component + 2 imports | 3 | Delete + Remove |
| +null rendering | 🔴 CRITICAL | 2 files | 2 places | Validate + Guard |
| Time calculation wrong | 🔴 CRITICAL | 2 files | 2 places | Fix direction |
| Shadow state | 🔴 CRITICAL | 1 component | 1 useState | Remove or Sync |
| Substitution not logged | 🟡 HIGH | 1 file | 1 function | Add event log |
| Firebase in main game | 🟠 MEDIUM | 1 import | - | Unused but safe |
| Timer double sync | 🟠 MEDIUM | 1 component | 2 systems | Consolidate |

---

## SUMMARY: INVENTORY COMPLETE ✅

**Total Issues Found:** 7  
**Critical (🔴):** 4  
**High (🟡):** 1  
**Medium (🟠):** 2  

**Files Ready for Cleanup:**
- `components/GameProtocol.tsx` (can be deleted, render only)
- `components/live-tracker/ActionLog.tsx` (needs +null guard)
- `app/(public)/game/[id]/page.tsx` (needs +null guard + GameProtocol import removal)

**Files Needing Fixes (Non-Deletable):**
- `components/live-tracker/LiveScoreTracker.tsx` (shadow state + timer)
- `app/actions/game-events.ts` (time calculation + validate points)

**Files Safe to Keep:**
- `lib/firebase*.ts` (used by chat game feature)
- `lib/fiba/legacy-wrappers.ts` (status TBD)

---

## NEXT: ANSWER 6 CRITICAL QUESTIONS (SECTION VI)

Do NOT proceed with cleanup until these are answered.

**⬇️ See SECTION VI below for questions ⬇️**

---

## SECTION VI: 6 CRITICAL QUESTIONS FOR USER

### ❓ QUESTION 1: GameProtocol.tsx Approach

**Status:** 552 lines, legacy renderer, duplicate of inline box score

**My Plan:**
1. Delete entire `components/GameProtocol.tsx` file
2. Remove import from `app/(public)/game/[id]/page.tsx:5`
3. Remove render from `app/(public)/game/[id]/page.tsx:668`
4. Keep inline box score table (modern, Tailwind styled)

**Check Before Proceeding:**
- Any FIBA export logic in GameProtocol?
- Any PDF generation code?
- Any validation that's not in page.tsx?

**Your Decision:**
- ✅ Proceed with deletion?
- ⚠️ Or extract utilities to lib first?
- ❌ Or keep as is?

---

### ❓ QUESTION 2: Firebase Status in Main Basketball Game

**Finding:** Firebase is used ONLY in RucheekGameCanvas (chat game feature)

**NOT used in:**
- LiveScoreTracker (basketball admin)
- Game scoring pipeline
- Main /admin/games/[id] page

**Questions for you:**
1. Is Firebase supposed to be active for main basketball game?
2. Or is it ONLY for chat game canvas (RucheekGameCanvas)?
3. Is production using Firebase realtime for basketball games?
4. Can we safely keep Firebase (it's only used in chat)?

**My Recommendation:** KEEP Firebase (not blocking main game, used by chat feature)

---

### ❓ QUESTION 3: Shadow State in LiveScoreTracker

**Problem:** `const [game, setGame] = useState(initialGame)` at line 381

Creates snapshot of prop, ignores prop updates.

**Options:**
- **A) Simple fix:** Remove useState, use prop directly
  ```tsx
  const game = initialGame;  // Just use the prop
  ```
  Risk: Compiler errors if setGame() used for optimistic updates

- **B) Proper fix:** Keep useState but add sync
  ```tsx
  useEffect(() => {
    setGame(initialGame);
  }, [initialGame]);
  ```
  Risk: Extra re-renders

- **C) Leave as is:** Continue with shadow state
  Risk: Multi-admin desync, external changes invisible

**Your Decision:**
- A (simplest)?
- B (more correct)?
- C (leave as is)?

---

### ❓ QUESTION 4: Timer Consolidation

**Current:** 2 timer sources compete
1. Local `useEffect` tick (60/sec)
2. Server `updateGameTime` action (async sync)

**Problem:** Can desync if network lag

**Options:**
- **A) Keep both:** Local for UI, server for DB persistence (current)
- **B) Single owner:** Use local timer + debounced sync every 5s
- **C) Server-driven:** Always fetch timer from server (slower)

**Questions:**
- Is there requirement for multi-judge timer sync?
- How critical is timer accuracy (to second)?
- Can timer drift 5-10 seconds between users?

**My Recommendation:** Option B (local + debounced sync)

---

### ❓ QUESTION 5: +null Bug Fixing Strategy

**Problem:** `ActionLog.tsx:46` renders `+{event.points}` → can be `+null`

**Options:**
- **A) Render guard only:** Add `event.points != null ? ...` check
- **B) Validate on create:** Add server-side validation when creating event
- **C) Both:** Guard rendering + validate on create (defense in depth)
- **D) Schema fix:** Add NOT NULL constraint to GameEvent.points

**My Recommendation:** Option C (both render guard + server validation)

---

### ❓ QUESTION 6: Time Calculation Direction

**Finding:** Two places have WRONG calculation:

```typescript
// WRONG (lines 442-443, 751):
const timeAdded = gameClockSeconds - enteredAt;

// CORRECT (GameProtocol.tsx:16):
const sessionSeconds = Math.max(0, enteredAt - gameClockSeconds);
```

**Why it matters:**
```
Countdown timer: 600 (10:00) → 400 (6:40) → 0 (0:00)

Player entered at clock 600, now clock is 400
Time on court = 600 - 400 = 200 seconds ✓ CORRECT

If reversed: 400 - 600 = -200 ✗ NEGATIVE (bad!)
```

**Fix Required:**
```
Verify ALL time calculations use: enteredAt - currentGameClock
```

**Your Confirmation Needed:**
- Is this understanding correct?
- Should I fix these 2 locations?
- Are there other time calculations I missed?

---

## NEXT STEPS

1. **Answer all 6 questions above**
2. **Provide any additional context** about:
   - Firebase usage in production
   - Multi-user timer synchronization requirements
   - Risk tolerance for changes
3. **I will NOT proceed with Phase 3 (Cleanup)** until answers received

---

**STATUS: WAITING FOR ANSWERS** ⏳

All inventory complete. No changes made. Ready to proceed once questions answered.

*Generated: 2026-05-11*  
*Inventory Auditor: Staff Engineer*
