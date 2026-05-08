# 🚀 Live Match Tracker Refactor — Implementation Plan
**Status:** PHASES 1-3 COMPLETE ✅ | PHASE 4 IN PROGRESS

---

## COMPLETED ✅

### PHASE 1: Codebase Audit (DONE)
- [x] Complete audit of all anti-patterns
- [x] Root cause analysis (stats tied to lineup, bench players invisible)
- [x] Report: `ARCHITECTURAL_AUDIT_2026_05_08.md`

### PHASE 2: Database Schema (DONE)
- [x] Created migration `20250508_add_time_tracking_to_gameoncourt`
- [x] Added fields to `GameOnCourt`:
  - `timeOnCourtSeconds: Int @default(0)`
  - `lastSubInTimestamp: Int?`
  - `isStarter: Boolean @default(false)`
- [x] Applied migration: `prisma migrate deploy` ✓
- [x] Regenerated Prisma client: `prisma generate` ✓

### PHASE 3: Backend Logic (DONE)
- [x] Implemented `addSubstitutionRefactored()` — atomic bi-player update with audit logging
- [x] Enhanced `startGame()` — now initializes `isStarter` and `lastSubInTimestamp` properly
- [x] Added `recalcPlusMinus()` skeleton for game-end plus/minus calculation
- [x] All functions use `(gameId, playerId)` composite keys (no array indexing)
- [x] TypeScript compilation: ✓ PASS
- [x] Build: ✓ PASS

---

## IN PROGRESS 🔄

### PHASE 4: Frontend State Refactor (NEXT STEPS)

The current problem in `LiveScoreTracker.tsx`:
```typescript
const [boxScores, setBoxScores] = useState<(BoxScore & { player: Player })[]>(...)
//                                 ↑ ARRAY — unstable, causes merging bugs
```

**Solution:** Convert to Record keyed by `playerId`:
```typescript
const [playerStats, setPlayerStats] = useState<Record<number, PlayerMatchStats>>({})
//                                     ↑ RECORD — stable, O(1) lookups, safe merging
```

#### What needs to change:

**File: `components/live-tracker/LiveScoreTracker.tsx`**

1. **State shape change** (line ~272):
```typescript
// BEFORE:
const [boxScores, setBoxScores] = useState<(BoxScore & { player: Player })[]>(() => game.boxScores || []);

// AFTER:
const [playerStats, setPlayerStats] = useState<Record<number, BoxScore & { player: Player }>>(() => {
  const map: Record<number, BoxScore & { player: Player }> = {};
  game.boxScores?.forEach(bs => {
    map[bs.playerId] = bs;
  });
  return map;
});
```

2. **Update merge logic** (lines ~280-290):
```typescript
// BEFORE:
useEffect(() => {
  if (!game.boxScores) return;
  setBoxScores(prev => {
    const merged = [...game.boxScores];  // ❌ Array merge is fragile
    prev.forEach(existing => {
      if (!merged.find(bs => bs.playerId === existing.playerId)) {
        merged.push(existing);
      }
    });
    return merged;
  });
}, [game.boxScores]);

// AFTER:
useEffect(() => {
  if (!game.boxScores) return;
  setPlayerStats(prev => {
    const merged = { ...prev };  // ✓ Object spread is atomic and safe
    game.boxScores.forEach(bs => {
      merged[bs.playerId] = bs;  // ✓ O(1) update by ID
    });
    return merged;
  });
}, [game.boxScores]);
```

3. **Rendering: Remove array mapping, use Object.values()**

Current code using array (safe):
```typescript
homeOnCourt.map(p => {
  const foulCount = getPlayerFoulCount(events, p.id);
  return (
    <button key={p.id} ...>
```

Will be (also safe):
```typescript
Array.from(homeOnCourt).map(playerId => {
  const player = game.homeTeam.players.find(p => p.id === playerId);
  const bs = playerStats[playerId];  // ✓ Fast lookup by ID
  const foulCount = getPlayerFoulCount(events, playerId);
  return (
    <button key={playerId} ...>
```

4. **Remove array-based bench detection:**

Currently (line ~187):
```typescript
.sort((a, b) => {
  if (a.isStarter !== b.isStarter) return a.isStarter ? -1 : 1;
  return a.bs.player.number - b.bs.player.number;
});
```

Change to use `isOnCourt` flag directly:
```typescript
// Group by on-court status, don't rely on array position
const onCourtPlayers = game.homeTeam.players.filter(p => onCourtHome.has(p.id));
const benchPlayers = game.homeTeam.players.filter(p => !onCourtHome.has(p.id));
const allPlayers = [...onCourtPlayers, ...benchPlayers];
```

---

### PHASE 5: Game Display Page (Minimal Changes)

**File: `app/(public)/game/[id]/page.tsx`**

The good news: This file is already correct! It:
- ✓ Uses `boxScores` array (correct for rendering full table)
- ✓ Groups by `isStarter` flag (not by position)
- ✓ Uses `key={bs.id}` (not index)
- ✓ Shows all players

**Only change needed:** Ensure `isStarter` is populated in startGame → Already done ✓

---

### PHASE 6: Substitution UI Implementation

**File: `components/live-tracker/LiveScoreTracker.tsx`**

Current state (line ~264):
```typescript
const [showSubModal, setShowSubModal] = useState(false);
const [subPlayerOut, setSubPlayerOut] = useState<number | null>(null);
const [subPlayerIn, setSubPlayerIn] = useState<number | null>(null);
```

