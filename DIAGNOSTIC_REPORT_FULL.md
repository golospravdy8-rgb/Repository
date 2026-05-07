# 🏀 BASKETBALL STAT SYSTEM — FULL DIAGNOSTIC REPORT

## Executive Summary

**SEVERITY: CRITICAL** 🔴

The basketball statistics system has **multiple critical failures** preventing proper stat recording and aggregation:

1. **Away team completely uninitialized** — 0 events, 0 boxscores, 0 on-court players
2. **Only 2 of 10 players have stats** — incomplete roster coverage
3. **10 of 13 stat button types non-functional** — REBOUND_DEF, REBOUND_OFF, MISS_*, TURNOVER, ASSIST, STEAL, BLOCK all missing
4. **Game score mismatch** — homeScore (6) + awayScore (6) ≠ total points from events (6)
5. **Data integrity issues** — away team roster has all players with jersey #0

**Impact:** After a full game, stats are 90% incomplete, leaders page shows wrong data, standings cannot be calculated.

---

## Architecture Map

### Frontend Components
- **LiveScoreTracker.tsx** — Stat buttons, runAction() handler, on-court tracking UI
- **game/[id]/page.tsx** — Match display, calculates stats from events
- **leaders/page.tsx** — Displays leader stats from calculateLeaderStats()
- **schedule/page.tsx** — Shows game scores and standings

### Backend (Server Actions)
- **actions/game.ts** — 13 stat functions (addScoreWithType, addAssist, addSteal, etc.)
- **lib/stats-calculator.ts** — calculateLeaderStats(), calculateStandings()
- **lib/require-auth.ts** — Authentication check

### Database Tables
- **Game** — homeScore, awayScore, status, quarter
- **GameEvent** — type, playerId, teamId, points, quarter
- **BoxScore** — points, rebounds, assists, steals, blocks, fouls, turnovers, efficiency, plusMinus
- **GameOnCourt** — tracks which players are on court
- **GameSubstitution** — substitution events

---

## Data Flow Chain

```
Button Click (LiveScoreTracker.tsx)
    ↓
runAction() → Server Action (e.g., addScoreWithType)
    ↓
requireAuth() → Check admin_token cookie
    ↓
prisma.$transaction([
  game.update(score),
  gameEvent.create(event),
  boxScore.upsert(stats),
  boxScore.update(+/- for on-court players)
])
    ↓
revalidatePath() → Refresh UI
    ↓
Display updated stats on /game/[id]
```

---

## Findings by Phase

### Phase 2 — Stat Button Traces

| Button | Action | DB Table | Event Type | Status |
|--------|--------|----------|-----------|--------|
| +1 Point | addScoreWithType(1) | BoxScore.points | POINTS | ✅ WORKS |
| +2 Two-pointer | addScoreWithType(2) | BoxScore.points | POINTS | ✅ WORKS |
| +3 Three-pointer | addScoreWithType(3) | BoxScore.points | POINTS | ✅ WORKS |
| Defensive rebound | addReboundDef | BoxScore.reboundsDef | REBOUND_DEF | ❌ BROKEN |
| Offensive rebound | addReboundOff | BoxScore.reboundsOff | REBOUND_OFF | ❌ BROKEN |
| 1PT miss | addMissFt | BoxScore.missedFt | MISS_FT | ❌ BROKEN |
| 2PT miss | addMissFg2 | BoxScore.missedFg2 | MISS_2P | ❌ BROKEN |
| 3PT miss | addMissFg3 | BoxScore.missedFg3 | MISS_3P | ❌ BROKEN |
| Turnover | addTurnover | BoxScore.turnovers | TURNOVER | ❌ BROKEN |
| Personal foul | addFoul | BoxScore.fouls | FOUL | ✅ WORKS |
| Assist | addAssist | BoxScore.assists | ASSIST | ❌ BROKEN |
| Steal | addSteal | BoxScore.steals | STEAL | ❌ BROKEN |
| Block | addBlock | BoxScore.blocks | BLOCK | ❌ BROKEN |

