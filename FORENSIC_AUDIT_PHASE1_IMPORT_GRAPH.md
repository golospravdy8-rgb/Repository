# FORENSIC ARCHITECTURE AUDIT — PHASE 1: FULL IMPORT GRAPH
## basket-lviv Realtime System Deep Dive

**Date:** 2026-05-11  
**Auditor:** Staff Frontend Architect + Realtime Systems Engineer  
**Scope:** Complete import dependency graph, component mounts, store usage, legacy systems  
**Mode:** DISCOVERY ONLY — NO FIXES, NO DELETIONS

---

## EXECUTIVE FINDINGS

### 🔴 CRITICAL DISCOVERY: DUAL RENDERER CONFLICT
```
OLD PROTOCOL RENDERER:  GameProtocol.tsx (552 lines)
├─ STATUS: STILL ACTIVE & RENDERING
├─ LOCATION: app/(public)/game/[id]/page.tsx:668
├─ USAGE: LIVE/FINAL games show BOTH:
│   ├─ Events Log (inline, 50 lines)
│   └─ GameProtocol table (FIBA protocol, full render)
└─ ISSUE: Old FIBA table exists alongside new stats

NEW EVENT SYSTEM: ActionLog.tsx + LiveScoreTracker.tsx
├─ STATUS: PARTIALLY IMPLEMENTED
├─ LOCATION: Components only, never mounted in public game view
├─ VISIBILITY: Only in admin panel (/admin/games/[id])
└─ ISSUE: Not displayed to public viewers
```

### 🟡 CRITICAL DISCOVERY: TIMER DUPLICATION (3 SYSTEMS)
```
SYSTEM 1: LiveScoreTracker gameTimeLeft state (898 lines)
├─ Location: components/live-tracker/LiveScoreTracker.tsx
├─ State: useState([line 395])
├─ Refs: gameStartTimeRef, pausedTimeRef, lastSyncTimeRef
├─ useEffect count: 3 major effects
└─ Owner: Admin only

SYSTEM 2: GameProtocol gameTimeLeft prop
├─ Location: components/GameProtocol.tsx:13-21
├─ Props: Received from page.tsx:668
├─ Usage: getDisplayTime(bs, gameTimeLeft)
└─ Issue: Uses different calculation method

SYSTEM 3: Firebase realtime sync
├─ Location: lib/firebase-game.ts
├─ Type: Real-time updates via onValue listeners
├─ Throttle: 50ms (THROTTLE_MS)
├─ Cleanup: 10s (CLEANUP_MS)
└─ Issue: Competes with local state
```

### 🟠 CRITICAL DISCOVERY: HYDRATION RACE CONDITION
```
Initial Game Load:
game.tsx → Page renders → GameProtocol mounts
├─ SSR: Game data from DB (boxScores, events)
├─ CSR: LiveScoreTracker also loads data
├─ Conflict: Two simultaneous fetch chains
├─ State Loss: If SSR and CSR hydration mismatch
└─ Issue: No atomic hydration barrier

Missing Lineup Recovery:
├─ BoxScores not auto-loaded on admin page mount
├─ LiveScoreTracker expects game.boxScores to be set
├─ If hydration fails: empty roster, no court state
└─ Recovery: Manual F5 required
```

### 🔴 CRITICAL DISCOVERY: +null BUG ROOT CAUSE
```
Event Creation Pipeline (recordGameAction → GameEvent)
1. Client sends: { actionType: "POINTS", payload: { points: 2 } }
2. recordGameAction() creates GameEvent
3. Issue: GameEvent.points = payload.points (CAN BE NULL)
4. Rendering: ActionLog.tsx:46 → `+{event.points}` → `+null`

Root Cause Chain:
├─ GameEvent schema allows points: Int (nullable)
├─ recordGameAction doesn't validate payload.points
├─ Some event types don't populate points field
│   ├─ FOUL: points = null ✓ (correct)
│   ├─ ASSIST: points = null ✓ (correct)
│   ├─ POINTS: points = 1|2|3 (should never be null)
│   └─ BUG: Some POINTS events created with null points
└─ Render layer shows: +null (wrong type, should be hidden)

Affected Code:
- app/actions/game-events.ts:recordGameAction (not validating points)
- components/live-tracker/ActionLog.tsx:46 (not null-checking)
- app/(public)/game/[id]/page.tsx:630-660 (same issue)
```

