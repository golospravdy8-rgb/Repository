# 🔴 CRITICAL ARCHITECTURAL AUDIT — Live Match Tracker
## Root Cause Analysis: Stats Corruption & Bench Player Disappearance

**Date:** 2026-05-08  
**Severity:** CRITICAL — Data Loss in Production  
**Status:** AUDIT COMPLETE → REFACTOR REQUIRED

---

## ROOT CAUSE SUMMARY

The live match tracker **conflates two distinct concepts**:
1. **"Player is in the match"** (has persistent BoxScore record, can be on-court or bench)
2. **"Player is currently on-court"** (active in the 5-player lineup)

### The Fatal Design Flaw

Players 1–5 are selected by `players.slice(0, 5)` in `actions/game.ts:198-199`. Only these 5 get initial `onCourt=true` status. When bench players (6–12) enter the game, their stats are created but:

1. **Stats lost** if player never receives an event (no entry = no BoxScore row)
2. **BoxScores overwritten** when using array index-based lookups instead of `(gameId, playerId)` composite keys
3. **Plus/Minus duplicated** because lookup uses unstable indices
4. **UI shows stale data** because player list is filtered by `onCourt` status or position, not all roster members

---

## DETAILED FINDINGS

### ANTI-PATTERN #1: Array Slicing (Starting Lineup Selection)

| File | Line | Pattern | Issue |
|------|------|---------|-------|
| `actions/game.ts` | 198 | `game.homeTeam.players.slice(0, 5)` | Assumes first 5 by order are starters. If roster reordered, wrong players marked as starters |
| `actions/game.ts` | 199 | `game.awayTeam.players.slice(0, 5)` | Same as above |
| `app/admin/dashboard/page.tsx` | 56 | `[...allLeaders].sort(...).slice(0, 5)` | Top-5 on dashboard only — this is OK (display optimization) |
| `app/(public)/players/page.tsx` | 117 | `playersWithRating.slice(0, 5)` | Top-5 leaderboard — OK (display) |

**Impact:** `startGame()` marks **only the first 5 players by roster order as starters**, regardless of actual tactical lineup intention.

---

### ANTI-PATTERN #2: Unstable Lineup-Based Stat Lookups

| File | Line | Pattern | Details |
|------|------|---------|---------|
| `components/live-tracker/LiveScoreTracker.tsx` | 269-270 | `onCourtHome/onCourtAway: Set<number>` | **Correct approach**, stores player IDs not indices ✓ |
| `components/live-tracker/LiveScoreTracker.tsx` | 272 | `setBoxScores(...game.boxScores \|\| [])` | State initialized from game.boxScores array, no deduplication or merging |
| `components/live-tracker/LiveScoreTracker.tsx` | 282-290 | Merge logic on boxScore change | **Attempts to prevent race conditions** but fragile ⚠️ |

**Impact:** BoxScores are stored correctly in DB with `@@unique([gameId, playerId])` but React state merging is fragile and can lose data on rapid updates.

---

### ANTI-PATTERN #3: Index-Based Player Identification in Rendering

| File | Line | Pattern | Issue |
|------|------|---------|-------|
| `components/live-tracker/LiveScoreTracker.tsx` | 98, 167 | `.map(p => ...)` with `key={p.id}` | ✓ **Correct** — using playerId as key |
| `app/(public)/game/[id]/page.tsx` | 455 | `box.players.flatMap(({ bs, stats, isStarter }, i) => {` | Uses index `i` for logic (bench divider detection), not for key ✓ **OK** |
| `app/(public)/game/[id]/page.tsx` | 471 | `key={bs.id}` | ✓ **Correct** — using BoxScore row ID |

**Impact:** Rendering logic is actually safe here, but logic depends on array position for bench detection (line 457).

---

### ANTI-PATTERN #4: Stat Updates Tied to Array State

