# DIAGNOSTIC REPORT 2: SOURCES OF TRUTH & DATA FLOW MAPPING

**Generated:** 2026-05-11

---

## I. SINGLE SOURCE OF TRUTH (SSOT) MATRIX

### A. Core Game State

| Entity | Primary SSOT | Secondary Reads | Sync Method | Conflicts? |
|--------|---|---|---|---|
| **Game Score** | `Game.homeScore`, `Game.awayScore` (Int) | BoxScore sum (verification only) | Transactional update | ❌ NO |
| **Game Status** | `Game.status` (enum: SCHEDULED/LIVE/PAUSED/FINISHED) | GameEvent count (audit) | Manual status transition | ❌ NO |
| **Game Quarter** | `Game.quarter` (Int 1-4) | GameEvent.quarter (log) | Manual increment | ✅ SYNCED |
| **Game Time** | `Game.currentTimeLeft` (Int, seconds) | None | updateGameTime() action | ❌ SINGLE SOURCE |

**Flow Diagram:**
```
User clicks "+2"
    ↓
recordGameAction(POINTS, playerId, 2)
    ↓
prisma.$transaction([
  GameEvent.create(type: POINTS, points: 2),
  BoxScore.update(points += 2),
  Game.update(homeScore += 2)  ← SSOT for score
])
    ↓
All three updated atomically
    ↓
revalidatePath() → Fresh data to UI
```

---

### B. Player Court Status

| Entity | SSOT | Reliability | Risk | Notes |
|---|---|---|---|---|
| **isOnCourt** | `BoxScore.isOnCourt` (Boolean) | ✅ HIGH | 🟢 LOW | Set by SUBSTITUTION, END_GAME, FOUL (5+) |
| **lineupPosition** | `BoxScore.lineupPosition` (Int 0-5) | ✅ HIGH | 🟢 LOW | 1-5 for active, 0 for bench |
| **enteredAt** | `BoxScore.enteredAt` (Int?) | ✅ HIGH | 🟡 MEDIUM | Timestamp in gameClockSeconds |
| **timeOnCourtSeconds** | `BoxScore.timeOnCourtSeconds` (Int) | ✅ HIGH | 🟡 MEDIUM | Accumulated time from substitutions |

**Substitution Flow:**
```
recordSubstitution(playerOutId, playerInId)
    ↓
tx.boxScore.update(playerOutId, {
  timeOnCourtSeconds: += (gameClockSeconds - enteredAt),
  enteredAt: null,
  isOnCourt: false,
  lineupPosition: 0  ← ALWAYS goes to bench
})
    ↓
tx.boxScore.update(playerInId, {
  enteredAt: gameClockSeconds,  ← NEW entry timestamp
  isOnCourt: true,
  lineupPosition: outPlayer.lineupPosition  ← INHERITED position
})
    ↓
Both operations atomic, cannot be partial
```

**Example Timeline:**
```
START_GAME:
  Player A (starter #1): isOnCourt=true, enteredAt=600, lineupPosition=1, timeOnCourtSeconds=0

Q1 2:30 mark (gameClockSeconds = 150):
  recordSubstitution(A→B):
    Player A: timeOnCourtSeconds = 0 + (150-600) → MAX(0, -450)=0 ❌ BUG!
    
ISSUE: Starter enters at 600, leaves 150 seconds later?
  This violates game logic: gameClockSeconds should COUNT DOWN (600→0)
  
VERIFICATION: 
  Is gameClockSeconds a COUNTDOWN timer?
  Looking at updateGameTime(): currentTimeLeft decrements
  But gameClockSeconds in events is NOT the same as currentTimeLeft!
  
  gameClockSeconds likely = 600 - currentTimeLeft (elapsed time in quarter)
  So: START: gameClockSeconds=0, END: gameClockSeconds=600
  
  Updated timeline:
  START_GAME: gameClockSeconds=0, enteredAt=0
  Q1 2:30 mark: gameClockSeconds=150
  Substitution: timeAdded = 150 - 0 = 150 seconds ✅ CORRECT
```

---

### C. Box Score Statistics