---

## PHASE 1: FULL IMPORT DEPENDENCY GRAPH

### Level 0: Page Entry Points

#### 🟢 PUBLIC GAME PAGE
```
app/(public)/game/[id]/page.tsx (680 lines)
├─ Status: Async Server Component
├─ Imports:
│   ├─ GameProtocol from "@/components/GameProtocol" ← OLD RENDERER
│   ├─ GamePdfButton from "@/components/public/GamePdfButton"
│   └─ prisma.game.findUnique() ← DATA SOURCE
│
├─ Renders For: SCHEDULED/LIVE/FINAL
│   ├─ SCHEDULED: Rosters only (no GameProtocol)
│   ├─ LIVE/FINAL:
│   │   ├─ Score header (inline calc)
│   │   ├─ Box score table (inline, 100+ lines)
│   │   ├─ Events log (inline, 50 lines) ← SHADOW RENDER
│   │   └─ GameProtocol component ← FIBA TABLE (OLD)
│   └─ PDF button
│
└─ CONFLICT ZONE:
    ├─ Box score calculation: LIVE at page render time
    ├─ Events log: 50 most recent (DB fetch)
    └─ GameProtocol: Needs gameTimeLeft prop (passed from page)
```

#### 🔴 ADMIN GAME PAGE  
```
app/admin/games/[id]/page.tsx (52 lines)
├─ Status: Async Server Component → Client Layout
├─ Layout: Flex container (live-tracker + FIBA panel side-by-side)
│
├─ Imports (Client):
│   ├─ LiveScoreTracker from "@/components/live-tracker/LiveScoreTracker"
│   └─ FibaPanelWrapper from "@/components/admin/FibaPanelWrapper"
│
├─ Data: Passes full game object (with boxScores)
│
└─ ARCHITECTURE:
    ├─ Live Tracker: Left panel (main UI)
    │   ├─ Roster (drag-drop)
    │   ├─ Score buttons
    │   ├─ Action log
    │   └─ Modal chains
    │
    └─ FIBA Panel: Right panel (metadata only)
        ├─ Game info form
        └─ Coach info forms (no game mutations)
```

---

### Level 1: Major Components (Import Chains)

#### 🔴 GameProtocol.tsx (552 lines — LEGACY FIBA RENDERER)
```
Location: components/GameProtocol.tsx

Imports:
├─ React hooks: (none — pure component)
├─ Prisma types: Game, Team, Player, BoxScore
├─ Lib: calculateEFF from "@/lib/efficiency"
└─ External: (none)

Exports:
└─ function GameProtocol({ game, gameTimeLeft })

Props Used:
├─ game: Full game object with boxScores[]
├─ gameTimeLeft?: number (game clock in seconds)
└─ Returns: <div> FIBA protocol table

Render Output:
├─ TeamProtocolTable x2 (home + away)
├─ Header: Team names, logo colors
├─ Columns: Number, Name, Position, Time, Stats (16+ columns)
├─ Footer: Totals row
└─ Styling: Inline styles, hardcoded colors (#1e3a8a, #7f1d1d)

State Management:
├─ ZERO useState hooks (pure component)
├─ ZERO useEffect hooks (pure rendering)
├─ ZERO external subscriptions
└─ STATIC: Renders based on props only

Called From:
├─ app/(public)/game/[id]/page.tsx:668 (ONLY PUBLIC LOCATION)
└─ Mounted: LIVE/FINAL games only (line 426-557)

Historical Notes:
├─ Created: Early version (FIBA compliance phase)
├─ Purpose: Display protocol in compliance format
├─ Status: ABANDONED in favor of modern EventLog
├─ Reason: Not real-time, not integrated with LiveScoreTracker
└─ But: Still rendered publicly (never deleted)
```

