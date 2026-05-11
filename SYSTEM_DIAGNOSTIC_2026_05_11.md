# 🔴 СИСТЕМНАЯ ДИАГНОСТИКА BASKET-LVIV
**Date**: 2026-05-11  
**Analyst**: Senior Fullstack Architect + FIBA Sports Data Engineer  
**Focus**: Complete data integrity, event pipeline, live scoring

---

## 📌 1. АРХИТЕКТУРА СИСТЕМЫ

### A) Data Flow Pipeline
```
UI Button Click (Live Tracker)
    ↓
React State (LiveScoreTracker.tsx)
    ↓
Server Action (recordGameAction, recordSubstitution)
    ↓
Prisma Transaction (game-events.ts)
    ↓
Database Updates:
  - GameEvent (create) ← Event log
  - BoxScore (update) ← Player stats
  - Game (update) ← Score, quarter, status
    ↓
Response to Frontend
    ↓
React setState (game, boxScores)
    ↓
revalidatePath("/leaders") ← Cache invalidation
    ↓
UI Re-render
```

### B) Data Sources
- **Frontend State**: game, isLive, gameTimeLeft, boxScores
- **Database (SSOT)**: Prisma models (Game, BoxScore, GameEvent)
- **Real-time Sync**: REST API calls (no WebSocket)
- **Cache**: Next.js ISR + revalidatePath

---

## 📌 2. LIVE SCORE TRACKER АНАЛИЗ

### A) Timer Logic ✅
**Status**: CORRECT (with caveat)

**Flow**:
1. `useEffect([initialGame.id, initialGame.status, initialGame.currentTimeLeft, initialGame.quarter])`
   - Resets refs on game change
   - Sets `gameStartTimeRef = Date.now() - (600 - dbTime) * 1000` if LIVE
   - Sets `pausedTimeRef = dbTime` if PAUSED

2. `useEffect([isLive, game.id])`
   - Creates `setInterval` every 100ms
   - Calculates: `elapsedSeconds = Math.floor((Date.now() - gameStartTimeRef) / 1000)`
   - Updates: `newTimeLeft = Math.max(0, 600 - elapsedSeconds)`

3. `useEffect([gameTimeLeft, isLive, game.id])`
   - Syncs to DB via `updateGameTime()` when delta ≥ 1 second

**Potential Issues**:
- ⚠️ **ISSUE #1**: `lastSyncTimeRef.current = dbTime` only checks delta ≥ 1 second (line 502)
  - Can miss 100ms ticks if polling is sparse
  - **Risk**: UI shows 9:55, DB has 9:58 if page just loaded
- ✅ **ISSUE #1 MITIGATED**: useEffect first action resyncs from DB (line 436-438)
  - On page reload: `setGameTimeLeft(dbTime)` from initialGame.currentTimeLeft
  - Guarantees sync within 100ms after load

**Verdict**: ✅ TIMER LOGIC SOUND (with sync recovery built in)

---

### B) Roster Panel + Lineup Positions ✅
**Status**: MOSTLY CORRECT (with 1 critical finding)

**Fields**:
- `lineupPosition`: 1-5 = active, 0 = bench ✅
- `isOnCourt`: boolean (redundant with lineupPosition but OK) ✅
- `enteredAt`: gameClockSeconds when entered court ✅
- `timeOnCourtSeconds`: accumulated time (persists across shifts) ✅

**Initialization Logic** (initializeGameDataInternal):
```typescript
const isStarter = playerIndex < 5;
const lineupPosition = isStarter ? (playerIndex + 1) : 0;
```
✅ Correct: First 5 sorted players → positions 1-5, rest → 0

**Display Logic** (RosterPanel):
```typescript
players.slice(0, 5)  // Top 5 = starters
players.slice(5)    // Rest = bench
```
✅ Correct: Reads lineupPosition or falls back to positional order

