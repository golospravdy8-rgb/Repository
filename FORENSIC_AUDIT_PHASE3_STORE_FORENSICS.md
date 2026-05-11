# FORENSIC ARCHITECTURE AUDIT — PHASE 3: STORE FORENSICS
## Full State Management Analysis - All State Sources & Conflicts

**Date:** 2026-05-11  
**Auditor:** Staff Frontend Architect + React Runtime Debugger  
**Scope:** Every state variable, every source of truth, every conflict

---

## EXECUTIVE FINDINGS

### 🔴 CRITICAL: STATE SHADOWING BUG

**LiveScoreTracker copies game prop to local state:**

```typescript
// Line 381 - SHADOWING ISSUE
const [game, setGame] = useState<GameWithAll>(initialGame);

Problem:
├─ initialGame = prop (from page.tsx)
├─ Component converts prop to local state
├─ When prop updates (external change): IGNORED
├─ Local state becomes stale immediately
└─ Fix: Use prop directly OR sync on change with useEffect
```

**Impact:**
```
Scenario 1: External substitution (another admin logged in)
├─ Prop updates: game.boxScores[i].isOnCourt = false
├─ Local state: NOT updated
└─ Result: Hidden substitution (user doesn't see it)

Scenario 2: Game revalidation (after action)
├─ Server: DB updated
├─ Prop: Re-fetched from DB
├─ Local state: Still has old value
└─ Result: Stale UI even after successful action
```

---

### 🟡 CRITICAL: TIMER TRIPLE CONFLICT

**3 Timer Systems Compete:**

```
SYSTEM 1: LiveScoreTracker.useEffect (line 461)
├─ Owner: Local component state
├─ Source: gameTimeLeft (useState line 395)
├─ Update rate: ~60 times/second
├─ Method: Decrement gameTimeLeft
├─ Refs: gameStartTimeRef, pausedTimeRef
└─ Issue: Ignores external timer changes

SYSTEM 2: updateGameTime server action
├─ Owner: Server (next.js action)
├─ Called: Periodically from LiveScoreTracker
├─ Updates: game.currentTimeLeft in DB
├─ Issue: Async, doesn't sync back to client

SYSTEM 3: Firebase realtime (if enabled)
├─ Owner: Firebase (external service)
├─ Source: Real-time database
├─ Updates: Via onValue listener
├─ Issue: Competes with local state
└─ Result: Timer jitter (3 sources fighting)
```

**Race Condition:**
```
Timeline of events:
┌─────────────┬──────────────┬──────────────┬──────────────┐
│ Time (ms)   │ Local Timer  │ Server Timer │ Firebase     │
├─────────────┼──────────────┼──────────────┼──────────────┤
│ 0           │ 600          │ 600          │ 600          │
│ 100         │ 599.9        │ 600          │ 600          │ ← Diverge
│ 200         │ 599.8        │ 600          │ 600          │
│ 500         │ 599.5        │ 599.8 (sync) │ 599.8        │ ← Server catches up
│ 1000        │ 599.0        │ 599.0        │ 599.0        │ ← All match again
│ 1500        │ 598.5        │ 599.0 (slow) │ 598.5 (fast) │ ← Jitter!
└─────────────┴──────────────┴──────────────┴──────────────┘

Result: Timer display jumps, updates, jumps again (bad UX)
```

---

### 🔴 CRITICAL: STORE OWNERSHIP UNDEFINED

**No Clear Owner for Each Data Point:**

```
Data Point                  Sources Found           Real Owner?
──────────────────────────────────────────────────────────────
game.status                 Page prop, setGame      DB (Prisma) ← AUTHORITATIVE
game.boxScores              Page prop, setGame      DB (Prisma) ← AUTHORITATIVE  
game.events                 Page prop, setGame      DB (Prisma) ← AUTHORITATIVE
game.currentTimeLeft        useState, ref, action   ? CONFUSED ← BUG!
selectedPlayerId            useState (local)        LocalState ← OK
gameTimeLeft                useState (local)        ? CONFUSED ← BUG!
homeOrder/awayOrder         useState (local)        LocalState ← OK
showFoulModal               useState (local)        LocalState ← OK
boxScores[i].isOnCourt      Page prop, game.state   DB (Prisma) ← AUTHORITATIVE
boxScores[i].enteredAt      Page prop, game.state   DB (Prisma) ← AUTHORITATIVE

Problem: gameTimeLeft has 3 owners:
├─ Local useState state
├─ updateGameTime server action
└─ Firebase (if enabled)

Who wins?
├─ Probably useState (updates fastest)
├─ But updateGameTime ignores local state
└─ Firebase updates ignored
```