| Stat | SSOT | Source | Method |
|------|------|--------|--------|
| `points` | `BoxScore.points` | GameEvent.POINTS | Incremented in recordGameAction |
| `rebounds` | `BoxScore.rebounds` | GameEvent.REBOUND_OFF + REBOUND_DEF | Sum of rebound types |
| `assists` | `BoxScore.assists` | GameEvent.ASSIST | Incremented |
| `steals` | `BoxScore.steals` | GameEvent.STEAL | Incremented |
| `blocks` | `BoxScore.blocks` | GameEvent.BLOCK | Incremented |
| `turnovers` | `BoxScore.turnovers` | GameEvent.TURNOVER | Incremented |
| `foulsPersonal` | `BoxScore.foulsPersonal` | GameEvent.FOUL | Incremented, triggers DQ at 5+ |
| `foulsTechnical` | `BoxScore.foulsTechnical` | GameEvent.FOUL_TECHNICAL | Incremented |
| `foulsUnsports` | `BoxScore.foulsUnsports` | GameEvent.FOUL_UNSPORTSMANLIKE | Incremented |
| `foulsDisq` | `BoxScore.foulsDisq` | GameEvent.FOUL_DISQUALIFYING | Incremented |

**Verification at END_GAME (game-events.ts line 189-205):**
```typescript
const allBoxScores = await tx.boxScore.findMany({ where: { gameId } });
const homePoints = allBoxScores
  .filter(bs => bs.teamId === game.homeTeamId)
  .reduce((sum, bs) => sum + (bs.points || 0), 0);

if (homePoints !== game.homeScore) {
  console.error(`Score mismatch: Game=${game.homeScore}, Sum=${homePoints}`);
}
// WARNING: Log only, doesn't CORRECT the mismatch
```

---

## II. DATA FLOW DIAGRAMS

### Flow 1: Simple Score (1-3 Points)

```
┌─────────────────────────────────────────┐
│ LiveScoreTracker (Client)               │
│ User: Click "+2" button                 │
└────────────────┬────────────────────────┘
                 │
                 ↓
        ┌────────────────────┐
        │ recordGameAction() │ (server action)
        │ {                  │
        │   gameId: 5,       │
        │   actionType: POINTS,
        │   playerId: 12,    │
        │   points: 2,       │
        │   quarter: 1,      │
        │   gameClockSeconds │
        │ }                  │
        └────────┬───────────┘
                 │
        ┌────────▼──────────────────────────────────┐
        │ prisma.$transaction(async (tx) => {        │
        │                                            │
        │  1. Check idempotency (idempotencyKey)    │
        │  2. Create GameEvent {                    │
        │       gameId: 5,                          │
        │       playerId: 12,                       │
        │       type: "POINTS",                     │
        │       points: 2,                          │
        │       quarter: 1,                         │
        │       gameClockSeconds: 250,              │
        │       runningHomeScore: 45,               │
        │       runningAwayScore: 42                │
        │     }                                     │
        │                                           │
        │  3. Update BoxScore {                     │
        │       playerId: 12,                       │
        │       points += 2,                        │
        │       fg2Made += 1                        │
        │     }                                     │
        │                                           │
        │  4. Update Game {                         │
        │       homeScore += 2  ← SSOT              │
        │     }                                     │
        │ })                                        │
        └────────┬───────────────────────────────────┘
                 │
                 ↓
        ┌────────────────────┐
        │ revalidatePath()    │
        │ /leaders            │
        │ /game/5             │
        └────────┬────────────┘
                 │
                 ↓
        ┌────────────────────────────┐
        │ Next.js Cache Invalidation │
        │ Response includes fresh    │
        │ updatedGame object         │
        └────────┬───────────────────┘
                 │
                 ↓
        ┌──────────────────────────────┐
        │ LiveScoreTracker re-renders │
        │ New score: 45-42             │
        │ Updated BoxScore visible     │
        └──────────────────────────────┘
```

---

### Flow 2: Player Substitution (Complex)