**🔴 CRITICAL ISSUE FOUND**:
Line 148-149 in recordGameAction (START_GAME case):
```typescript
const homePlayerOrder = actionPayload?.homePlayerOrder as number[];
const awayPlayerOrder = actionPayload?.awayPlayerOrder as number[];
```
- These are OPTIONAL and likely null/undefined
- When null, `initializeGameDataInternal` uses default sort by number
- **Problem**: If homePlayerOrder is passed empty [], uses raw roster order
- **Result**: Wrong starters if coach didn't set custom order

**Real Issue**: Game 255 had boxScores NOT created on START_GAME
- Status moved to LIVE but no BoxScore.create happened
- **Root Cause**: `existingBoxScores === 0` check failed? Or transaction didn't commit?
- **Evidence**: Manual DB query showed 18 records (11 home + 7 away) ✅ now fixed

---

### C) Substitution Logic (recordSubstitution) 🟡
**Status**: LOGICALLY SOUND but 2 concerns

**Flow**:
1. Find playerOut (currently on court)
2. Calculate `timeAdded = gameClockSeconds - playerOut.enteredAt`
3. Save: `timeOnCourtSeconds += timeAdded` ✅
4. Swap positions: 
   ```typescript
   playerOut.lineupPosition = 0
   playerIn.lineupPosition = playerOut.lineupPosition (before update)
   ```
   ✅ Correct: preserves position number

5. Update enteredAt:
   ```typescript
   playerOut.enteredAt = null
   playerIn.enteredAt = gameClockSeconds
   ```
   ✅ Correct: tracks entry time

6. Update shiftStartScores:
   ```typescript
   playerIn.shiftStartHomeScore = game.homeScore
   playerIn.shiftStartAwayScore = game.awayScore
   ```
   ✅ Correct: for +/- calculation

**🟡 CONCERN #1**: Time Calculation
- Formula: `timeAdded = gameClockSeconds - enteredAtValue`
- **Example**: Player entered at 600 (game start), game clock now 570
  - `timeAdded = 570 - 600 = -30` (NEGATIVE!)
  - Then `Math.max(0, timeAdded)` → 0 (LOSS OF TIME)

**Root Cause**: gameClockSeconds counts DOWN (600 → 0), not up
- Should be: `timeAdded = enteredAtValue - gameClockSeconds` = 600 - 570 = 30 ✅

**🔴 CRITICAL BUG #1: SUBSTITUTION TIME LOSS**
- Current: `timeAdded = gameClockSeconds - enteredAtValue`
- Player loses ALL time when subbed out
- Should be: `timeAdded = enteredAtValue - gameClockSeconds`

**🟡 CONCERN #2**: Missing `SUBSTITUTION` event for playerIn
- Code creates GameEvent with playerOutId (line 799)
- No event for playerInId
- **Impact**: Protocol shows who went OUT but not who came IN
- **FIBA Standard**: Both should be logged

---

## 📌 3. EVENT RECORDING (recordGameAction) PIPELINE

### A) Event Type Coverage
| Type | Create | BoxScore Update | Game Update | DB Log |
|------|--------|-----------------|-------------|--------|
| POINTS | ✅ | ✅ (points, fg/ft) | ✅ (score) | ✅ |
| REBOUND_OFF/DEF | ✅ | ✅ | ❌ | ✅ |
| ASSIST | ✅ | ✅ | ❌ | ✅ |
| STEAL | ✅ | ✅ | ❌ | ✅ |
| BLOCK | ✅ | ✅ | ❌ | ✅ |
| TURNOVER | ✅ | ✅ | ❌ | ✅ |
| FOUL (personal/tech/unsport/disq) | ✅ | ✅ | ❌ | ✅ |
| TIMEOUT | ✅ | ❌ | ✅ (timeouts) | ✅ |
| SUBSTITUTION | ✅ | ⚠️ | ❌ | ⚠️ |