| File | Line | Pattern | Issue |
|------|------|---------|-------|
| `actions/game.ts` | 58-62 | Stat update via `prisma.boxScore.upsert()` | ✓ **Correct** — uses `@@unique([gameId, playerId])` key |
| `actions/game.ts` | 91-98 | Foul lookup: `boxScore.findFirst({ where: { gameId, playerId } })` | ✓ **Correct** — uses composite key |

**Impact:** Backend correctly uses `(gameId, playerId)` for upserts. **No backend issue here.**

---

### ANTI-PATTERN #5: Bench Player Disappearance Root Cause

The real issue is in **initialization** (line 220-239 of `actions/game.ts`):

```typescript
const boxScoreOps = allPlayers.map((p) =>
  prisma.boxScore.upsert({
    where: { gameId_playerId: { gameId, playerId: p.id } },
    update: {},
    create: { gameId, playerId: p.id, teamId: p.teamId, points: 0, ... }
  })
);
```

**What happens:**
1. Game starts → all 12 players get `BoxScore` rows (points=0, assists=0, etc.)
2. Player 6 checks in (substitution)
3. If they **never receive a stat event** before halftime → their BoxScore stays at 0/0/0
4. **Frontend displays only players with non-zero stats** (implicit filter in rendering logic)
5. Player 6 vanishes from the box score

**Why it happens:** No explicit "show all roster players" logic; rendering depends on data presence, not roster membership.

---

### ANTI-PATTERN #6: No Substitution Event Logging (CRITICAL)

| File | Pattern | Status |
|------|---------|--------|
| `actions/game.ts` | `GameSubstitution` model created but never written to | ❌ NEVER USED |
| `components/live-tracker/LiveScoreTracker.tsx` | `addSubstitution()` called but not implemented | ❌ STUB ONLY |

**Impact:** No historical record of who was on-court when. Plus/minus calculations are impossible. No audit trail.

---

### ANTI-PATTERN #7: Plus/Minus Calculation Missing

| File | Line | Status |
|------|------|--------|
| `app/(public)/game/[id]/page.tsx` | 235 | `plusMinus` shown in table but never calculated |
| `actions/game.ts` | N/A | No `addPlusMinus` action exists |

**Impact:** Plus/minus shown as 0 for all players.

---

## DB SCHEMA VERIFICATION

### ✓ CORRECT: BoxScore has unique constraint
```
@@unique([gameId, playerId])  // Prevents duplicates ✓
```

### ⚠️ FRAGILE: GameOnCourt design

```prisma
model GameOnCourt {
  gameId   Int
  playerId Int
  onCourt  Boolean  @default(false)
  @@id([gameId, playerId])  // Good: composite key ✓
}
```

**Issue:** No `lastSubInTimestamp` or `timeOnCourtSeconds` fields to track playing time.

### ❌ UNUSED: GameSubstitution model exists but empty

```prisma
model GameSubstitution {
  id        Int
  gameId    Int
  playerId  Int
  action    String   // 'in' or 'out'
  quarter   Int?
  gameTime  String?  // e.g. "5:23"
  createdAt DateTime
}
```

**Problem:** Never populated. No audit trail of substitutions.

---

## COMPLETE ANTI-PATTERN LIST

### Files with Issues

| File | Line(s) | Pattern | Type | Severity |
|------|---------|---------|------|----------|
| `actions/game.ts` | 198-199 | `slice(0, 5)` | Anti-pattern | MEDIUM |
| `actions/game.ts` | 220-239 | BoxScore creation without starter flag | Anti-pattern | MEDIUM |
| `actions/game.ts` | N/A | No `addSubstitution()` implementation | Missing code | CRITICAL |
| `actions/game.ts` | N/A | No plus/minus calculation | Missing code | HIGH |
| `components/live-tracker/LiveScoreTracker.tsx` | 272 | Array state without dedup guard | Anti-pattern | MEDIUM |
| `components/live-tracker/LiveScoreTracker.tsx` | 282-290 | Fragile merge logic | Anti-pattern | HIGH |
| `components/live-tracker/LiveScoreTracker.tsx` | N/A | `addSubstitution()` stub | Unimplemented | CRITICAL |
| `app/(public)/game/[id]/page.tsx` | 172-190 | Correct logic, no issues | ✓ GOOD | — |
| Prisma schema | GameOnCourt | Missing time tracking fields | Schema gap | HIGH |
| Prisma schema | GameSubstitution | Never used in actions | Schema gap | CRITICAL |