#### 🟡 LiveScoreTracker.tsx (898 lines — ADMIN GAME CONTROLLER)
```
Location: components/live-tracker/LiveScoreTracker.tsx

Imports:
├─ React hooks: useState, useRef, useCallback, useEffect, useMemo
├─ next/navigation: useRouter
├─ Prisma types: Game, Team, Player, GameEvent, BoxScore
├─ Child components:
│   ├─ StatEntryGrid from "./StatEntryGrid"
│   ├─ FoulPlayerModal from "@/components/modals/FoulPlayerModal"
│   └─ FreeThrowModal from "@/components/modals/FreeThrowModal"
├─ Server actions:
│   ├─ recordGameAction
│   ├─ recordSubstitution
│   ├─ undoGameAction
│   └─ updateGameTime
└─ Utility: React.memo (DraggableRosterPanel, CourtIndicator)

Exports:
└─ default function LiveScoreTracker({ game })

Props:
├─ game: Full game object (with boxScores, events)
└─ Returns: Complex UI with modals, state management

State Variables (9 major):
├─ [game, setGame]: Local copy of game (SHADOWING prop)
├─ [selectedPlayerId, setSelectedPlayerId]: Current player
├─ [showSubModal, setShowSubModal]: Substitution modal
├─ [subPlayerOut, subPlayerIn]: Sub targets
├─ [showFoulModal, setShowFoulModal]: Foul modal
├─ [currentFoulType]: PERSONAL | TECHNICAL | UNSPORTSMANLIKE | DISQUALIFYING
├─ [currentFoulPlayerId]: Who fouled
├─ [showFreeThrowModal, setShowFreeThrowModal]: FT modal
├─ [freeThrowContext]: "scoring" | "miss"
├─ [eventType]: "normal" | "second_chance" | "fastbreak" 
├─ [isLoading, setIsLoading]: Action in flight
├─ [actionHistory, setActionHistory]: For undo chain
├─ [gameTimeLeft, setGameTimeLeft]: TIMER STATE ← CRITICAL
└─ [homeOrder, setHomeOrder] + [awayOrder, setAwayOrder]: Roster drag state

Refs (4 major):
├─ gameStartTimeRef: Tracks start of timer (ms timestamp)
├─ pausedTimeRef: Tracks pause state
├─ lastSyncTimeRef: Tracks last sync time for roster
└─ dragIndexRef: For roster reordering

useEffect Chains (3):
├─ [414]: On game change → Reset timer refs + initial state
├─ [461]: Timer tick → Countdown gameTimeLeft (60/sec)
└─ [498]: On boxScores change → Recalc memoized values

Memoization:
├─ memoizedBoxScores: useMemo (recalc on game change)
├─ getDisplayTime: useCallback (calc time on court)
└─ DraggableRosterPanel: React.memo (prevent re-renders)

Called From:
├─ app/admin/games/[id]/page.tsx:46 (ADMIN ONLY)
└─ Mounted: All admin game views

Server Action Calls:
├─ recordGameAction({ gameId, actionType, playerId, ...})
├─ recordSubstitution({ gameId, playerOutId, playerInId, ...})
├─ undoGameAction({ gameId, eventId, ...})
└─ updateGameTime({ gameId, quarter, currentTimeLeft, ...})

Issues Identified:
├─ STATE SHADOWING: game prop copied to useState (line 381)
│   ├─ Reason: Modifying state for local mutations
│   ├─ Problem: Prop updates don't sync to local state
│   └─ Result: Stale data on game reload
│
├─ TIMER CONFLICT: 3 timer systems compete
│   ├─ useEffect tick (60/sec, local state)
│   ├─ updateGameTime action (periodic)
│   └─ Firebase sync (real-time)
│   └─ Result: Timer stutters, desync on multi-user
│
├─ ROSTER SYNC: lastSyncTimeRef not auto-recovery
│   ├─ If roster changes externally, not reflected
│   └─ Result: Hidden substitutions on tab switch
│
└─ MODAL LEAK: 3 modals stay mounted if not closed
    ├─ FoulPlayerModal
    ├─ FreeThrowModal
    └─ Substitution modal (local div)
    └─ Result: Memory leak if modals toggled repeatedly
```