### B) POINTS Event Flow
```
1. recordGameAction(type: "POINTS", points: 2/3, playerId)
   ↓
2. Create GameEvent
   ↓
3. Update BoxScore:
   - points += N
   - if points==2: fg2Made++
   - if points==3: fg3Made++
   - if points==1: ftMade++
   ↓
4. Update Game:
   - if homeTeam: homeScore += N
   - if awayTeam: awayScore += N
   ↓
5. revalidatePath("/leaders")
```
✅ **VERDICT**: Correct, idempotency key prevents double-count

### C) MISS Events (MISS_1P, MISS_2P, MISS_3P)
**Status**: ⚠️ INCOMPLETE

**Current Logic**:
```typescript
case "MISS_2P": updates.fg2Attempted++; break;
case "MISS_3P": updates.fg3Attempted++; break;
case "MISS_FT": updates.ftAttempted++; break;
```

**Missing**: `fgAttempted` aggregate field
- Schema has: `fgAttempted`, `fg2Attempted`, `fg3Attempted`, `ftAttempted`
- But events only update specific 2P/3P/FT
- `fgAttempted = fg2Attempted + fg3Attempted` (NOT free throws per FIBA)

**Impact on Stats**:
- `FG% = (fg2Made + fg3Made) / (fg2Attempted + fg3Attempted)` ✅ Correct
- `FT% = ftMade / ftAttempted` ✅ Correct
- Field `fgAttempted` unused/stale

---

## 📌 4. SUBSTITUTION LOGIC DEEP DIVE 🔴

### A) Current Implementation Issues
**Line 751**: `const timeAdded = gameClockSeconds - enteredAtValue;`

**Scenario: Player A enters at gameTime=600, subbed at gameTime=570**
- `enteredAtValue = 600`
- `gameClockSeconds = 570` (time in quarter)
- `timeAdded = 570 - 600 = -30` (NEGATIVE!)
- `Math.max(0, timeAdded) = 0` ← Player loses 30 seconds!

**Correct Formula**:
```typescript
const timeAdded = enteredAtValue - gameClockSeconds;
// 600 - 570 = 30 seconds ✅
```

**🔴 CRITICAL BUG #1 CONFIRMED**: Substitution erases player time

### B) Position Swap Logic
**Current** (line 755):
```typescript
const outPosition = playerOut.lineupPosition;  // 1-5 (or 0 if already bench)
// ...
playerOut.lineupPosition = 0;  // Out → bench
playerIn.lineupPosition = outPosition;  // In → takes that position
```

**Example**:
- Starter #2 (position 2) exits
- Bench #8 (position 0) enters
- After: Starter #2 = bench (0), Bench #8 = position 2 ✅ Correct swap

**Verdict**: ✅ Position swap logic is correct

### C) Lineup Position Tracking
**Issue**: What if same player goes in/out multiple times?