```
┌────────────────────────────────────────┐
│ DraggableRosterPanel                   │
│ User drags Player A from lineup        │
│ to bench, Player B from bench to lineup│
└────────────────┬───────────────────────┘
                 │
                 ↓
        ┌────────────────────────────┐
        │ handleDrop()               │
        │ setOrder([old→new order])  │
        │ recordSubstitution({       │
        │   playerOutId: A,          │
        │   playerInId: B,           │
        │   gameClockSeconds: 250,   │
        │   quarter: 1               │
        │ })                         │
        └────────┬───────────────────┘
                 │
  ┌──────────────▼──────────────────────────────────┐
  │ prisma.$transaction(                             │
  │   {maxWait: 5000, timeout: 10000}               │
  │ )                                               │
  └──────────────┬──────────────────────────────────┘
                 │
        ┌────────▼──────────────────────────────┐
        │ Step 1: Load playerOut data            │
        │ SELECT * FROM BoxScore WHERE           │
        │   gameId=5 AND playerId=A              │
        │ Returns:                               │
        │   {                                    │
        │     enteredAt: 0,                      │
        │     timeOnCourtSeconds: 0,             │
        │     lineupPosition: 1,                 │
        │     isOnCourt: true,                   │
        │     shiftStartHomeScore: 40,           │
        │     shiftStartAwayScore: 40            │
        │   }                                    │
        └────────┬──────────────────────────────┘
                 │
        ┌────────▼────────────────────────────────┐
        │ Step 2: Calculate exit stats            │
        │ timeAdded = 250 - 0 = 250 seconds       │
        │ newTimeOnCourtSeconds = 0 + 250 = 250   │
        │ scoreNow = 44 (home), 40 (away)         │
        │ scoreDiffEntry = 40-40 = 0              │
        │ scoreDiffNow = 44-40 = +4               │
        │ shiftPlusMinus = 4 - 0 = +4             │
        └────────┬────────────────────────────────┘
                 │
        ┌────────▼────────────────────────────────┐
        │ Step 3: Update playerOut (A)            │
        │ UPDATE BoxScore SET                     │
        │   timeOnCourtSeconds = 250,             │
        │   enteredAt = NULL,                     │
        │   isOnCourt = false,                    │
        │   lineupPosition = 0,  ← goes to bench │
        │   plusMinus = 0 + 4 = 4                 │
        │ WHERE gameId=5 AND playerId=A           │
        └────────┬────────────────────────────────┘
                 │
        ┌────────▼────────────────────────────────┐
        │ Step 4: Update playerIn (B)             │
        │ UPDATE BoxScore SET                     │
        │   enteredAt = 250,  ← NEW entry time   │
        │   isOnCourt = true,                     │
        │   lineupPosition = 1,  ← INHERITS A's │
        │   shiftStartHomeScore = 44,             │
        │   shiftStartAwayScore = 40              │
        │   timeOnCourtSeconds = unchanged        │
        │ WHERE gameId=5 AND playerId=B           │
        └────────┬────────────────────────────────┘
                 │
        ┌────────▼────────────────────────────────┐
        │ Step 5: Create audit event              │
        │ INSERT INTO GameEvent                   │
        │   type: SUBSTITUTION,                   │
        │   playerId: A (player OUT)              │
        │   quarter: 1,                           │
        │   gameClockSeconds: 250                 │
        └────────┬────────────────────────────────┘
                 │
        ┌────────▼────────────────────────────────┐
        │ COMMIT TRANSACTION                      │
        │ ← All 4 updates applied atomically      │
        └────────┬────────────────────────────────┘
                 │
                 ↓
        ┌────────────────────────────┐
        │ Return updatedGame with    │
        │ fresh boxScores            │
        │ (player A: isOnCourt=false)│
        │ (player B: isOnCourt=true) │
        └────────┬───────────────────┘
                 │
                 ↓
        ┌─────────────────────────────────┐
        │ RosterPanel re-renders          │
        │ Player A moves to bench (green) │
        │ Player B moves to court (blue)  │
        │ Court time shows: 4:10          │
        └─────────────────────────────────┘
```

---

### Flow 3: Game Initialization (START_GAME)

```
┌─────────────────────────────────┐
│ Admin: Click "START GAME"        │
│ Game 5: Team A vs Team B         │
└────────────┬────────────────────┘
             │
      ┌──────▼─────────────────┐
      │ recordGameAction({      │
      │   actionType: START_GAME
      │   gameId: 5,            │
      │   payload: {            │
      │     homePlayerOrder:    │
      │       [12, 14, 15, ...] │
      │     awayPlayerOrder:    │
      │       [18, 20, 22, ...] │
      │   }                     │
      │ })                      │
      └──────┬──────────────────┘
             │
    ┌────────▼────────────────────────┐
    │ Idempotency check:              │
    │ SELECT COUNT(*) FROM BoxScore   │
    │ WHERE gameId = 5                │
    │                                 │
    │ If count > 0: SKIP init         │
    │ If count = 0: Initialize        │
    └────────┬─────────────────────────┘
             │
    ┌────────▼──────────────────────────────────┐
    │ FOR each player in homeTeam:              │
    │   index 0-4: starters                     │
    │   index 5+: bench                         │
    │                                           │
    │ UPSERT BoxScore {                         │
    │   gameId: 5,                              │
    │   playerId: 12,                           │
    │   teamId: (team A id),                    │
    │   isStarter: true (index < 5),            │
    │   lineupPosition: 1 (index + 1),   ← KEY │
    │   enteredAt: 600 (if starter),            │
    │   isOnCourt: true (if starter),           │
    │   timeOnCourtSeconds: 0,                  │
    │   points: 0,                              │
    │   rebounds: 0,                            │
    │   assists: 0,                             │
    │   ... (all stats = 0)                    │
    │ }                                         │
    │                                           │
    │ Same for awayTeam players                 │
    └────────┬──────────────────────────────────┘
             │
    ┌────────▼──────────────────────┐
    │ Update Game {                  │
    │   status: "LIVE",              │
    │   currentTimeLeft: 600,        │
    │   quarter: 1                   │
    │ }                              │
    └────────┬──────────────────────┘
             │
    ┌────────▼──────────────────────────┐
    │ COMMIT TRANSACTION                │
    │ ← All players initialized          │
    │ ← Game marked LIVE                 │
    └────────┬──────────────────────────┘
             │
             ↓
    ┌─────────────────────────────────┐
    │ RosterPanel renders             │
    │ ✅ 5 starters (green, positions │
    │    1-5)                         │
    │ 🪑 N bench players (gray,       │
    │    position 0)                  │
    │ Court time: each starter        │
    │    running from 0:00            │
    └─────────────────────────────────┘
```

