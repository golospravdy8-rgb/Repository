# DIAGNOSTIC REPORT 4: PRODUCTION RISKS & BUG ANALYSIS

**Generated:** 2026-05-11  
**Impact Assessment:** CRITICAL, HIGH, MEDIUM, LOW

---

## I. CRITICAL RISKS (🔴 Severity: Production-Blocking)

### CRITICAL-001: Race Condition in /api/admin/games/[id]/stat

**File:** `app/api/admin/games/[id]/stat/route.ts` (lines 4-31)

**Issue:**
```typescript
export async function POST(req: NextRequest) {
  const { playerId, stat, value = 1 } = await req.json();
  
  // ❌ NO TRANSACTION - NOT ATOMIC
  const boxScore = await prisma.boxScore.update({
    where: { gameId_playerId: { gameId, playerId } },
    data: { [stat]: { increment: value } }
  });
  
  // ❌ NO GAME EVENT CREATED - AUDIT TRAIL BREAKS
  // ❌ NO REVALIDATION - CACHE STALE
  return NextResponse.json({ ok: true, boxScore });
}
```

**Attack Vector:**
```
Admin clicks: +1 assist for Player 12
  ↓
Request A: gameId=5, playerId=12, stat='assists', value=1
Request B: gameId=5, playerId=12, stat='assists', value=1
  ↓
Race condition (even microseconds apart):

Timeline:
T1: Request A reads: assists=3
T2: Request B reads: assists=3
T3: Request A writes: assists=4 (3+1)
T4: Request B writes: assists=4 (3+1)
    ↓ LOST ONE INCREMENT
T5: Database shows: assists=4 (should be 5)
```

**Impact:**
- Player stats silently corrupted
- Leaderboards inaccurate
- Reports invalid
- No audit trail for data integrity investigation

**Probability:** HIGH (concurrent admin operations likely in tournament)

**Affected Data:**
- All BoxScore fields can be incremented this way
- Points, rebounds, assists, fouls, etc.

**Recommended Fix:**

```typescript
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const gameId = parseInt(params.id);
    const { playerId, stat, value = 1 } = await req.json();

    // TRANSACTION wrapper
    const result = await prisma.$transaction(async (tx) => {
      // 1. Validate game exists and is not finished
      const game = await tx.game.findUnique({ where: { id: gameId } });
      if (!game) throw new Error("Game not found");
      if (game.status === "FINISHED") {
        throw new Error("Cannot modify finished game");
      }

      // 2. Update BoxScore atomically
      const boxScore = await tx.boxScore.update({
        where: { gameId_playerId: { gameId, playerId } },
        data: { [stat]: { increment: value } },
      });

      // 3. Create audit event
      let eventType = "MANUAL_STAT_EDIT";
      if (stat === "points") eventType = "POINTS";
      if (stat === "rebounds") eventType = "REBOUND_OFF";
      if (stat.includes("foul")) eventType = "FOUL";

      await tx.gameEvent.create({
        data: {
          gameId,
          playerId,
          type: eventType,
          quarter: game.quarter,
          gameClockSeconds: 0, // Unknown, use 0
          teamId: boxScore.teamId,
          points: stat === "points" ? value : null,
        },
      });

      // 4. If points changed, update game score
      if (stat === "points") {
        const isHome = boxScore.teamId === game.homeTeamId;
        await tx.game.update({
          where: { id: gameId },
          data: isHome
            ? { homeScore: { increment: value } }
            : { awayScore: { increment: value } },
        });
      }

      return boxScore;
    });

    // Invalidate caches
    revalidatePath(`/admin/games/${gameId}`);
    revalidatePath(`/game/${gameId}`);
    revalidatePath('/leaders');

    return NextResponse.json({ ok: true, boxScore: result });
  } catch (error) {
    console.error("Stat update error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
```