**Implementation:**

1. Add "Заміна" (Substitute) button next to each on-court player
2. On click:
   - Set `subPlayerOut = p.id`
   - Show modal with benched players from same team
3. User selects `playerIn`
4. Call `addSubstitutionRefactored(gameId, teamId, playerOut, playerIn, gameClock)`
5. Update `onCourtHome/onCourtAway` sets atomically
6. Refresh display

**Code skeleton:**
```typescript
async function handleSubstitution() {
  const result = await addSubstitutionRefactored(
    game.id,
    teamId,
    subPlayerOut!,
    subPlayerIn!,
    QUARTER_DURATION - timeLeft  // game clock in seconds
  );

  if (result.success) {
    // Update UI state
    if (teamId === game.homeTeamId) {
      setOnCourtHome(prev => {
        const next = new Set(prev);
        next.delete(subPlayerOut!);
        next.add(subPlayerIn!);
        return next;
      });
    } else {
      setOnCourtAway(prev => {
        const next = new Set(prev);
        next.delete(subPlayerOut!);
        next.add(subPlayerIn!);
        return next;
      });
    }
    setShowSubModal(false);
  }
}
```

---

### PHASE 7: Live Display Calculation

**Function: `getDisplayMinutes()`**

New function for front-end to display live minutes:

```typescript
function getDisplayMinutes(
  gameOnCourt: { timeOnCourtSeconds: number; lastSubInTimestamp: number | null; onCourt: boolean },
  gameClock: number
): string {
  let total = gameOnCourt.timeOnCourtSeconds;
  
  if (gameOnCourt.onCourt && gameOnCourt.lastSubInTimestamp !== null) {
    // Player currently on court: add active playing time
    total += gameClock - gameOnCourt.lastSubInTimestamp;
  }
  
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}
```

Used in render:
```typescript
<td>{getDisplayMinutes(playerOnCourt, QUARTER_DURATION - timeLeft)}</td>
```

---

### PHASE 8: Substitution Event Logging (Already Done)

The new `addSubstitutionRefactored()` creates `GameSubstitution` records:
```typescript
await tx.gameSubstitution.create({
  data: {
    gameId, teamId, playerId: playerOutId, action: "out",
    quarter: game.quarter, gameTime: "2:45"
  }
});
```

This enables:
- ✓ Audit trail of all substitutions
- ✓ Reconstruction of on-court lineups by quarter
- ✓ Accurate plus/minus calculation (future)

---

## TESTING CHECKLIST (PHASE 9)

After implementing all changes, run these tests:

- [ ] **Roster visibility:** All 12 players appear in boxscore at game start
- [ ] **Bench player stats:** Sub in player 6, they get 0 stats initially, but persist in boxscore
- [ ] **Stat accumulation:** Player 6 scores 5 points, their BoxScore.points updates, UI refreshes
- [ ] **Minutes tracking:** Player starts with 0:00, after 2 min on-court shows 0:02, continues updating
- [ ] **Substitution logging:** Sub out player 1, sub in player 6 → two GameSubstitution records created
- [ ] **Plus/minus display:** Shown in boxscore (initially 0, will refine at game end)
- [ ] **Page refresh (F5):** Mid-game refresh, all stats intact, on-court status correct
- [ ] **Rapid updates:** Stat updates don't cause race conditions or data loss
- [ ] **Multiple teams:** Both home and away team subs work independently
- [ ] **Build passes:** `npm run build` exits 0

---

## Files to Modify

| Phase | File | Change Type | Status |
|-------|------|-------------|--------|
| 2 | `prisma/schema.prisma` | Add fields | ✅ DONE |
| 2 | `prisma/migrations/20250508_*` | New migration | ✅ DONE |
| 3 | `actions/game.ts` | New functions + enhance existing | ✅ DONE |
| 4 | `components/live-tracker/LiveScoreTracker.tsx` | State refactor + UI updates | 🔄 IN PROGRESS |
| 5 | `app/(public)/game/[id]/page.tsx` | Minimal (verify isStarter) | ⏳ TODO |
| 6 | `components/live-tracker/LiveScoreTracker.tsx` | Substitution UI | ⏳ TODO |
| 8 | `app/admin/dashboard/page.tsx` | Verify no changes needed | ⏳ TODO |

---

## Key Architectural Principles

1. ✅ **All stats keyed by `(gameId, playerId)`** — not by position or on-court status
2. ✅ **Composite unique constraint** — `@@unique([gameId, playerId])` prevents duplicates
3. ✅ **Always render full roster** — no filtering by position, only by team
4. ✅ **On-court is visual flag** — controls highlight color, not visibility
5. ✅ **Time tracking in GameOnCourt** — not BoxScore
6. ✅ **Substitution events logged** — audit trail for every lineup change
7. ✅ **Atomic transactions** — both-player updates happen together or not at all

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Data loss during refactor | All changes backward-compatible; old data preserved |
| Race conditions in React | Switch from array to Record (O(1) safe merges) |
| Stats tied to lineup | Decoupled: BoxScore is per-player, GameOnCourt tracks on-court only |
| Bench player invisibility | Always render all roster members, use on-court flag for styling |
| Plus/minus calculation | Deferred to game-end; substitution events provide audit trail |

---

## Success Criteria

All tests in PHASE 9 pass → Production-ready