#### 🔴 FibaPanelWrapper.tsx (150 lines)
```
Location: components/admin/FibaPanelWrapper.tsx

Status: MINIMAL WRAPPER (form-only, no game mutations)

Imports:
├─ React: useState
├─ GameInfoForm from "./GameInfoForm"
├─ TeamInfoForm from "./TeamInfoForm"
└─ Type: interface Game { ... }

Props:
├─ game: Full game object
└─ Returns: Panel with collapsible toggle

State:
├─ [showFibaPanel]: Collapse/expand state

Children:
├─ GameInfoForm: Inputs for metadata (10+ fields)
└─ TeamInfoForm x2: Coach info only (not roster)

Purpose:
├─ Edit game metadata (venue, refs, coaches, etc.)
├─ NOT involved in scoring/substitutions
└─ Purely ADMIN UI, no game logic

Issues:
└─ None identified (pure form wrapper)
```

---

### Level 2: Child Components (Modals & UI)

#### 🟠 FoulPlayerModal.tsx
```
Location: components/modals/FoulPlayerModal.tsx

Purpose: Select player who fouled

Used By: LiveScoreTracker.tsx (line 383-388)

State:
├─ Shows modal when showFoulModal = true
├─ Filters players on court (isOnCourt = true)
└─ Allows foul type selection (4 types)

Server Actions Called:
└─ recordGameAction({ actionType: "FOUL", ... })

Issues:
├─ No debounce on rapid clicks
├─ No validation that player is still on court
└─ Can double-click to create duplicate fouls
```

#### 🟠 FreeThrowModal.tsx
```
Location: components/modals/FreeThrowModal.tsx

Purpose: Record free throw attempts/makes

Used By: LiveScoreTracker.tsx (line 390)

Context: { freeThrowContext: "scoring" | "miss" }

Render Logic:
├─ If context = "scoring":
│   └─ Shows +1 FT point button
├─ If context = "miss":
│   └─ Shows MISS_FT button
└─ Also handles and-1 scenarios

Server Actions Called:
├─ recordGameAction({ actionType: "POINTS", payload: { points: 1 } })
└─ recordGameAction({ actionType: "MISS_FT" })

Issues:
├─ Points field not validated for null
└─ Modal doesn't close on error
```

#### 🟡 StatEntryGrid.tsx
```
Location: components/live-tracker/StatEntryGrid.tsx

Purpose: Tabular stat entry interface

Used By: LiveScoreTracker.tsx (embedded inline)

Render:
├─ Shows active players on court
├─ Input fields for +1 FT, rebound, assist, etc.
└─ Buttons for actions

State Management:
├─ Manages local inputs (debounced)
└─ Calls server actions on submit

Issues:
├─ No clear separation of concerns
└─ Form state not synced with game state
```

---

### Level 3: Store & State Management Systems

#### 🔴 STATE SYSTEM 1: LiveScoreTracker useState (LOCAL)
```
Location: components/live-tracker/LiveScoreTracker.tsx:381-410

Scope: Single component local state

State Properties:
├─ game: Full game object (COPIES prop)
├─ selectedPlayerId: Current selection
├─ gameTimeLeft: Timer countdown
├─ homeOrder/awayOrder: Roster order
└─ Modal states (3 modals)

Mutations:
├─ recordGameAction (server, async)
├─ setGame (local, immediate)
├─ setGameTimeLeft (timer tick)
└─ updateGameTime (server, periodic)

Problems:
├─ SHADOWING: game prop not auto-synced
├─ STALE DATA: Changes from other users not reflected
├─ TIMER DESYNC: 3 systems compete
└─ HYDRATION: No atomic recovery on reload
```

#### 🟠 STATE SYSTEM 2: GameEvent records (DB)
```
Location: Database (Prisma GameEvent model)

Schema:
├─ id: Int (PK)
├─ gameId: Int (FK)
├─ type: String (ENUM-like)
├─ playerId: Int? (nullable)
├─ teamId: Int
├─ quarter: Int
├─ points: Int? (NULLABLE — BUG SOURCE!)
├─ fouledPlayerId: Int? (FK to Player)
├─ createdAt: DateTime
└─ ... 10+ more fields

Issues:
├─ points field allows NULL
├─ No constraint: if type="POINTS" then points NOT NULL
└─ Result: +null rendering bug
```