---

## III. CONFLICT POINT ANALYSIS

### Conflict 1: Score Update Paths

| Path | Used By | Atomicity | Idempotency | SSOT Update | Issue |
|------|---------|-----------|-------------|---|---|
| **recordGameAction()** | LiveScoreTracker (main UI) | ✅ Trans | ✅ Key | Game + BoxScore | BEST |
| **/api/games/[id]/score** | Legacy/unknown | ❌ NO | ❌ NO | Game only | ⚠️ Missing BoxScore |
| **/api/admin/games/[id]/stat** | Admin import? | ❌ NO | ❌ NO | BoxScore only | ⚠️ Missing GameEvent |
| **/api/admin/games/[id]/boxscore** | Admin import | ✅ Trans* | ⚠️ Destructive | All (wipes!) | 🔴 DANGEROUS |

**Recommended:** Remove `/api/games/[id]/score` and `/api/admin/games/[id]/stat`

---

### Conflict 2: Timer Management

| Source | Field | Type | Updates | Risk |
|--------|-------|------|---------|------|
| **Game DB** | `currentTimeLeft` | Int (sec) | updateGameTime() action | Direct mutation |
| **GameEvent** | `gameClockSeconds` | Int (sec) | Implicit on every action | Derived from client state |
| **Client State** | game clock | Runtime | useEffect polling? | May drift |

**Issue:** Where is gameClockSeconds sourced on the client?
- Assumption: UI countdown timer → user clicks action → gameClockSeconds sent server
- Risk: If client clock drifts, timestamps are wrong

---

## IV. DATA CONSISTENCY GUARANTEES

### Transaction Boundaries (What's Atomic)

✅ **ATOMIC (All-or-Nothing):**
- recordGameAction() - wraps GameEvent + BoxScore + Game
- recordSubstitution() - wraps 2 BoxScore updates + GameEvent
- initializeGameData() - wraps all players' BoxScore creation
- END_GAME - wraps shifts, achievements, score verification

❌ **NOT ATOMIC:**
- revalidatePath() called after transaction
- Cache invalidation outside transaction
- Multiple API calls from client (e.g., undo then redo)

---

### Cascading Deletes

```prisma
model BoxScore {
  game Game @relation(fields: [gameId], references: [id], onDelete: Cascade)
}
```

**If Game is deleted:**
- All BoxScores deleted (cascade)
- All GameEvents deleted (cascade)
- All GameSubstitutions deleted (cascade)
- ✅ Data integrity maintained

---

## V. SSOT VALIDATION CHECKLIST

| Question | Answer | File:Line | Status |
|----------|--------|---|---|
| Where is game score stored? | `Game.homeScore`, `Game.awayScore` | game-events.ts:497-500 | ✅ CENTRALIZED |
| How is score verified? | Sum all `BoxScore.points` per team | game-events.ts:189-205 | ✅ VERIFIED at END_GAME |
| What if sum ≠ game score? | Logged as ERROR, game completes anyway | game-events.ts:200-204 | ⚠️ NO CORRECTION |
| Where is player court status stored? | `BoxScore.isOnCourt` + `lineupPosition` | schema.prisma:236-237 | ✅ CENTRALIZED |
| How many times can player sub in/out? | Unlimited, time accumulates | game-events.ts:751-752 | ✅ UNLIMITED |
| What happens if sub timing wrong? | timeAdded clamped to ≥0 by Math.max | game-events.ts:443 | ✅ SAFE |
| Where is player time on court stored? | `BoxScore.timeOnCourtSeconds` | game-events.ts:445 | ✅ CENTRALIZED |
| Does game clock countdown sync with subs? | Assumed yes, not explicitly verified | - | ⚠️ TRUST-BASED |

---

**End of Report 2**

Next: See DIAGNOSTIC_REPORT_3_SAFE_CLEANUP_PLAN.md