**Testing:**
```bash
# Concurrent writes test
for i in {1..10}; do
  curl -X POST http://localhost:3006/api/admin/games/5/stat \
    -H "Content-Type: application/json" \
    -d '{"playerId":12,"stat":"assists","value":1}' &
done
wait
# Verify: assists = 10 (not 1)
```

---

### CRITICAL-002: Destructive deleteMany() in /api/admin/games/[id]/boxscore

**File:** `app/api/admin/games/[id]/boxscore/route.ts` (line 32)

**Issue:**
```typescript
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  // ... validation ...
  
  // 🔴 DELETES ALL BOXSCORES FOR THIS GAME
  await prisma.boxScore.deleteMany({ where: { gameId } });
  
  // 🔴 ALL HISTORICAL DATA LOST:
  // - timeOnCourtSeconds (court time tracking)
  // - enteredAt (entry timestamps)
  // - isOnCourt (current status)
  // - lineupPosition (bench/court status)
  // - plusMinus (player +/-)
  // - shiftStartHomeScore/awayScore (shift anchors)
  
  // Then recreate with default values
  await prisma.boxScore.createMany({
    data: body.map((entry) => ({
      // ❌ All historical fields set to defaults
      // ❌ No recovery possible
    }))
  });
}
```

**Attack Vector:**
```
Scenario: Game in progress, 3rd quarter
Admin: "Let me re-import the box scores from PDF"
  ↓
Delete: All boxscores erased
  ↓
Database state:
  Player A: timeOnCourtSeconds = 0 (was 850)
  Player A: enteredAt = null (was 300)
  Player A: isOnCourt = false (was true)
  Player A: lineupPosition = 0 (was 3)
  ↓
Consequences:
  - Court time tracking = BROKEN
  - Player status = WRONG (shows on bench, actually on court)
  - +/- = INVALID (can't recalculate without original shift scores)
  - Substitution history = LOST
```

**Impact:**
- Game integrity compromised
- Stats permanently invalid
- Cannot be fixed without manual database surgery
- Leaderboard calculations corrupted

**Probability:** MEDIUM (less frequent than stat endpoint)

**Recommended Fix:**

```typescript
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const gameId = parseInt(params.id);
    if (isNaN(gameId)) {
      return NextResponse.json({ error: "Invalid game ID" }, { status: 400 });
    }

    const body = await req.json();
    if (!Array.isArray(body)) {
      return NextResponse.json({ error: "Body must be an array" }, { status: 400 });
    }

    // Verify game exists
    const game = await prisma.game.findUnique({ where: { id: gameId } });
    if (!game) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 });
    }

    // PROTECTION: Don't allow bulk replace if game is LIVE
    if (game.status === "LIVE") {
      return NextResponse.json(
        { error: "Cannot replace box scores of LIVE game. Use individual stat updates." },
        { status: 400 }
      );
    }

    // OPTION A: Upsert instead of delete+create
    // Preserves historical data, only updates allowed fields
    const results = await prisma.$transaction(
      body.map((entry) =>
        prisma.boxScore.upsert({
          where: { gameId_playerId: { gameId, playerId: entry.playerId } },
          update: {
            // Only allow safe fields to update
            points: entry.points ?? undefined,
            rebounds: entry.rebounds ?? undefined,
            assists: entry.assists ?? undefined,
            steals: entry.steals ?? undefined,
            blocks: entry.blocks ?? undefined,
            fouls: entry.fouls ?? undefined,
            minutes: entry.minutes ?? undefined,
            isStarter: entry.isStarter ?? undefined,
            // NEVER overwrite: timeOnCourtSeconds, enteredAt, isOnCourt, lineupPosition, plusMinus
          },
          create: {
            gameId,
            playerId: entry.playerId,
            teamId: entry.teamId,
            points: entry.points ?? 0,
            rebounds: entry.rebounds ?? 0,
            assists: entry.assists ?? 0,
            steals: entry.steals ?? 0,
            blocks: entry.blocks ?? 0,
            fouls: entry.fouls ?? 0,
            minutes: entry.minutes ?? 0,
            isStarter: entry.isStarter ?? false,
            // Default values for new records
            timeOnCourtSeconds: 0,
            enteredAt: null,
            isOnCourt: entry.isStarter ?? false,
            lineupPosition: (entry.isStarter ?? false) ? 1 : 0,
          },
        })
      )
    );

    return NextResponse.json({
      success: true,
      count: results.length,
      message: `Updated ${results.length} box score entries`,
    });
  } catch (error) {
    console.error("BoxScore upsert error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 }
    );
  }
}
```