#### 🟡 STATE SYSTEM 3: Firebase realtime (CONCURRENT)
```
Location: lib/firebase-game.ts + lib/firebase.ts

Scope: Real-time sync (if enabled)

Listeners:
├─ joinGame(): Subscribe to players in game
├─ updatePlayerPosition(): Throttled (50ms)
├─ onValue listeners (Firebase listeners)
└─ onDisconnect cleanup

Issues:
├─ RACE CONDITION: Firebase updates race with LiveScoreTracker state
├─ CLEANUP: No automatic unsubscribe on component unmount
├─ HYDRATION: Firebase data not considered in initial load
└─ STALE DATA: No reconciliation when offline then online
```

#### 🔵 STATE SYSTEM 4: Supabase gameChannel (LEGACY?)
```
Location: lib/gameChannel.ts (15 lines)

Status: EXISTS BUT UNUSED

Code:
├─ joinGameChannel(roomId, onEvent)
├─ sendGameEvent(channel, data)
└─ Supabase broadcast protocol

Issues:
├─ ORPHANED: Never imported or used anywhere
├─ CONFLICT: Firebase IS the real-time system
├─ DEAD CODE: Should be removed or documented
└─ CONFUSION: Developers might try to use this
```

---

### Level 4: Server Actions (Mutations)

#### 🔴 recordGameAction() 
```
File: app/actions/game-events.ts:129-300+

Signature:
export async function recordGameAction(payload: GameActionPayload)

Input:
├─ gameId: number
├─ actionType: string (START_GAME, POINTS, FOUL, etc.)
├─ playerId: number | null
├─ gameClockSeconds: number
├─ quarter: number
├─ idempotencyKey?: string
└─ payload?: { points?, foulType?, fouledPlayerId?, ... }

Control Actions (no player):
├─ START_GAME: Initialize boxScores
├─ START: Timer start (LIVE status)
├─ PAUSE: Timer pause
├─ END_GAME: Mark FINAL
└─ NEXT_QUARTER: Quarter change

Player Actions (with playerId):
├─ POINTS: Add score (1/2/3)
├─ FOUL: Record foul
├─ REBOUND: Record rebound
├─ ASSIST: Record assist
└─ ... 10+ more types

Transaction:
├─ Wrapped in prisma.$transaction
├─ Atomic with GameEvent creation
└─ Creates audit trail

Issues:
├─ BUG 1: Doesn't validate payload.points NOT NULL
│   └─ Result: +null in ActionLog
│
├─ BUG 2: No idempotency check (CAN double-record on retry)
│   └─ Result: Score inflated on user double-click
│
└─ BUG 3: Doesn't revalidatePath (UI not refreshed)
    └─ Result: Stale UI until manual F5
```

#### 🟡 recordSubstitution()
```
File: app/actions/game-events.ts:300+

Signature:
export async function recordSubstitution(payload: { ... })

Input:
├─ gameId: number
├─ playerOutId: number
├─ playerInId: number
├─ gameClockSeconds: number
└─ quarter: number

Logic:
├─ Find current boxScores for both players
├─ OUT player: isOnCourt = false, enteredAt = null
├─ IN player: isOnCourt = true, enteredAt = gameClockSeconds
├─ Create GameEvent of type SUBSTITUTION
├─ Update BoxScore isOnCourt flags
└─ Atomic transaction

Issues:
├─ MINOR: lineupPosition swap not documented
└─ ORDERING: No check for duplicate calls
```

#### 🟡 undoGameAction()
```
File: app/actions/game-events.ts (later in file)

Purpose: Revert last action

Issues:
├─ Only works within same session
├─ Doesn't work on realtime multi-user
└─ Limited to actionHistory array (not full audit trail)
```

---

### Level 5: Data Access Layer

