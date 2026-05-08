# PHASE 4 AUDIT — Frontend State Refactor (Live Match Tracker)
**Date:** 2026-05-08  
**Purpose:** Full analysis of state management before refactoring to Record-based structure  
**Status:** ANALYSIS COMPLETE — READY FOR IMPLEMENTATION

---

## SCOPE

This audit covers:
1. **LiveScoreTracker.tsx** — main game tracking component (1145 lines)
2. **RosterPanel** — sub-component within LiveScoreTracker (lines 47–250)
3. **StatEntryGrid.tsx** — grid view for stats entry (299 lines)
4. **State shape and data flow** — how stats/players flow through the UI

---

## AUDIT FINDINGS

### 1. ARRAY-BASED BOXSCORE STATE ❌

**File:** `LiveScoreTracker.tsx`  
**Lines:** 272, 280–291

**Current code:**
```typescript
const [boxScores, setBoxScores] = useState<(BoxScore & { player: Player })[]>(
  () => game.boxScores || []
);

// Merge effect:
useEffect(() => {
  if (!game.boxScores) return;
  setBoxScores(prev => {
    const merged = [...game.boxScores];  // ← Creates new array
    prev.forEach(existing => {
      if (!merged.find(bs => bs.playerId === existing.playerId)) {
        merged.push(existing);  // ← Linear search for each item (O(n²) complexity!)
      }
    });
    return merged;
  });
}, [game.boxScores]);
```

**Issues:**
- ❌ O(n²) merge logic (nested find + push for each item)
- ❌ Array is unstable — same player appears at different indices across updates
- ❌ Cannot efficiently update a single player's stats
- ❌ No guaranteed order preservation

**Impact:** Race conditions possible on rapid stat updates.

---

### 2. ONCOURTIDS SETS (CORRECT PATTERN) ✓

**File:** `LiveScoreTracker.tsx`  
**Lines:** 269–270

**Current code:**
```typescript
const [onCourtHome, setOnCourtHome] = useState<Set<number>>(new Set());
const [onCourtAway, setOnCourtAway] = useState<Set<number>>(new Set());
```

**Status:** ✓ CORRECT  
This is the right data structure for on-court status. Keep this pattern.

**Usage:**
- Lines 316–317: Loaded from `game.onCourt` array
- Lines 58–59 (RosterPanel): Filtered to get `onCourt` and `bench` arrays

---

### 3. FILTERING FOR BENCH/ONCOURT ⚠️

**File:** `LiveScoreTracker.tsx`, `RosterPanel` component  
**Lines:** 58–59

**Current code:**
```typescript
const onCourt = players.filter(p => onCourtIds.has(p.id));
const bench = players.filter(p => !onCourtIds.has(p.id));
```

**Status:** ✓ ACCEPTABLE FOR UI GROUPING  
This filtering is for **display grouping only**, not for stats hiding. That's fine.

---

### 4. REACT KEYS WITH INDEX ⚠️

**File:** `RosterPanel`, `LiveScoreTracker`  
**Lines:** 98–152 (on-court), 167–220 (bench), 130, 198, 229, 421, 488, 877 (foul indicators)

**Current code (foul indicators):**
```typescript
{[0, 1, 2, 3, 4].map(i => (
  <div key={i} ...>  // ← Uses loop index as key
```

**Status:** ⚠️ ACCEPTABLE FOR STATIC LISTS  
These are just 5 visual indicators, not player data. Safe to use `key={i}`. No change needed.

**Current code (player rows):**
```typescript
{onCourt.map(p => (
  <button key={p.id} ...>  // ← ✓ CORRECT, uses player ID
```

**Status:** ✓ CORRECT  
Already using `key={p.id}` for player rows. Safe.

---

### 5. STARTGAME INITIALIZATION ⚠️

**File:** `LiveScoreTracker.tsx`  
**Line:** 514

**Current code:**
```typescript
<button onClick={() => startTransition(() => startGame(game.id))} ...>
  ▶ Почати
</button>
```