---

### CRITICAL-003: Missing idempotency in /api/games/[id]/score

**File:** `app/api/games/[id]/score/route.ts` (lines 35-69)

**Issue:**
```typescript
export async function POST(req: NextRequest, { params }) {
  const { teamId, playerId, points } = req.json();
  
  // ❌ NO IDEMPOTENCY CHECK
  // If user double-clicks button:
  //   Request A: POST score +2
  //   Request B: POST score +2 (accidental double-click)
  
  // Both requests create GameEvent
  // Both requests increment Game.homeScore
  // Result: +4 instead of +2
  
  await prisma.game.update({
    where: { id: gameId },
    data: isHome ? { homeScore: { increment: points } } : { awayScore: { increment: points } }
  });
  
  await prisma.gameEvent.create({
    data: { gameId, teamId, playerId, type: "POINTS", points, quarter: game.quarter }
    // ❌ No idempotencyKey field
  });
}
```

**Attack Vector:**
```
User clicks "+3" button
  ↓
UI shows loading state
  ↓
Network lag: Request takes 2 seconds to complete
  ↓
User: "Why didn't it work?" → Clicks again
  ↓
Server receives TWO requests:
  Request A (T1): gameId=5, playerId=12, points=3
  Request B (T2): gameId=5, playerId=12, points=3
  ↓
Result: homeScore += 6 (not 3)
```

**Impact:**
- Score inflated by multiple-clicks
- Game result invalid
- Leaderboards corrupted

**Probability:** HIGH (common user behavior, network delays)

**Recommended Fix:**

```typescript
import crypto from "crypto";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gameId = parseInt(id);
  const body = await req.json();

  // Generate idempotency key on server (recommended)
  // OR accept from client (less secure)
  const idempotencyKey = body.idempotencyKey || `${gameId}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

  const parsed = scoreSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { teamId, playerId, points } = parsed.data;

  const game = await prisma.game.findUnique({ where: { id: gameId } });
  if (!game || game.status !== "LIVE") {
    return NextResponse.json({ error: "Game not live" }, { status: 400 });
  }

  const isHome = game.homeTeamId === teamId;

  const result = await prisma.$transaction(async (tx) => {
    // Check idempotency: if request already processed, return cached result
    const existingEvent = await tx.gameEvent.findFirst({
      where: { idempotencyKey },
    });

    if (existingEvent) {
      // Already processed, return the same result
      return {
        success: true,
        isDuplicate: true,
        homeScore: existingEvent.playerId === 0 ? game.homeScore : game.homeScore,
        awayScore: game.awayScore,
      };
    }

    // Create event with idempotency key
    const event = await tx.gameEvent.create({
      data: {
        gameId,
        teamId,
        playerId,
        type: "POINTS",
        points,
        quarter: game.quarter,
        idempotencyKey,
      },
    });

    // Update game score
    await tx.game.update({
      where: { id: gameId },
      data: isHome
        ? { homeScore: { increment: points } }
        : { awayScore: { increment: points } },
    });

    return { success: true, isDuplicate: false };
  });

  const updated = await prisma.game.findUnique({
    where: { id: gameId },
    select: { homeScore: true, awayScore: true },
  });

  return NextResponse.json({ ...result, ...updated });
}
```

---

## II. HIGH RISKS (🟡 Severity: Data Quality Issues)

### HIGH-001: N+1 Query in recordGameAction

**File:** `app/actions/game-events.ts` (lines 491-501)

**Issue:**
```typescript
case "POINTS":
  const points = actionPayload.points || 0;
  const player = await tx.player.findUnique({ where: { id: playerId || 0 } });
  //              ↑ QUERY 1: Load player to get teamId

  if (player) {
    const game = await tx.game.findUnique({ where: { id: gameId } });
    //           ↑ QUERY 2: Reload game (already have in context)
    
    if (game) {
      if (player.teamId === game.homeTeamId) {
        gameUpdates.homeScore = (game.homeScore || 0) + points;
      }
    }
  }