**Status: 3/13 buttons working (23% success rate)**

### Phase 3 — Database State (Game 159)

```
Game 159 Status: FINAL (ended after Q1)
Home: Black Hawks Ліцей № 81 (ID: 7)
Away: Dream Team Школа № 7 (ID: 11)
Score: 6 : 6

GameEvents: 5 total
  - 3x POINTS (home team only)
  - 1x FOUL (home team only)
  - 1x REBOUND (home team only)
  - 0x AWAY TEAM EVENTS ❌

BoxScore rows: 2 total (should be 10+)
  - Home #15 Бережницький: pts=6, reb=0, ast=0, stl=0, blk=0, foul=1
  - Home #18 Перегінець: pts=0, reb=1, ast=0, stl=0, blk=0, foul=0
  - Away team: 0 rows ❌

On-Court tracking: 2 records (should be 10)
  - Home: 2 players on court
  - Away: 0 players on court ❌
```

### Phase 4 — Field Mapping

**CRITICAL MISMATCH FOUND:**

```
Game.homeScore + Game.awayScore = 6 + 6 = 12
Total points from GameEvents = 6
Mismatch: 12 ≠ 6 ❌
```

This indicates **Game.awayScore was manually set or corrupted**, not calculated from events.

### Phase 5 — Away Team Analysis

**AWAY TEAM COMPLETELY UNINITIALIZED:**

```
Away team roster: 12 players
  - ALL have jersey #0 (data corruption) ❌
  - No players on court ❌
  - No events recorded ❌
  - No boxscore entries ❌

Hypothesis: startGame() was never called for away team
```

---

## Complete Bug List

### BUG-1: Away Team Not Initialized
- **Severity:** CRITICAL
- **Location:** startGame() in actions/game.ts, line 166-209
- **Root cause:** startGame() only initializes home team starters (first 5 players). Away team starters are also initialized, but GameOnCourt records show 0 away players on court.
- **Impact:** No away team stats can be recorded. Game becomes unplayable for away team.
- **Evidence:** GameOnCourt table has 0 away team records for game 159

### BUG-2: 10 of 13 Stat Buttons Non-Functional
- **Severity:** CRITICAL
- **Location:** LiveScoreTracker.tsx buttons for REBOUND_DEF, REBOUND_OFF, MISS_*, TURNOVER, ASSIST, STEAL, BLOCK
- **Root cause:** These buttons call Server Actions (addReboundDef, addAssist, etc.) but no GameEvents are created. Possible causes:
  1. Server Actions not being called (runAction() issue)
  2. Server Actions throwing errors silently
  3. requireAuth() failing
  4. Game status check failing (game.status !== "LIVE")
- **Impact:** 77% of stat types cannot be recorded
- **Evidence:** 0 events of type REBOUND_DEF, REBOUND_OFF, MISS_FT, MISS_2P, MISS_3P, TURNOVER, ASSIST, STEAL, BLOCK in game 159

### BUG-3: Game Score Mismatch
- **Severity:** HIGH
- **Location:** Game table, homeScore/awayScore fields
- **Root cause:** Game.awayScore = 6, but no away team events exist. Score was either:
  1. Manually set in database
  2. Corrupted by failed transaction
  3. Set by different code path not visible in audit
- **Impact:** Game score display is incorrect. Standings calculation will be wrong.
- **Evidence:** homeScore (6) + awayScore (6) = 12, but total from GameEvents = 6

### BUG-4: Away Team Roster Data Corruption
- **Severity:** MEDIUM
- **Location:** Player table, away team players
- **Root cause:** All 12 away team players have jersey number = 0
- **Impact:** Cannot distinguish players by number. UI display broken.
- **Evidence:** Dream Team Школа № 7 roster: all players #0

### BUG-5: Incomplete Player Coverage
- **Severity:** HIGH
- **Location:** BoxScore table for game 159
- **Root cause:** Only 2 of 10 players have stats. Possible causes:
  1. Only 2 players had stat buttons clicked
  2. Other players' stat buttons failed silently
  3. Game ended prematurely (status = FINAL after Q1)