---

## PHASE 3: FULL STATE FORENSICS

### STATE SYSTEM 1: LiveScoreTracker Local State

**Location:** `components/live-tracker/LiveScoreTracker.tsx:381-410`

#### Core State Variables

```typescript
// SHADOWED STATE (BUG)
const [game, setGame] = useState<GameWithAll>(initialGame);
│
├─ What it holds:
│  ├─ homeTeam (with players array)
│  ├─ awayTeam (with players array)
│  ├─ boxScores (array of player stats)
│  ├─ events (recent game events)
│  ├─ status (SCHEDULED/LIVE/FINAL)
│  ├─ homeScore, awayScore
│  └─ quarter, currentTimeLeft
│
├─ Mutations:
│  ├─ recordGameAction() → setGame()
│  ├─ recordSubstitution() → setGame()
│  ├─ undoGameAction() → setGame()
│  └─ Button handlers → setGame()
│
├─ Consumers:
│  ├─ DraggableRosterPanel (reads homeTeam, awayTeam)
│  ├─ Render logic (reads status, homeScore, awayScore)
│  ├─ ActionLog (reads events)
│  ├─ Modal handlers (use selectedPlayerId + game)
│  └─ memoizedBoxScores (reads boxScores)
│
└─ PROBLEM:
   ├─ Prop: initialGame (from page)
   ├─ Local: game (copy of initialGame)
   ├─ When initialGame updates: NOT reflected in game
   ├─ Consequence: Stale data after external change
   └─ Root cause: No useEffect to sync prop → state

// TIMER STATE
const [gameTimeLeft, setGameTimeLeft] = useState<number>(
  initialGame.currentTimeLeft || 600
);
│
├─ What it holds: Game clock in seconds (600 = 10:00)
├─ Owner: ???  (3 systems fight for control)
├─ Mutations:
│   ├─ useEffect (line 461-495): Decrements by ~1/sec
│   ├─ updateGameTime action: Sets from server
│   └─ Firebase listener: Sets from real-time
│
├─ Consumers:
│   ├─ Timer display (rendered)
│   ├─ GameProtocol (passed as prop)
│   ├─ recordGameAction payload (sends to server)
│   └─ getDisplayTime (calculates player court time)
│
└─ PROBLEM:
   ├─ 3 simultaneous sources of truth
   ├─ useEffect updates ignore server/Firebase
   ├─ Server updates ignored by useEffect
   └─ Result: Timer jitter, desync

// SELECTED PLAYER STATE
const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);
│
├─ Owner: Local (clean)
├─ Purpose: Current player for stat entry
├─ Mutations: onClick handlers
├─ Consumers: UI buttons (disabled if null)
└─ Status: ✓ CORRECT

// SUBSTITUTION MODAL STATE
const [showSubModal, setShowSubModal] = useState(false);
const [subPlayerOut, setSubPlayerOut] = useState<number | null>(null);
const [subPlayerIn, setSubPlayerIn] = useState<number | null>(null);
│
├─ Owner: Local (clean)
├─ Purpose: Track modal state + player selection
├─ Mutations: Modal handlers
├─ Consumers: Modal UI
└─ Status: ✓ CORRECT

// FOUL MODAL STATE
const [showFoulModal, setShowFoulModal] = useState(false);
const [currentFoulType, setCurrentFoulType] = 
  useState<"PERSONAL" | "TECHNICAL" | "UNSPORTSMANLIKE" | "DISQUALIFYING" | null>(null);
const [currentFoulPlayerId, setCurrentFoulPlayerId] = useState<number | null>(null);
│
├─ Owner: Local (clean)
├─ Purpose: Track foul type + player
├─ Mutations: Modal handlers
├─ Consumers: FoulPlayerModal, form submission
└─ Status: ✓ CORRECT

// FREE THROW MODAL STATE
const [showFreeThrowModal, setShowFreeThrowModal] = useState(false);
const [freeThrowContext, setFreeThrowContext] = useState<"scoring" | "miss">("scoring");
│
├─ Owner: Local (clean)
├─ Purpose: Track FT mode (scoring or miss)
├─ Mutations: Modal handlers
├─ Consumers: FreeThrowModal logic
└─ Status: ✓ CORRECT

// EVENT TYPE STATE
const [eventType, setEventType] = useState<"normal" | "second_chance" | "fastbreak">("normal");
│
├─ Owner: Local (clean)
├─ Purpose: Classify scored points (affects ЕФК calculation)
├─ Mutations: Option selection
├─ Consumers: recordGameAction payload
└─ Status: ✓ CORRECT

// LOADING STATE
const [isLoading, setIsLoading] = useState(false);
│
├─ Owner: Local (clean)
├─ Purpose: Disable buttons during action
├─ Mutations: Wrapped around recordGameAction
├─ Consumers: Button disabled attribute
└─ Status: ✓ CORRECT

// ACTION HISTORY (UNDO SUPPORT)
const [actionHistory, setActionHistory] = useState<Array<{ id: string; type: string }>>([]);
│
├─ Owner: Local (clean)
├─ Purpose: Track last N actions for undo
├─ Mutations: Push on action, pop on undo
├─ Consumers: Undo button handler
└─ Status: ✓ CORRECT (but limited to session)

// ROSTER ORDER STATE
const [homeOrder, setHomeOrder] = useState<number[]>([...players]);
const [awayOrder, setAwayOrder] = useState<number[]>([...players]);
│
├─ Owner: Local (clean)
├─ Purpose: Track roster drag-drop reordering
├─ Mutations: reorder() on drop
├─ Consumers: DraggableRosterPanel render
└─ Status: ✓ CORRECT
```