```

**Impact:**
- For 10 score actions: 20 DB queries (should be ~5)
- 4x overhead during fast-paced game
- Slower response time, higher latency

**Recommended Fix:**
```typescript
// Already have game in transaction context
// Already loaded playerId
// Fetch player efficiently:
case "POINTS":
  const points = actionPayload.points || 0;
  
  // Get player teamId without separate query
  const playerTeam = await tx.player.findUnique({
    where: { id: playerId || 0 },
    select: { teamId: true }, // Only fetch what we need
  });

  if (playerTeam && game) {
    if (playerTeam.teamId === game.homeTeamId) {
      gameUpdates.homeScore = (game.homeScore || 0) + points;
    } else {
      gameUpdates.awayScore = (game.awayScore || 0) + points;
    }
  }
```

---

### HIGH-002: Score Verification Silent Failure

**File:** `app/actions/game-events.ts` (lines 200-204)

**Issue:**
```typescript
if (homePoints !== game.homeScore || awayPoints !== game.awayScore) {
  console.error(
    `[END_GAME] Score consistency check failed: ` +
    `homeScore=${game.homeScore} but sum=${homePoints}, ` +
    `awayScore=${game.awayScore} but sum=${awayPoints}`
  );
  // ❌ NO CORRECTION - Game completes anyway
  // ❌ Corruption goes unnoticed in production (console logs not monitored)
}
```

**Impact:**
- Final scores may be wrong
- Tournament standings invalid
- No recovery mechanism

**Recommended Fix:**
```typescript
// Option A: Halt and alert (strict)
if (homePoints !== game.homeScore || awayPoints !== game.awayScore) {
  throw new Error(
    `[END_GAME] FATAL: Score mismatch detected. ` +
    `Cannot complete game. homeScore=${game.homeScore} but sum=${homePoints}`
  );
}

// Option B: Auto-correct (lenient)
if (homePoints !== game.homeScore) {
  console.warn(`[END_GAME] Correcting homeScore: ${game.homeScore} → ${homePoints}`);
  gameUpdates.homeScore = homePoints;
}
```

---

### HIGH-003: Backup File Tracked in Git

**File:** `./components/live-tracker/LiveScoreTracker.tsx.backup`

**Issue:**
- 51KB backup file in repository
- Doubles component size in git history
- Confuses developers (which file is current?)
- Should use git history, not backups

**Impact:**
- Slower clones
- Confusion in code reviews
- Violates git best practices

---

### HIGH-004: Missing Error Handling in Async Operations

**File:** Multiple (`game-events.ts`, `actions/game.ts`)

**Issue:**
```typescript
// Line 279-281: Achievements processed but errors ignored
try {
  // ... achievement checks ...
} catch (err) {
  console.error("[END_GAME] Achievement processing error:", err);
  // Game continues even if achievements fail
}
```

**Better Practice:**
```typescript
try {
  const newBadges = checkNewAchievements(...);
  for (const badgeId of newBadges) {
    await tx.playerAchievement.upsert({...});
  }
} catch (err) {
  // Log but don't fail game completion
  // Achievements are non-critical
  console.error("[END_GAME] Achievement processing error (non-blocking):", err);
  // Achievements can be recomputed later
}
```

**Status:** ✅ Already has try-catch, good pattern

---

## III. MEDIUM RISKS (🟠 Severity: Should Monitor)

| Risk ID | Issue | File | Fix Priority |
|---------|-------|------|---|
| **MED-001** | Stale GameSubstitution unused (audit trail only) | schema.prisma | Monitor |
| **MED-002** | Protocol overrides not validated | GameProtocol.tsx | Validate |
| **MED-003** | Legacy event types mixed with FIBA types | game-events.ts | Unify |
| **MED-004** | No rate limiting on API endpoints | /api/games/[id]/* | Add limits |
| **MED-005** | revalidatePath called after transaction | game-events.ts:538 | Monitor |

---

## IV. LOW RISKS (🟢 Severity: Nice to Have)

| Risk ID | Issue | File | Fix Priority |
|---------|-------|------|---|
| **LOW-001** | Duplicate code: formatTime functions | game-events.ts, game/[id]/page.tsx | Refactor |
| **LOW-002** | Test routes exposed in production | /api/test-* | Remove |
| **LOW-003** | Comments with Russian text (internationalization concern) | Multiple | Monitor |
| **LOW-004** | Missing JSDoc on exported functions | Multiple | Document |
| **LOW-005** | Unused imports (linter should catch) | Various | Cleanup |

---

## V. RISK MATRIX

```
        ┌────────────────────────────────────────┐
        │     PROBABILITY OF OCCURRENCE          │
        │  High   │  Medium  │  Low             │
    ┌───┼────────────────────────────────────────┤