**Scenario**:
1. Game start: Player A = position 1 (starter)
2. First sub: Player A exits (position 0), Player B enters (position 1)
3. Player B later exits (position 1), Player A re-enters
   - `playerA.lineupPosition = 1` (from Player B's old position) ✅ Correct
   - `playerA.enteredAt = new_gameClockSeconds` ✅ New entry time tracked

**Verdict**: ✅ Re-entry tracking works correctly

---

## 📌 5. TIME ACCUMULATION LOGIC

### A) `timeOnCourtSeconds` Field
**Purpose**: Accumulate total time player spent on court across all substitutions

**Update Triggers**:
1. **On SUBSTITUTION** (line 752):
   ```typescript
   newTimeOnCourtSeconds = (playerOut.timeOnCourtSeconds || 0) + Math.max(0, timeAdded);
   ```
   🔴 **BUG**: timeAdded is likely 0 or negative!

2. **On END_GAME** (line 442-445):
   ```typescript
   const timeAdded = boxScore.enteredAt
     ? Math.max(0, gameClockSeconds - (boxScore.enteredAt || 0))
     : 0;
   updates.timeOnCourtSeconds = (boxScore.timeOnCourtSeconds || 0) + timeAdded;
   ```
   🔴 **SAME BUG**: gameClockSeconds - enteredAt (counts down!)

3. **On FOUL_OUT** (line 442-445):
   Same as END_GAME ↑ 🔴 **BUG**

**🔴 CRITICAL BUG #2 CONFIRMED**: Time calculation uses wrong direction
- All 3 places use `gameClockSeconds - enteredAt`
- Should be `enteredAt - gameClockSeconds`

### B) MPG Calculation (lib/leaders/calculations.ts:54)
```typescript
const totalMinutes = totalTimeOnCourtSeconds / 60;
const mpg = Math.round((totalMinutes / gamesPlayed) * 10) / 10;
```
✅ Correct formula, but relies on correct timeOnCourtSeconds

---

## 📌 6. BOXSCORE STATS AGGREGATION

### A) Leader Stats Calculation (stats-calculator.ts:24)
```typescript
for (const bs of boxScores) {
  existing.points += bs.points;
  existing.rebounds += bs.rebounds;
  existing.assists += bs.assists;
  existing.steals += bs.steals;
  existing.blocks += bs.blocks;
  existing.fouls += bs.foulsPersonal;  // ← Only PERSONAL, not TECH/UNSPORT/DISQ
  existing.turnovers += bs.turnovers;
  existing.games += 1;
}
```

**Issue #1**: `fouls` uses ONLY `foulsPersonal`
- Ignores `foulsTechnical`, `foulsUnsports`, `foulsDisq`
- **Impact**: Player with 2 personal + 1 technical = shows as 2 fouls (missing 1)
- **FIBA Standard**: All foul types should count

**Issue #2**: `games` incremented per boxScore
- If player appears in 3 games: `games = 3` ✅ Correct
- But needs `FINISHED` status games only?

**Verdict**: 🟡 FOULS COUNTING INCOMPLETE

### B) ККД Calculation (calculations.ts:64)
```typescript
const totalValue = points + rebounds + assists + steals + blocks - fouls;
return Math.round((totalValue / gamesPlayed) * 10) / 10;
```
- `fouls = foulsPersonal` only (same issue as above)
- Should be: `fouls = foulsPersonal + foulsTechnical + foulsUnsports + foulsDisq`

**Verdict**: 🔴 **BUG #3**: ККД calculation missing technical/unsport fouls

### C) Rating Calculation (calculations.ts:84-93)
```typescript
const rating = 50 + ppg * 1.8 + rpg * 1.2 + apg * 1.5 + spg * 2.0 + bpg * 1.8;
return Math.max(0, Math.min(99, Math.round(rating)));
```

**Formula Breakdown**:
- Base: 50
- PPG (points): ×1.8
- RPG (rebounds): ×1.2
- APG (assists): ×1.5
- SPG (steals): ×2.0 ✅ Highest multiplier
- BPG (blocks): ×1.8

**Verification**: Match with PROMPT spec
- ✅ Matches: "50 + ОЧ×1.8 + РЕБ×1.2 + ПЕР×1.5 + ПЕР.М×2.0 + БЛК×1.8"
- ОЧ=points, РЕБ=rebounds, ПЕР=assists, ПЕР.М=steals, БЛК=blocks

**Verdict**: ✅ Rating formula is FIBA-compliant

---

## 📌 7. PLUS/MINUS CALCULATION

### A) Current Implementation
**On SUBSTITUTION** (line 762-767):
```typescript
const isHomePlayer = playerOut.teamId === game.homeTeamId;
const scoreDiffNow = game.homeScore - game.awayScore;
const scoreDiffAtEntry = (playerOut.shiftStartHomeScore || 0) - (playerOut.shiftStartAwayScore || 0);
const shiftPlusMinus = isHomePlayer
  ? scoreDiffNow - scoreDiffAtEntry
  : scoreDiffAtEntry - scoreDiffNow;

updates.plusMinus = (playerOut.plusMinus || 0) + shiftPlusMinus;
```

**Example**:
- Game: Home 60, Away 55 (diff = +5 for Home)
- Player entered when: Home 50, Away 50 (diff = 0)
- Player is HOME team
- Shift +/- = (60-55) - (50-50) = 5 - 0 = +5 ✅ Correct (Home scored 10, Away 5)

**Verdict**: ✅ Plus/Minus logic is correct

### B) Applied On
- ✅ SUBSTITUTION (player out)
- ✅ END_GAME (players still on court)
- ✅ FOUL_OUT (5 personal fouls)

**Verdict**: ✅ All trigger points covered

---

## 📌 8. LEADERS PAGE PIPELINE

### A) Data Flow
```
/leaders/page.tsx (Server Component)
  ↓
SELECT boxScores WHERE game.status IN ["FINISHED", "LIVE"]
  ↓
calculateLeaderStats(boxScores)
  ↓
Sort by rating DESC, kkd DESC
  ↓
<LeadersContainer> + <LeadersAutoRefresh>
  ↓
Every 30s: router.refresh() → revalidatePath("/leaders")
```

**Status Filter** (line 19):
```typescript
where: { game: { seasonId: season.id, status: { in: ["FINISHED", "LIVE"] } } }
```
✅ Includes LIVE games (for real-time updates)

**Cache Invalidation**:
- `revalidatePath("/leaders")` called on every game action
- `<LeadersAutoRefresh/>` polls every 30s

**Verdict**: ✅ Leaders real-time pipeline correct

### B) ⚠️ Issue: LIVE Games in Stats
- Leaders include `status: "LIVE"` games
- A player's stats update in real-time as game plays
- Is this desired? (Most sports show only FINISHED games)

**FIBA Standard**: Typically use only FINISHED games
- Current: Includes partial stats from live games
- **Impact**: A player with 10 pts in first half shows 10 PPG (not normalized)

**Verdict**: 🟡 DESIGN CHOICE (not a bug, but review with product)

---

## 📌 9. ACHIEVEMENTS LOGIC

### A) Current Implementation
**On END_GAME** (lines 207-288):
1. Load all season box scores for all players in this game
2. For each player, run `checkNewAchievements(boxScores, unlockedBadges)`
3. `upsert` new badges (create if not exists, no-op on re-eval)

**Idempotency**: 
```typescript
await tx.playerAchievement.upsert({
  where: { playerId_badgeId: { playerId, badgeId } },
  create: { ... },
  update: {}, // No-op on re-evaluation
});
```
✅ Safe to call multiple times

**Undo Behavior** (undoGameAction, line 563-566):
```
// NOTE: Achievements are NOT revoked on undo.
// Once a player earns a badge, it stays permanently.
```
✅ Correct (achievements are permanent)

**Verdict**: ✅ Achievement system idempotent and correct

---

## 📌 10. RACE CONDITIONS & CONCURRENCY

### A) Simultaneous Edits
**Scenario**: 2 admins click "+2 points" at same time for same player

**Protection**:
1. **Database Constraint**: `BoxScore.gameId_playerId` UNIQUE
   - Both transactions try to UPDATE same row
   - Prisma applies last write wins (no conflict)
   - ✅ No duplicate records

2. **Idempotency Key**: `GameEvent.idempotencyKey` UNIQUE
   - If UI sends same UUID twice (double-click)
   - Line 320: Check if event with idempotencyKey exists
   - Return cached result
   - ✅ Prevents double-count

**Verdict**: ✅ Race condition protection adequate

### B) Transaction Isolation
```typescript
await prisma.$transaction(async (tx) => {
  // All reads/writes atomic
}, { maxWait: 5000, timeout: 10000 })
```
✅ Transaction level: default (READ_COMMITTED)

---

## 📌 11. CRITICAL BUGS SUMMARY

| Priority | Bug | File | Line | Impact | Status |
|----------|-----|------|------|--------|--------|
| 🔴 CRITICAL | Time calculation wrong direction | game-events.ts | 751, 442, 442 | Player time = 0 | NOT FIXED |
| 🔴 CRITICAL | Fouls counting incomplete | stats-calculator.ts | 57, 80 | ККД wrong | NOT FIXED |
| 🟡 HIGH | Missing playerIn SUBSTITUTION event | game-events.ts | 795-803 | Protocol incomplete | NOT FIXED |
| 🟡 MEDIUM | fgAttempted field unused | stats-calculator.ts | - | Tech debt | OK |
| 🟢 LOW | LIVE games in leader stats | leaders/page.tsx | 19 | Design review | OK |

---

## 📌 12. "МУСОРНЫЙ КОД"

### A) Dead Code
- `missedFg2`, `missedFg3`, `missedFt` fields in BoxScore (deprecated)
- `fgAttempted` field (calculated but never updated)
- `minutes` field (legacy, should use timeOnCourtSeconds)

### B) Duplication
- `fouls` vs `foulsPersonal` vs `foulsTechnical` vs `foulsUnsports` vs `foulsDisq`
  - `fouls` field is legacy (not maintained)
  - Should delete or always = sum of all foul types

### C) Unused Code
- `timerRunning` field on Game (set but never used)
- `eventSubtype` vs `eventContext` (both similar, use one)

---

## 📌 13. DATA INTEGRITY ISSUES

### Issue #1: Game Status Transitions
Valid: `SCHEDULED` → `LIVE` → `PAUSED` → `LIVE` → `FINISHED`
Invalid: `FINISHED` → anything (no revert)

**Current Code**: No validation that prevents invalid transitions
- Admin could set FINISHED game back to LIVE
- Would create new events with finished=false?

**Verdict**: 🟡 Add status transition validation

---

## 📌 FINAL REPORT

### ✅ What Works
1. **Timer Logic** — Correct, with DB sync recovery
2. **Substitution Position Swap** — Correct lineup positioning
3. **Plus/Minus Calculation** — Correct formula and triggers
4. **Event Recording** — Atomic transactions, idempotency keys
5. **Achievement System** — Permanent, idempotent, no revoke
6. **Race Condition Protection** — Unique constraints + transactions
7. **Leaders Real-Time** — Cache invalidation + polling

### 🔴 Critical Issues (FIX REQUIRED)
1. **BUG #1**: `timeAdded = gameClockSeconds - enteredAt` (3 places)
   - Should be: `timeAdded = enteredAt - gameClockSeconds`
   - Players lose all court time on substitution
   
2. **BUG #2**: `foulsPersonal` only in ККД calculation
   - Should include: `foulsPersonal + foulsTechnical + foulsUnsports + foulsDisq`
   - Leaders stats wrong for players with tech fouls

3. **BUG #3**: Missing playerIn GameEvent
   - Substitution logs playerOut, not playerIn
   - Protocol incomplete

### 🟡 Concerns (Review)
- LIVE games included in leaders (real-time) vs FINISHED only
- No game status transition validation
- Legacy fields (`fouls`, `minutes`) cause confusion

### 📊 System Health
- **Data Flow**: ✅ Correct
- **Atomicity**: ✅ Transactions solid
- **Idempotency**: ✅ Keys prevent duplicates
- **Cache**: ✅ Invalidation working
- **Stat Calculation**: 🟡 Two bugs found
- **Time Tracking**: 🔴 Formula broken

**Overall Status**: 🟡 PRODUCTION ISSUE (2 critical bugs, 1 data integrity gap)

---

## 🎯 NEXT STEP: PROMPT 2 (ИСПРАВЛЕНИЕ)

Ready to receive PHASE 2 — fixing these 3 critical issues + data validation.