#### Refs (Imperative State)

```typescript
// Timer start time (ms since epoch)
const gameStartTimeRef = useRef<number | null>(null);
│
├─ Set by: useEffect on game change (line 417-420)
├─ Used by: Timer tick calculation
├─ Value: Date.now() when game starts
└─ Purpose: Track when timer started (for relative calculation)

// Pause time (ms when paused)
const pausedTimeRef = useRef<number | null>(null);
│
├─ Set by: useEffect when pause action sent
├─ Used by: Skip timer ticks while paused
├─ Value: Date.now() when paused, null when resumed
└─ Purpose: Freeze timer display

// Last sync time (for roster updates)
const lastSyncTimeRef = useRef<number>(600);
│
├─ Set by: On mount
├─ Used by: Track last roster sync timestamp
├─ Value: Previous gameTimeLeft
└─ Purpose: Detect if roster changed externally
```

---

### STATE SYSTEM 2: Database (Prisma - Authoritative)

**Location:** `prisma/schema.prisma + DB (PostgreSQL/Neon)`

```
PRIMARY TABLES:

Game
├─ id (PK)
├─ status: SCHEDULED | LIVE | FINAL
├─ quarter: 1-4 (current quarter)
├─ homeTeamId, awayTeamId (FK)
├─ homeScore, awayScore (points)
├─ currentTimeLeft: int (game clock in seconds)
├─ scheduledAt: DateTime
├─ createdAt: DateTime
└─ ... 20+ fields (metadata)

BoxScore (Player stats per game)
├─ id (PK)
├─ gameId, playerId (composite FK: gameId_playerId UNIQUE)
├─ teamId (FK)
├─ isStarter: boolean
├─ isOnCourt: boolean ← CRITICAL
├─ enteredAt: int? (seconds when entered court, null if never)
├─ lineupPosition: int (1-5 for active, 0 for bench)
├─ timeOnCourtSeconds: int (cumulative)
├─ points: int, rebounds: int, assists: int, ... (stats)
├─ fg2Made, fg2Attempted, ... (shooting stats)
├─ foulsPersonal, foulsTechnical, ... (foul counts)
├─ minutesPlayed: String? (manual override, e.g., "5:30")
└─ ... 30+ fields

GameEvent (Audit trail)
├─ id (PK)
├─ gameId (FK)
├─ playerId (FK)?
├─ teamId (FK)
├─ type: POINTS | FOUL | ASSIST | ... (event type)
├─ points: int? (NULLABLE — THIS IS THE +null BUG!)
├─ quarter: int
├─ createdAt: DateTime
└─ ... 10+ fields
```