**Issues:**
- ❌ Calls old `startGame(gameId)` which hardcodes `slice(0, 5)`
- ❌ No way to select custom starting lineup
- ❌ No visual feedback for starter selection

**What needs to change:**
- Pre-game UI to allow clicking players to select starters
- Call new `startGameRefactored(gameId, homeStarterIds[], awayStarterIds[])`
- Update local state after success

---

### 6. SUBSTITUTION FLOW — INCOMPLETE ❌

**File:** `LiveScoreTracker.tsx`  
**Lines:** 263–265, 1078

**Current state:**
```typescript
const [showSubModal, setShowSubModal] = useState(false);
const [subPlayerOut, setSubPlayerOut] = useState<number | null>(null);
const [subPlayerIn, setSubPlayerIn] = useState<number | null>(null);
```

**Current code (line 1078):**
```typescript
addSubstitution(
  game.id,
  selectedTeamId,
  subPlayerOut,
  subPlayerIn
)
```

**Issues:**
- ❌ Calls old `addSubstitution()` (stub, doesn't work)
- ❌ No state machine for "selecting out" vs "selecting in" phases
- ❌ Modal UI missing
- ❌ No game clock passed to track substitution time
- ❌ No local state update after substitution (relies on server refresh)

**What needs to change:**
- Implement proper two-phase flow
- Call new `addSubstitutionRefactored(gameId, teamId, playerOutId, playerInId, clockSeconds)`
- Update local state immediately (optimistic)
- Implement "Заміна" button UI

---

### 7. MINUTES/TIMEONCOURT DISPLAY ❌

**File:** `LiveScoreTracker.tsx`, `StatEntryGrid.tsx`  
**Current:** NOT IMPLEMENTED

**What's missing:**
- No display of minutes played
- No live calculation (current + accumulated time)
- No update every second as game runs

**What needs to be added:**
```typescript
function getDisplayTime(player: PlayerState, gameClock: number): string {
  const total = player.isOnCourt && player.lastSubInTimestamp !== null
    ? player.timeOnCourtSeconds + (gameClock - player.lastSubInTimestamp)
    : player.timeOnCourtSeconds
  const mins = Math.floor(total / 60)
  const secs = total % 60
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
}
```

---

### 8. GAME CLOCK / TIMERUNNING STATE ✓

**File:** `LiveScoreTracker.tsx`  
**Lines:** 259, 260, 337–349

**Current code:**
```typescript
const [timeLeft, setTimeLeft] = useState(QUARTER_DURATION);
const [timerRunning, setTimerRunning] = useState(false);

const startTimer = useCallback(() => {
  setTimerRunning(true);
  intervalRef.current = setInterval(() => {
    setTimeLeft((prev) => {
      if (prev <= 1) {
        stopTimer();
        return 0;
      }
      return prev - 1;
    });
  }, 1000);
}, [stopTimer]);
```

**Status:** ✓ CORRECT  
Timer properly manages `timeLeft` (seconds remaining). For display time calculation, convert to `gameClock = QUARTER_DURATION - timeLeft`.

---

### 9. STATENTRYPGRID INTEGRATION ⚠️

**File:** `StatEntryGrid.tsx` (299 lines)  
**Lines:** 23, 77–79

**Current interface:**
```typescript
interface StatEntryGridProps {
  game: Game & { ... };
  boxScores: (BoxScore & { player: Player })[];
}

const getBoxScore = (playerId: number) => {
  return boxScores.find(bs => bs.playerId === playerId) || null;
};
```

**Issues:**
- ❌ Still uses array-based lookup (O(n) find)
- ❌ Receives array from parent, needs to convert to Record

**What needs to change:**
- Change `boxScores` prop type to `Record<number, BoxScore & { player: Player }>`
- Update `getBoxScore()` to `player => playerStats[player.id]` (O(1))

---

### 10. IMPORTS & ACTIONS ⚠️

**File:** `LiveScoreTracker.tsx`  
**Line:** 4

**Current imports:**
```typescript
import { ..., startGame, ..., addSubstitution, ... } from "@/actions/game"
```

**Status:** ⚠️ NEED UPDATE  
- ❌ `startGame` is old (no starter selection)
- ❌ `addSubstitution` is a stub (non-functional)
- ✓ Both new functions exist in backend: `startGameRefactored`, `addSubstitutionRefactored`

**What needs to change:**
- Import the refactored functions
- Remove old imports if unused elsewhere

---

### 11. GAME TYPE DEFINITION ⚠️

**File:** `LiveScoreTracker.tsx`  
**Lines:** 8–16

**Current:**
```typescript
type GameWithAll = Game & {
  homeTeam: Team & { players: Player[] };
  awayTeam: Team & { players: Player[] };
  events: (GameEvent & { ... })[];
  onCourt: Array<{ gameId: number; playerId: number; teamId: number; onCourt: boolean }>;
  boxScores: (BoxScore & { player: Player })[];
};
```

**Status:** ⚠️ NEEDS UPDATE  
The `onCourt` field now has new properties:
- `isStarter: boolean`
- `timeOnCourtSeconds: number`
- `lastSubInTimestamp: number | null`

**What needs to change:**
```typescript
type GameWithAll = Game & {
  homeTeam: Team & { players: Player[] };
  awayTeam: Team & { players: Player[] };
  events: (GameEvent & { ... })[];
  onCourt: Array<{
    gameId: number
    playerId: number
    teamId: number
    onCourt: boolean
    isStarter: boolean         // ← NEW
    timeOnCourtSeconds: number // ← NEW
    lastSubInTimestamp: number | null // ← NEW
  }>;
  boxScores: (BoxScore & { player: Player })[];
};
```

---

## SUMMARY TABLE

| Issue | Location | Severity | Action |
|-------|----------|----------|--------|
| Array-based boxScores state | Line 272 | 🔴 HIGH | Convert to Record<playerId, stats> |
| O(n²) merge logic | Lines 280–291 | 🔴 HIGH | Replace with atomic object spread |
| onCourtIds Sets | Lines 269–270 | 🟢 OK | Keep as-is |
| RosterPanel filtering | Lines 58–59 | 🟢 OK | Keep (display grouping only) |
| React keys for indicators | Multiple | 🟢 OK | Keep (static lists) |
| React keys for players | RosterPanel | 🟢 OK | Already using `key={p.id}` |
| startGame call | Line 514 | 🔴 HIGH | Implement starter selection UI |
| Substitution flow | Lines 263–265, 1078 | 🔴 HIGH | Implement two-phase modal + new API call |
| Minutes display | N/A | 🔴 HIGH | Implement calculation + live update |
| Timer/gameClock | Lines 259–260 | 🟢 OK | Good as-is |
| StatEntryGrid | StatEntryGrid.tsx | 🟠 MED | Convert prop type to Record |
| Function imports | Line 4 | 🟠 MED | Import refactored versions |
| GameWithAll type | Lines 8–16 | 🟠 MED | Update onCourt field definitions |

---

## IMPLEMENTATION ORDER (BY PRIORITY)

1. **Critical (🔴):** Define new state shape
2. **Critical (🔴):** Convert boxScores from array to Record
3. **Critical (🔴):** Implement starter selection UI + logic
4. **Critical (🔴):** Implement substitution two-phase modal
5. **Critical (🔴):** Implement minutes display + live calculation
6. **Medium (🟠):** Update StatEntryGrid props
7. **Medium (🟠):** Update GameWithAll type definition
8. **Medium (🟠):** Update imports

---

## HARD CONSTRAINTS (MUST MAINTAIN)

- ✅ All 12+ players always visible (never slice/filter for stats)
- ✅ Minutes survive page refresh (loaded from DB via `timeOnCourtSeconds`)
- ✅ Returning players accumulate time (never reset)
- ✅ React keys never use array indices for player rows
- ✅ No array replacements from server (always merge)
- ✅ Substitutions don't affect stats persistence
- ✅ Build must pass `npx tsc --noEmit` with zero errors
- ✅ No console.error during normal game flow

---

## READY FOR PHASE 4 IMPLEMENTATION ✓

All anti-patterns identified. Ready to implement the new state shape and refactor accordingly.

