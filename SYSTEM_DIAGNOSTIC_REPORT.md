# 🔍 FULL SYSTEM DIAGNOSTIC REPORT — Game/159 Data Flow

## CRITICAL FINDINGS

### 🔴 БАГ-002: GameOnCourt EMPTY (CONFIRMED)
**Status**: CRITICAL — Cannot calculate +/-
- GameOnCourt records: **0/10** (should be 10 for 5 home + 5 away starters)
- Impact: All BoxScore.plusMinus = 0 (no data to calculate from)
- Root cause: Game/159 created BEFORE GameOnCourt initialization was implemented
- Affects: /game/159 display, leaders ratings (partially), standings

### 🔴 БАГ-003: BoxScore plusMinus ALL ZEROS (CONFIRMED)
**Status**: CRITICAL — Data integrity issue
- PlusMinus ≠ 0: **0/20** players
- Efficiency ≠ 0: **0/20** players
- Root cause: GameOnCourt empty → no on-court tracking → no +/- calculation
- Affects: Player performance metrics, leaders page accuracy

### 🟡 БАГ-008: FIBA Protocol Fields Corrupted (CONFIRMED)
**Status**: CRITICAL — Data quality issue
- Scorer: "ййййй" (garbage characters)
- AssistantScorer: "ццццц" (garbage characters)
- Timer: "ууууу" (garbage characters)
- ShotClockOperator: "ккккккк" (garbage characters)
- Home Coach: "ппппп" (garbage characters)
- Away Coach: "ллллл" (garbage characters)
- Root cause: Manual data entry with Cyrillic keyboard issues or copy-paste corruption
- Affects: /game/159/secretarial-protocol display (shows garbage instead of names)

---

## DATA FLOW ANALYSIS

### ✅ /game/159 Page
**Query**: `prisma.game.findUnique({ where: { id: 159 }, include: { boxScores, events, ... } })`

**Data Status**:
- Game record: ✅ EXISTS (status=FINAL, scores 48:72)
- BoxScore records: ✅ 20 records (all players have points)
- GameEvent records: ✅ 256 events (POINTS, REBOUNDS, FOULS, etc.)
- GameOnCourt records: ❌ 0 records (EMPTY)

**What User Sees**:
- ✅ Game scores: 48:72 (correct)
- ✅ Player points: 6, 6, 6... (correct)
- ❌ Player +/-: 0, 0, 0... (WRONG — should vary)
- ❌ Player efficiency: 0, 0, 0... (WRONG — should be calculated)

**Root Cause**: GameOnCourt not initialized when game was created

---

### ✅ /schedule?ag=older Page
**Query**: `prisma.game.findMany({ where: { seasonId: 2 }, ... })`

**Data Status**:
- Season found: ✅ (ID=2, ageGroup=older)
- Games in season: ✅ 2 games
- Game/159 in results: ✅ YES
- Stage filter: ✅ PASSES (stage=NULL → treated as "group")
- Status filter: ✅ PASSES (status=FINAL)

**What User Sees**:
- ✅ Game/159 appears in schedule
- ✅ Correct scores displayed
- ✅ Correct teams displayed

**Status**: ✅ WORKING CORRECTLY

---

### ✅ /leaders?ag=older Page
**Query**: `prisma.boxScore.findMany({ where: { game: { seasonId: 2, status: { in: ["FINAL", "LIVE"] } } } })`

**Data Status**:
- BoxScore records: ✅ 20 records (game/159 included)
- Unique players: ✅ 20 players
- Unique ratings: ✅ 3 different ratings (68, 66, 63)
- Rating formula: ✅ WORKING (varies by stats)

**What User Sees**:
- ✅ Leaders list displays
- ✅ Ratings vary (not all same)
- ✅ Game/159 data included

**Status**: ✅ WORKING CORRECTLY (despite +/- being zero)

---

### ❌ /game/159/secretarial-protocol Page
**Query**: `prisma.game.findUnique({ where: { id: 159 }, include: { homeTeam, awayTeam, events, boxScores } })`