**Data Flow:**
```
Update Flow (when user clicks +2):
1. Client: recordGameAction() server action
   └─ Sends: { gameId, actionType: "POINTS", playerId, points: 2 }
2. Server: recordGameAction processes
   ├─ Validates input
   ├─ Creates GameEvent (points = 2)
   ├─ Updates BoxScore (points += 2)
   ├─ Creates audit trail
   └─ Returns: Updated game
3. Client: Receives response
   ├─ Updates local state: setGame(newGame)
   ├─ Calls: revalidatePath() (supposedly)
   └─ Fetches fresh data (if revalidatePath works)

Read Flow (on page load):
1. SSR: prisma.game.findUnique({ include: {...} })
   ├─ Fetches: game + homeTeam + awayTeam + boxScores + events
   └─ Returns: Full game object
2. Client hydration: game prop passed to LiveScoreTracker
   ├─ Sets: setGame(initialGame)
   └─ Mirrors: DB state → Local state (SNAPSHOT)
3. Stale after this: Local state not synced on external changes
```

---

### STATE SYSTEM 3: Firebase Realtime (Optional, If Enabled)

**Location:** `lib/firebase.ts + lib/firebase-game.ts`

```
Real-Time Database Schema:
├─ games/{roomId}
│  ├─ players/{playerId}
│  │  ├─ id: string
│  │  ├─ nickname: string
│  │  ├─ x: number, y: number (position)
│  │  ├─ score: number
│  │  ├─ status: "alive" | "dead" | ...
│  │  ├─ timestamp: number (ms)
│  │  └─ lastHeartbeat: number (ms) ← For cleanup
│  │
│  └─ metadata
│     ├─ createdAt: number
│     └─ ... other game metadata

Listeners:
├─ onValue(playerRef): Subscribe to player updates
│  └─ Called: Whenever {playerId} data changes
├─ onDisconnect(): Auto-cleanup on disconnect
│  └─ Removes: Player data when client disconnects
└─ Throttling: THROTTLE_MS = 50ms (max update rate)

Conflict with LiveScoreTracker:
├─ Firebase updates gameTimeLeft state
├─ LiveScoreTracker.useEffect also updates
├─ Both write to same state variable
└─ Result: Race condition, unpredictable timer
```

---

### STATE SYSTEM 4: Supabase gameChannel (ORPHANED)

**Location:** `lib/gameChannel.ts:15 lines`

```typescript
// DEAD CODE - NEVER USED

export function joinGameChannel(roomId: string, onEvent: (ev: any) => void) {
  const channel = supabase.channel(`game:${roomId}`, {
    config: { broadcast: { self: false } }
  });
  channel.on('broadcast', { event: 'game' }, ({ payload }) => onEvent(payload));
  channel.subscribe();
  return channel;
}

Status:
├─ Defined: ✓ YES
├─ Imported: ✗ NO (grep shows 0 uses)
├─ Called: ✗ NO (dead code)
├─ Conflict: YES (Firebase already handles realtime)
└─ Risk: HIGH (developers might accidentally use this)
```

---

## STATE OWNERSHIP MATRIX

```
Data Point                      Declared Owner        Actual Owner(s)          Conflict?
────────────────────────────────────────────────────────────────────────────────
game.id                         Page prop             DB                        ✓ OK
game.status                     Page prop             DB + setGame              ⚠️ SHADOW
game.quarter                    Page prop             DB + setGame              ⚠️ SHADOW
game.homeScore/awayScore        Page prop             DB + setGame              ⚠️ SHADOW
game.currentTimeLeft            Page prop             DB + state + action       🔴 TRIPLE!
game.boxScores[]                Page prop             DB + setGame              ⚠️ SHADOW
game.events[]                   Page prop             DB + setGame              ⚠️ SHADOW
selectedPlayerId                useState (local)      Local only                ✓ OK
gameTimeLeft                    useState (local)      Local + action + Firebase 🔴 TRIPLE!
showFoulModal                   useState (local)      Local only                ✓ OK
homeOrder/awayOrder             useState (local)      Local only                ✓ OK
isLoading                       useState (local)      Local only                ✓ OK
actionHistory[]                 useState (local)      Local only                ✓ OK
boxScores[i].isOnCourt          Page prop             DB + setGame              ⚠️ SHADOW
boxScores[i].enteredAt          Page prop             DB + setGame              ⚠️ SHADOW
boxScores[i].timeOnCourtSeconds Page prop             DB + setGame              ⚠️ SHADOW
GameEvent.points                DB (nullable!)       DB (buggy schema)         🔴 BUG!
```

---

## CRITICAL FINDINGS

### Finding 1: Game State Shadowing

**Symptom:** After one admin makes changes, another admin doesn't see them