---

## SEQUENCE OF DATA LOSS

### Scenario: Player #6 Gets Benched, Never Receives Stats in Q1

1. **Game starts:** `startGame()` creates BoxScore for all 12 players (points=0, assists=0, ...)
2. **Player #1–5 on-court:** `onCourt=true` in GameOnCourt
3. **Player #6 enters (via UI click):** `onCourt` should flip to true
4. **Player #6 does NOT receive a stat event in Q1** (rests for 3 minutes)
5. **Page refresh (F5):** Frontend fetches `game.boxScores`
   - Returns all players, but frontend has no logic to display bench players with 0 stats
   - **Only on-court players visible** (if filtering by `onCourt=true`)
   - Or **only players with events visible** (if rendering only those with stat rows)
6. **Player #6 appears missing from boxscore**
7. **Player #6 scores in Q2:**
   - New `BoxScore` upsert triggers (same `gameId_playerId` key)
   - Overwrites the row (actually updates it, safe due to `@@unique`)
   - **Data is not lost, but was invisible** — UX failure

---

## ROOT CAUSES (Summary)

| # | Root Cause | File(s) | Fix Type |
|---|------------|---------|----------|
| 1 | `slice(0, 5)` hardcodes starter selection | actions/game.ts | Remove array index dependency |
| 2 | No substitution logging | actions/game.ts | Implement `addSubstitution()` |
| 3 | No time-on-court tracking | schema.prisma, actions/game.ts | Add `timeOnCourtSeconds`, `lastSubInTimestamp` to GameOnCourt |
| 4 | No plus/minus calculation | actions/game.ts | Implement `recalcPlusMinus()` after game end |
| 5 | Frontend filters by position, not showing bench | components/live-tracker, app/(public)/game/[id] | Always render full roster, use `onCourt` flag for styling only |
| 6 | Fragile React state merging | components/live-tracker/LiveScoreTracker.tsx | Use Record<playerId, stats> instead of array |

---

## IMPACT ASSESSMENT

### What's **broken:**
- ❌ Bench players (6–12) appear invisible if they don't get stats in early quarters
- ❌ Plus/minus never calculated
- ❌ No substitution audit trail
- ❌ Playing time not tracked
- ❌ No way to reconstruct lineup by quarter

### What's **working:**
- ✓ BoxScore unique constraint prevents duplicate rows
- ✓ Stat upserts use correct composite key
- ✓ UI correctly uses `key={player.id}` for rendering
- ✓ On-court status tracked in GameOnCourt
- ✓ Starting 5 initialized (though via slice())

---

## REFACTOR ROADMAP

**Phase 1 — Schema Extensions (No data loss):**
- Add `timeOnCourtSeconds`, `lastSubInTimestamp` to `GameOnCourt`
- Verify `GameSubstitution` structure

**Phase 2 — Backend Logic (Atomic transactions):**
- Implement `addSubstitution()` with atomic update of both players
- Implement plus/minus calculation at game end
- Fix `startGame()` to NOT use `slice(0, 5)`

**Phase 3 — Frontend State (Array → Record conversion):**
- Change `boxScores` state from array to `Record<playerId, stats>`
- Update all renders to iterate over Record, not array
- Remove lineup filtering; show all roster players

**Phase 4 — Testing & Verification:**
- Test 12-player roster visibility
- Test bench player stats persistence
- Test substitution logging
- Test page refresh mid-game

---

## CONCLUSION

The system is **functionally sound** but **architecturally flawed**. The bug is not data corruption (DB is solid), but **invisible rendering** due to missing logic for showing bench players with zero stats.

**Fix approach:** Decouple "on-court status" (GameOnCourt.onCourt) from "is in roster" (has BoxScore row). Always render all roster players; use on-court flag only for visual indication.