H   │   │ CRIT-001 │ CRIT-002 │ HIGH-003 │
I   │   │ Race     │ Delete   │ Backup   │
G   │   │ Condition│ Boxscore │ File     │
H   ├───┼──────────┼──────────┼──────────┤
    │   │ CRIT-003 │ HIGH-001 │ MED-001  │
I   │   │ Idempote │ N+1      │ Stale    │
M   │   │ ncy      │ Query    │ Subs     │
P   ├───┼──────────┼──────────┼──────────┤
A   │   │ HIGH-002 │ MED-002  │ LOW-001  │
C   │   │ Silent   │ Validate │ Duplica  │
T   │   │ Fail     │ Protocol │ te Code  │
    └───┴──────────┴──────────┴──────────┘
```

---

## VI. SEVERITY SCORING

| ID | Risk | Severity | Probability | Impact | Score | Action |
|---|---|---|---|---|---|---|
| CRIT-001 | Race condition (stat) | 10 | High | Data loss | 95 | 🔴 FIX NOW |
| CRIT-002 | Delete boxscore | 10 | Medium | Data loss | 85 | 🔴 FIX NOW |
| CRIT-003 | Idempotency | 10 | High | Score inflation | 95 | 🔴 FIX NOW |
| HIGH-001 | N+1 query | 6 | Medium | Perf | 40 | 🟡 SCHEDULE |
| HIGH-002 | Silent fail | 8 | Low | Data integrity | 60 | 🟡 SOON |
| HIGH-003 | Backup file | 3 | High | Git bloat | 25 | 🟡 SOON |
| HIGH-004 | Error handling | 2 | Low | Resilience | 15 | 🟢 MONITOR |

---

## VII. FIX PRIORITY QUEUE

```
IMMEDIATE (This Sprint):
[1] CRIT-001: Transaction wrap in /api/admin/games/[id]/stat
[2] CRIT-002: Replace deleteMany with upsert in /api/admin/games/[id]/boxscore
[3] CRIT-003: Add idempotency to /api/games/[id]/score

SOON (Next Sprint):
[4] HIGH-001: Optimize N+1 query in recordGameAction
[5] HIGH-002: Fix silent score verification failure
[6] HIGH-003: Remove backup files

LATER (Future):
[7] HIGH-004: Already good, monitor only
[8] MED-***: Code quality improvements
[9] LOW-***: Technical debt cleanup
```

---

**End of Report 4**

Next: See DIAGNOSTIC_REPORT_5_CLEAN_ARCHITECTURE.md