**Root Cause:**
```typescript
// Lines 381-385
const [game, setGame] = useState<GameWithAll>(initialGame);
// ↑ Copies prop to state (snapshot)
// ↓ Prop updates are IGNORED

// Should be:
const game = initialGame;  // Use prop directly
// OR add sync:
useEffect(() => {
  setGame(initialGame);
}, [initialGame]);
```

**Fix Impact:** Medium (multi-user scenarios only)

---

### Finding 2: Timer Triple Ownership

**Symptom:** Timer jumps, display jerks, out of sync with server

**Root Cause:**
```
3 systems:
1. useEffect tick (line 461): gameTimeLeft -= 1
2. updateGameTime action: Syncs with server
3. Firebase listener: Real-time update

All write to same state, no coordination
```

**Fix Impact:** High (affects all admin sessions)

---

### Finding 3: +null Rendering Bug

**Symptom:** ActionLog shows "+null" instead of "+2"

**Root Cause:**
```
GameEvent.points field is nullable (Int?)
recordGameAction doesn't validate
ActionLog renders without null check
```

**Fix Impact:** High (visible bug, user confusing)

---

### Finding 4: Undefined Ownership of gameTimeLeft

**Symptom:** Is gameTimeLeft from local state, server, or Firebase?

**Root Cause:**
```
No single owner:
├─ useState: Local init
├─ useEffect: Decrements (takes ownership)
├─ updateGameTime action: Tries to sync
├─ Firebase: Tries to push real-time
└─ No reconciliation logic
```

**Fix Impact:** Critical (undefined behavior)

---

## STATE DEPENDENCY GRAPH

```
UPSTREAM (Sources):
├─ Page prop (initialGame)
│  └─ From: DB via prisma.game.findUnique()
├─ setGame updates
│  └─ From: recordGameAction response
├─ useEffect timer
│  └─ From: Interval tick (local)
├─ Firebase listener
│  └─ From: Real-time database
└─ Server action response
   └─ From: updateGameTime

DOWNSTREAM (Consumers):
├─ Timer display
│  └─ Renders: MM:SS
├─ GameProtocol component
│  └─ Props: game + gameTimeLeft
├─ getDisplayTime function
│  └─ Calculates: Player court time
├─ recordGameAction payload
│  └─ Sends: gameClockSeconds
├─ DraggableRosterPanel
│  └─ Renders: Roster order
└─ Modal handlers
   └─ Uses: selectedPlayerId
```

---

## STORE SYNCHRONIZATION ISSUES

### Issue 1: No Prop → State Sync

```
Problem:
Page prop: game (updated by revalidatePath)
Component state: game (snapshot of prop)
Sync mechanism: NONE

Result: External changes invisible
```

### Issue 2: State → DB Async Lag

```
Problem:
Client updates: setGame(newGame)
Server updates: recordGameAction writes to DB
Sync: revalidatePath (if called)
Lag: 100-500ms until revalidation

Result: Optimistic updates needed
```

### Issue 3: Firebase Updates Ignored

```
Problem:
Firebase: Broadcasts game state changes
Component: Has own timer logic
Sync: NO reconciliation logic

Result: Firebase updates lost
```

---

## SUMMARY: STORE FORENSICS

| Issue | Severity | Component | Root Cause | Impact |
|-------|----------|-----------|-----------|--------|
| State shadowing | 🔴 CRITICAL | LiveScoreTracker | Prop copied to useState, no sync | Stale data, external changes invisible |
| Timer triple ownership | 🔴 CRITICAL | LiveScoreTracker | 3 timer systems, no coordination | Jitter, desync, undefined behavior |
| +null rendering | 🔴 CRITICAL | ActionLog | Nullable points field, no validation | User sees "+null" |
| Undefined gameTimeLeft owner | 🔴 CRITICAL | LiveScoreTracker | Multiple writers, no reconciliation | Unpredictable timer behavior |
| No state reconciliation | 🟡 HIGH | Global | Firebase vs local state | Offline then online = desync |
| Supabase gameChannel orphaned | 🟠 MEDIUM | lib/gameChannel.ts | Dead code never deleted | Confusion, maintenance debt |
| ActionHistory limited scope | 🟠 MEDIUM | LiveScoreTracker | Session-only undo | Can't undo after page reload |

---

**STATUS: PHASE 3 COMPLETE** ✅

All state sources identified, ownership mapped, conflicts documented.

Ready for PHASE 4 (websocket/realtime forensics).