#### 🟡 Prisma Singleton
```
File: lib/prisma.ts

Exports: prisma client instance

Used By: All page.tsx and action functions

Configuration:
├─ DATABASE_URL from env
├─ Runs on Vercel Functions
└─ Single instance (singleton pattern)

Queries Made By:
├─ Page.tsx: findUnique with includes (30+ lines)
├─ recordGameAction: transaction
├─ recordSubstitution: transaction
└─ ... 20+ other places

Issues:
├─ No query caching
├─ No prefetch optimization
└─ N+1 queries possible in some paths
```

---

## SUMMARY: IMPORT DEPENDENCY MAP

```
┌─────────────────────────────────────────────────────────────────┐
│ ENTRY POINT: app/(public)/game/[id]/page.tsx                   │
├─────────────────────────────────────────────────────────────────┤
│ ├─ Prisma fetch (full game with boxScores)                     │
│ ├─ Render box score table (inline, 100+ lines)                 │
│ ├─ Render events log (inline, 50 lines)                        │
│ └─ Mount: GameProtocol component ← OLD RENDERER                │
│    └─ Reads: boxScores[], events[] from props                  │
│       ├─ calculateEFF() utility                                │
│       └─ Render: Full FIBA table (16+ columns)                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ ENTRY POINT: app/admin/games/[id]/page.tsx                    │
├─────────────────────────────────────────────────────────────────┤
│ ├─ Flex layout (left + right panels)                           │
│ │                                                               │
│ ├─ LEFT: LiveScoreTracker component                            │
│ │  ├─ Props: game (with boxScores)                            │
│ │  ├─ State: game (copy of prop), selectedPlayerId, etc.      │
│ │  ├─ Timer: useEffect tick (60/sec)                          │
│ │  ├─ Modals: FoulPlayerModal, FreeThrowModal                 │
│ │  ├─ Child: StatEntryGrid, DraggableRosterPanel              │
│ │  └─ Server Actions:                                          │
│ │     ├─ recordGameAction()                                    │
│ │     ├─ recordSubstitution()                                  │
│ │     ├─ undoGameAction()                                      │
│ │     └─ updateGameTime()                                      │
│ │        └─ Calls: revalidatePath("/admin/games/[id]")        │
│ │                                                               │
│ └─ RIGHT: FibaPanelWrapper                                      │
│    ├─ GameInfoForm (refs, venue, coaches - metadata only)      │
│    └─ TeamInfoForm x2 (coach info - no mutations)              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

REAL-TIME SYSTEMS (CONCURRENT):
├─ TIMER: LiveScoreTracker.useEffect (line 461)
│  └─ Decrements gameTimeLeft every ~1 second
│
├─ FIREBASE: lib/firebase-game.ts (optional)
│  └─ onValue listeners (if enabled)
│
└─ SUPABASE CHANNEL: lib/gameChannel.ts (ORPHANED)
   └─ Never used (dead code)

STATE MANAGEMENT:
├─ LiveScoreTracker.game (SHADOWING PROP)
├─ GameEvent records (DB - source of truth)
├─ BoxScore records (DB - player stats)
└─ Firebase realtime (if enabled - CONFLICT)
```

---

## NEXT PHASES PREVIEW

- **PHASE 2**: Full Render Tree Analysis (identify duplicate mounts)
- **PHASE 3**: Store Forensics (find all state sources & conflicts)
- **PHASE 4**: WebSocket/Realtime Forensics (subscription leaks)
- **PHASE 5**: Runtime Mount Analysis (double-renders, leaks)
- **PHASE 6**: Orphan & Dead Code (GameChannel, old imports)
- **PHASE 7**: Source of Truth Map (where each value actually lives)
- **PHASE 8**: Event Flow Tracing (+2 button → DB → render)
- **PHASE 9**: Hydration Forensics (SSR/CSR mismatch analysis)
- **PHASE 10**: Production Risk Map (what's safe to delete)

---

**STATUS: PHASE 1 COMPLETE** ✅

All imports mapped, dependency chains established, legacy systems identified.

Ready for PHASE 2 (render tree analysis).