**Data Status**:
- Game record: ✅ EXISTS
- FIBA fields: ❌ CORRUPTED (garbage characters)
- Coach names: ❌ CORRUPTED (garbage characters)
- Fouls count: ✅ CORRECT (18 events = 18 in BoxScore)

**What User Sees**:
- ❌ Scorer: "ййййй" (should be name)
- ❌ Timer: "ууууу" (should be name)
- ❌ Home Coach: "ппппп" (should be name)
- ❌ Away Coach: "ллллл" (should be name)

**Root Cause**: Data corruption in database (manual entry with keyboard issues)

---

## REVALIDATEPATH COVERAGE ANALYSIS

### addScore() Function (lines 549-662)
**Current revalidatePath calls**:
```
✅ revalidatePath(`/game/${gameId}`)
✅ revalidatePath(`/admin/games/${gameId}`)
❌ revalidatePath(`/leaders?ag=...`) — NOT CALLED
❌ revalidatePath(`/schedule?ag=...`) — NOT CALLED
❌ revalidatePath(`/standings?ag=...`) — NOT CALLED
```

**Impact**: After addScore(), public pages show STALE data:
- /leaders won't update immediately (uses ISR/force-dynamic, but cache may persist)
- /schedule won't update immediately
- /standings won't update immediately

**Missing**: Need to invalidate all age-group-specific pages

---

## REMAINING BUGS FROM AUDIT (20 Total)

### FIXED (4):
- ✅ БАГ-001: id??0 duplicates — FIXED (composite key corrected)
- ✅ БАГ-002: GameOnCourt empty — CODE FIX APPLIED (but old data still broken)
- ✅ БАГ-003: plusMinus zeros — CODE FIX APPLIED (but old data still broken)
- ✅ БАГ-007: fouls mismatch — DISPROVEN (fouls sync correctly)

### CONFIRMED UNFIXED (3):
- 🔴 БАГ-002: GameOnCourt EMPTY for game/159 — REQUIRES DATA MIGRATION
- 🔴 БАГ-003: BoxScore plusMinus=0 for game/159 — REQUIRES DATA MIGRATION
- 🔴 БАГ-008: FIBA protocol fields corrupted — REQUIRES DATA CLEANUP

### UNKNOWN STATUS (13):
- БАГ-004: [need to check]
- БАГ-005: [need to check]
- БАГ-006: [need to check]
- БАГ-009: [need to check]
- БАГ-010: [need to check]
- БАГ-011: [need to check]
- БАГ-012: [need to check]
- БАГ-013: [need to check]
- БАГ-014: [need to check]
- БАГ-015: [need to check]
- БАГ-016: [need to check]
- БАГ-017: [need to check]
- БАГ-018: [need to check]

---

## SUMMARY TABLE

| Component | Status | Issue | Impact |
|-----------|--------|-------|--------|
| /game/159 | ⚠️ PARTIAL | +/- and efficiency = 0 | Misleading player stats |
| /schedule | ✅ OK | None | Game appears correctly |
| /leaders | ✅ OK | None | Ratings calculated correctly |
| /protocol | ❌ BROKEN | Garbage in FIBA fields | Unreadable protocol |
| GameOnCourt | ❌ EMPTY | 0 records for game/159 | Cannot calculate +/- |
| BoxScore | ⚠️ PARTIAL | plusMinus=0, efficiency=0 | Stats incomplete |
| revalidatePath | ⚠️ INCOMPLETE | Missing /leaders, /schedule, /standings | Stale cache on public pages |

---

## NEXT STEPS (NOT IMPLEMENTED YET)

1. **Data Migration**: Backfill GameOnCourt for game/159 (10 records)
2. **Data Cleanup**: Fix FIBA protocol fields (remove garbage characters)
3. **Cache Invalidation**: Add revalidatePath for /leaders, /schedule, /standings in addScore()
4. **Audit Remaining 13 Bugs**: Check each one systematically