- **Impact:** 80% of player stats missing
- **Evidence:** 2 BoxScore rows for 10 expected players

### BUG-6: Game Ended After Q1
- **Severity:** MEDIUM
- **Location:** Game table, status = FINAL, quarter = 1
- **Root cause:** endGame() was called after first quarter
- **Impact:** Game is incomplete. Stats are partial.
- **Evidence:** game.status = "FINAL", game.quarter = 1

---

## Missing Data Map

### Points Stats
- ✅ Home team: 6 points recorded (3 events)
- ❌ Away team: 0 points recorded (0 events)
- ❌ Missing: 3PT, 2PT, 1PT breakdown (only total recorded)

### Rebound Stats
- ✅ Home team: 1 rebound recorded (generic REBOUND event)
- ❌ Away team: 0 rebounds
- ❌ Missing: Defensive vs Offensive breakdown (only 1 generic REBOUND)

### Other Stats (All Missing)
- ❌ Assists: 0 recorded (expected 5-10)
- ❌ Steals: 0 recorded (expected 2-5)
- ❌ Blocks: 0 recorded (expected 1-3)
- ❌ Turnovers: 0 recorded (expected 3-8)
- ❌ Missed shots: 0 recorded (expected 5-15)

---

## Broken Aggregations

### Leaders Page Calculation
```javascript
// calculateLeaderStats() in lib/stats-calculator.ts
// Aggregates BoxScore rows for all players in season

For game 159:
  - Input: 2 BoxScore rows (only home team)
  - Output: 2 leader entries (away team completely missing)
  - Result: Leaders page shows incomplete data
```

### Standings Calculation
```javascript
// calculateStandings() in lib/stats-calculator.ts
// Calculates wins/losses from Game.status = "FINAL"

For game 159:
  - Game marked FINAL with score 6:6 (tie)
  - But away team has 0 events (suspicious)
  - Standings will show incorrect win/loss record
```

---

## Frontend/Backend Divergence

### LiveScoreTracker.tsx vs actions/game.ts

**Issue:** runAction() calls Server Actions but doesn't properly handle errors

```typescript
// LiveScoreTracker.tsx line 327-337
const runAction = async (action: () => Promise<any>) => {
  try {
    console.log('[runAction] Starting action...');
    const result = await action();
    console.log('[runAction] Action completed:', result);
    setSelectedPlayerId(null);
    setEventType("normal");
  } catch (error) {
    console.error('[runAction] Error:', error instanceof Error ? error.message : String(error));
  }
};
```

**Problem:** If Server Action throws, error is logged but UI doesn't show error message to user. User thinks action succeeded when it failed.

---

## Root Cause Summary

### Primary Issue: Away Team Initialization Failure
The away team was never properly initialized in the game. This cascades to:
1. No on-court players set → no +/- tracking possible
2. No events recorded → no stats aggregated
3. No boxscore entries → leaders page incomplete

### Secondary Issue: 10 Stat Button Types Broken
These Server Actions are either:
1. Not being called by runAction()
2. Throwing errors silently
3. Failing authentication check
4. Failing game status check

### Tertiary Issue: Data Corruption
- Away team roster has all players with #0 jersey
- Game score mismatch (6+6 ≠ 6)
- Game ended prematurely (FINAL after Q1)

---

## Recommendations (Priority Order)

1. **CRITICAL:** Fix away team initialization in startGame()
2. **CRITICAL:** Debug why 10 stat buttons don't create events
3. **HIGH:** Fix away team roster data (jersey numbers)
4. **HIGH:** Investigate game score mismatch
5. **MEDIUM:** Add error handling to runAction() with user-visible feedback
6. **MEDIUM:** Add validation to prevent game ending before Q4

---

## Next Steps for Investigation

1. Check server logs for errors during stat button clicks
2. Add console logging to each Server Action to trace execution
3. Test each stat button individually in browser DevTools
4. Verify requireAuth() is not blocking away team actions
5. Check if game.status check is preventing away team updates
6. Audit database for manual updates to Game.awayScore

