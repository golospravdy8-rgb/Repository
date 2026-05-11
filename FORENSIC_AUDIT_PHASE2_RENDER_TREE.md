# FORENSIC ARCHITECTURE AUDIT — PHASE 2: FULL RENDER TREE ANALYSIS
## Component Mount Chains, Nesting, Condition Rendering

**Date:** 2026-05-11  
**Auditor:** Staff Frontend Architect + React Runtime Debugger  
**Scope:** Every component, every conditional, every dynamic mount

---

## EXECUTIVE FINDINGS

### 🔴 CRITICAL: DUPLICATE PROTOCOL RENDERING

**FINDING 1: Box Score Rendered Twice (Public Game Page)**

```
app/(public)/game/[id]/page.tsx
├─ RENDER 1 (inline): Box Score Table
│  └─ Location: line 425-557 (130+ lines)
│     ├─ Condition: hasBoxScore && homeBox && awayBox
│     ├─ Data: Calculated from events on SSR
│     ├─ Styling: Tailwind (tight layout)
│     ├─ Columns: 22 columns (№, Name, Поз, Хв, Оч, КП, %, 2О, %, 3О, %, ШТ, %, НПД, ЗПД, ПДБ, ПЕР, ВТ, БЛК, ФОЛ, ЕФК, +/-)
│     └─ Memoization: NONE (rebuilds every render)
│
├─ RENDER 2 (GameProtocol): FIBA Protocol Table
│  └─ Location: line 668 (component mount)
│     ├─ Condition: Always mounts (no guard)
│     ├─ Data: Passed props (game, gameTimeLeft)
│     ├─ Styling: Inline styles (#1e3a8a, #7f1d1d)
│     ├─ Columns: 16+ columns (№, Name, Time, Stats)
│     └─ Memoization: None (React.memo not used)
│
└─ ISSUE: 
   ├─ Two different renders of SAME DATA
   ├─ Different styling, different columns
   ├─ Same source of truth (boxScores)
   └─ User sees: Small table + Large table (confusing)
```

**FINDING 2: Event Log Rendered Twice (Public Game Page)**

```
app/(public)/game/[id]/page.tsx
├─ RENDER 1 (inline): Events List
│  └─ Location: line 623-664 (40 lines)
│     ├─ Condition: game.events.length > 0
│     ├─ Data: Latest 50 events from DB
│     ├─ Format: Colored badges + event type
│     ├─ Height: max-h-56 (fixed, scrollable)
│     └─ Labels: "Протокол подій" (Event Protocol)
│
├─ RENDER 2 (ActionLog): Would be in admin
│  └─ Location: components/live-tracker/ActionLog.tsx
│     ├─ Status: COMPONENT EXISTS but never mounted on public page
│     ├─ Mounts Only: app/admin/games/[id] (inside LiveScoreTracker)
│     └─ Never visible to public viewers
│
└─ ISSUE:
   ├─ Public viewers don't see real-time event log
   ├─ Events log is static (not real-time)
   ├─ ActionLog component is orphaned on public side
   └─ Admin sees real-time, public sees stale
```

**FINDING 3: Game Status Checks (Multiple Places)**

```
Line Checking Pattern: isLive, isFinal, isScheduled

app/(public)/game/[id]/page.tsx:159-162
├─ const isLive = game.status === "LIVE";
├─ const isFinal = game.status === "FINAL";
├─ const isScheduled = game.status === "SCHEDULED";
└─ const hasScore = isFinal || isLive;
└─ const hasBoxScore = isFinal || isLive;

Render Conditions (8 places):
1. Line 275: {isLive && <LIVE indicator>}
2. Line 280: {isFinal && <FINAL badge>}
3. Line 396: {isScheduled && <Rosters>}
4. Line 426: {hasBoxScore && <Box Score>}
5. Line 623: {game.events.length > 0 && <Events>}
6. Line 668: <GameProtocol /> (NO CONDITION — always renders!)
7. GameProtocol internal: if (!boxScores) render "-"
8. ActionLog: game.events.length check

ISSUE: Line 668 renders GameProtocol UNCONDITIONALLY
├─ Even on SCHEDULED games (no box scores)
├─ GameProtocol will render "-" for all cells
├─ Visual clutter on scheduled games
└─ Should have: {(hasBoxScore && <GameProtocol/>)}
```

---

## PHASE 2: FULL RENDER TREE BREAKDOWN

### Tree 1: PUBLIC GAME PAGE (SCHEDULED STATUS)

```
app/(public)/game/[id]/page.tsx (SCHEDULED)
├─ [SSR] Score Header (score unavailable)
│  └─ "VS" text, date, time
│
├─ [SSR] PDF Button (hidden on SCHEDULED)
│  └─ Not rendered (condition: hasScore = false)
│
├─ [SSR] Player Rosters (Condition: isScheduled && hasPlayers)
│  ├─ Grid container (2 columns)
│  ├─ Home Team Roster Card
│  │  ├─ Header (team name, dark bg)
│  │  ├─ Player list (forEach)
│  │  │  ├─ Number (#)
│  │  │  ├─ Name (first + last)
│  │  │  └─ Position (badge)
│  │  └─ Empty state: "Склад не заповнено"
│  │
│  └─ Away Team Roster Card (identical structure)
│
├─ [SSR] Box Score (NOT rendered)
│  └─ Condition check: hasBoxScore = false (SKIP)
│
├─ [SSR] Team Advanced Stats (NOT rendered)
│  └─ Condition check: hasBoxScore = false (SKIP)
│
├─ [SSR] Events Log (NOT rendered)
│  └─ Condition check: game.events.length > 0? (yes, but only on LIVE/FINAL)
│
└─ [CSR] GameProtocol component (MOUNTED — BUG!)
   └─ Status: Renders empty (no boxScores data)
      ├─ Tables render, but all cells = "-"
      └─ Visual: 2 large empty tables (home + away)
```

**RENDER COUNT: 3 components (Rosters + GameProtocol empty)**

---

### Tree 2: PUBLIC GAME PAGE (LIVE STATUS)

```
app/(public)/game/[id]/page.tsx (LIVE)
├─ [SSR] Score Header
│  ├─ Team names, logos
│  ├─ Score (home : away)
│  ├─ "LIVE • Q3" badge (red, animated pulse)
│  └─ Quarter indicators
│
├─ [SSR] PDF + Protocol Buttons
│  ├─ "📄 Завантажити ПДФ" button
│  └─ "📋 Протокол ФБУ" link
│
├─ [SSR] Rosters (NOT rendered)
│  └─ Condition: isScheduled = false (SKIP)
│
├─ [SSR] Box Score Table (HomeBox)
│  ├─ Header (dark bg #1a2744)
│  ├─ Column headers (22 columns)
│  │  └─ №, Гравець, Поз, Хв, Оч, КП, %, 2О, %, 3О, %, ШТ, %, НПД, ЗПД, ПДБ, ПЕР, ВТ, БЛК, ФОЛ, ЕФК, +/-
│  ├─ Player rows (starters first)
│  │  ├─ Condition: if !isStarter && prevWasStarter → render "ЛАВКА" separator
│  │  ├─ For each player:
│  │  │  ├─ Number (with * if starter)
│  │  │  ├─ Name (lastName firstName[0])
│  │  │  ├─ Position (from bs.player.position)
│  │  │  ├─ Minutes: (bs.minutesPlayed || calcPlayerMinutes(...))
│  │  │  ├─ Stats: points, FG, 3P, FT, rebounds, assists, etc.
│  │  │  └─ Efficiency, +/-
│  │  └─ Iteration: box.players.flatMap()
│  │
│  └─ Totals row (Σ Разом)
│
├─ [SSR] Box Score Table (AwayBox)
│  └─ (Identical structure to HomeBox)
│
├─ [SSR] Team Advanced Stats
│  ├─ Home team stats (6 metrics)
│  │  ├─ Очки після втрат (pts off turnovers)
│  │  ├─ Відриву (fast break pts)
│  │  ├─ Другий шанс (second chance pts)
│  │  ├─ Після замін (pts after subs)
│  │  ├─ Найбільша переваги (biggest lead)
│  │  └─ Найдовший забіг (longest run)
│  │
│  └─ Away team stats (same metrics)
│
├─ [SSR] Legend Row
│  └─ Abbreviation key (КП, 2О, 3О, ШТ, НПД, ЗПД, etc.)
│
├─ [SSR] Events Log (Inline)
│  ├─ Header: "Протокол подій"
│  ├─ Container: max-h-56 overflow-y-auto
│  ├─ Event items (map game.events):
│  │  ├─ Quarter indicator (Q1, Q2, etc.)
│  │  ├─ Event badge (color-coded by type)
│  │  │  ├─ POINTS: +1 (#3b82f6), +2 (#f97316), +3 (#1a2744)
│  │  │  │  └─ BUG: If event.points = null → renders "+null"
│  │  │  ├─ FOUL: ФОЛ (red)
│  │  │  ├─ FOUL_TECHNICAL: ТЕХН.ФОЛ (dark red)
│  │  │  ├─ REBOUND_OFF: НПД (orange)
│  │  │  ├─ REBOUND_DEF: ЗПД (slate)
│  │  │  ├─ ASSIST: ПЕР (green)
│  │  │  ├─ STEAL: ПЕРЕХВАТ (purple)
│  │  │  ├─ BLOCK: БЛК (amber)
│  │  │  └─ ... 5+ more types
│  │  ├─ Player info: #{number} {firstName} {lastName}
│  │  └─ Timestamp: Q indicator
│  │
│  └─ Scrollable: Takes 14 events max visible (max-h-56)
│
└─ [CSR] GameProtocol component (MOUNTED — DUPLICATE!)
   ├─ Status: Renders full FIBA table
   ├─ HomeTeam table
   │  ├─ Header (blue bg #1e3a8a)
   │  ├─ 5 starters (blue rows)
   │  ├─ Bench separator
   │  ├─ Bench players (white rows)
   │  └─ Totals row
   │
   ├─ AwayTeam table
   │  ├─ Header (red bg #7f1d1d)
   │  ├─ 5 starters (red rows)
   │  ├─ Bench separator
   │  ├─ Bench players (white rows)
   │  └─ Totals row
   │
   └─ Internal render for each player:
      ├─ Calls: getDisplayTime(bs, gameTimeLeft)
      ├─ Calls: getBoxScoreForPlayer(boxScores, playerId)
      └─ Renders: All stats (16+ columns)
```

**RENDER COUNT: 4 major sections (Header, Scores, Stats, Events) + GameProtocol (DUPLICATE)**

---

### Tree 3: ADMIN GAME PAGE

```
app/admin/games/[id]/page.tsx
├─ Container: Flex layout (height: 100vh)
│
├─ LEFT PANEL (flex: 1)
│  └─ LiveScoreTracker component
│     ├─ [CSR] Timer Display
│     │  ├─ Shows: MM:SS (e.g., "08:34")
│     │  ├─ State: gameTimeLeft (useState)
│     │  ├─ Update: useEffect tick (60/sec)
│     │  └─ Source: initialGame.currentTimeLeft || 600
│     │
│     ├─ [CSR] Roster Panels (2 columns)
│     │  ├─ Home Team Panel (DraggableRosterPanel)
│     │  │  ├─ Header: Team name
│     │  │  ├─ Starters Section (🟢 СТАРТОВА П'ЯТІРКА)
│     │  │  │  ├─ Green header
│     │  │  │  └─ Player items (5) - draggable
│     │  │  │     ├─ Court indicator (green dot if on court)
│     │  │  │     ├─ Number
│     │  │  │     ├─ Name
│     │  │  │     └─ Timer display (time on court)
│     │  │  │
│     │  │  └─ Bench Section (🪑 ЛАВКА)
│     │  │     ├─ Gray header
│     │  │     └─ Player items (rest) - draggable
│     │  │        └─ Gray dot indicator
│     │  │
│     │  └─ Away Team Panel (identical)
│     │
│     ├─ [CSR] Score Entry Grid
│     │  ├─ Stat entry table
│     │  ├─ Buttons: +1, +2, +3 (scored)
│     │  ├─ Buttons: Foul, Rebound, Assist, etc.
│     │  └─ Conditions: {!selectedPlayerId && opacity: 0.5}
│     │
│     ├─ [CSR] Action Log (ActionLog component)
│     │  ├─ Recent events display
│     │  ├─ Event badges (colored)
│     │  └─ Shows +2, ФОЛ, ПЕР, etc.
│     │
│     └─ [CSR] Modal Chain (3 conditionally mounted)
│        ├─ FoulPlayerModal {showFoulModal && ...}
│        │  ├─ Player selection grid
│        │  ├─ Foul type selector (4 buttons)
│        │  └─ Confirm button
│        │
│        ├─ FreeThrowModal {showFreeThrowModal && ...}
│        │  ├─ Context: scoring | miss
│        │  ├─ If scoring: +1 button
│        │  └─ If miss: MISS_FT button
│        │
│        └─ Substitution Modal (local div, showSubModal)
│           ├─ Player IN selector
│           └─ Player OUT selector
│
├─ RIGHT PANEL (width: 400px)
│  └─ FibaPanelWrapper {showFibaPanel && ...}
│     ├─ Toggle button (⚙️ FIBA)
│     ├─ Close button (×)
│     │
│     ├─ GameInfoForm
│     │  ├─ commissioner input
│     │  ├─ referee1, referee2, referee3 inputs
│     │  ├─ venue input
│     │  ├─ round input
│     │  ├─ ref, umpire1, umpire2 inputs
│     │  ├─ scorer, assistantScorer inputs
│     │  ├─ timer, shotClockOperator inputs
│     │  ├─ gameNumber input
│     │  ├─ protest toggle
│     │  └─ protestNote textarea
│     │
│     └─ TeamInfoForm x2 (home + away)
│        ├─ coachName input
│        └─ assistantCoach input
│
└─ Background: #f3f4f6 (light gray)
```

**RENDER COUNT: 2 panels (LiveScoreTracker left + FibaPanelWrapper right)**

---

## CRITICAL FINDING: CONDITIONAL RENDER ISSUES

### Issue A: GameProtocol Always Mounts (No Guard)

**File:** `app/(public)/game/[id]/page.tsx:668`

```tsx
{/* FIBA Protocol */}
<GameProtocol game={game} gameTimeLeft={game.currentTimeLeft} />
```

**Problem:**
```
No condition guard! Renders even on SCHEDULED games
├─ SCHEDULED game: boxScores = [] (empty)
├─ GameProtocol renders all cells as "-"
├─ Visual: 2 empty tables (confusing on scheduled game)
└─ Should be: {hasBoxScore && <GameProtocol />}
```

**Fix needed:**
```tsx
{hasBoxScore && <GameProtocol game={game} gameTimeLeft={game.currentTimeLeft} />}
```

---

### Issue B: +null Bug (No Type Validation)

**File:** `components/live-tracker/ActionLog.tsx:46`

```tsx
{event.type === "POINTS" && (
  <span>+{event.points}</span>  // ← Can render +null!
)}
```

**Problem:**
```
event.points is nullable (Int? in schema)
├─ If POINTS event created with null points
├─ Renders: +null (confusing user)
└─ Root cause: recordGameAction doesn't validate
```

**Fix needed:**
```tsx
{event.type === "POINTS" && event.points && (
  <span>+{event.points}</span>
)}
```

---

### Issue C: Duplicate Sport Statistics Display

**File:** `app/(public)/game/[id]/page.tsx`

```
Two complete box score renderers:
1. Inline calculation (lines 186-250)
2. GameProtocol component (line 668)

Both display SAME DATA with different layouts
```

**Result:**
```
User sees:
├─ Small clean table (Tailwind styled)
└─ Large FIBA table (inline styled)

Both showing identical stats, different columns
├─ Confusing layout
├─ Double render performance cost
└─ Maintenance nightmare (2 codebases for 1 feature)
```

---

## CONDITIONAL RENDER MAP

```
Component                  Condition           Status      Issue
─────────────────────────────────────────────────────────────────
Score Header               Always              ✓ OK        None
PDF Button                 hasScore            ✓ OK        None
Rosters (SCHEDULED)        isScheduled         ✓ OK        None
Box Score                  hasBoxScore         ✓ OK        None
Advanced Stats             hasBoxScore         ✓ OK        None
Events Log (inline)        game.events.len > 0 ⚠️ STALE     Not real-time
GameProtocol               NONE (ALWAYS)       🔴 BUG      Should guard on hasBoxScore

────────────────────────────────────────────────────────────────

ADMIN PAGE:

Component                  Condition           Status      Issue
─────────────────────────────────────────────────────────────────
LiveScoreTracker left      Always              ✓ OK        None
FoulPlayerModal            showFoulModal       ✓ OK        None (but no debounce)
FreeThrowModal             showFreeThrowModal  ✓ OK        None
SubstitutionModal          showSubModal        ✓ OK        None
FibaPanelWrapper right     Always              ✓ OK        None (can hide)
GameInfoForm               showFibaPanel       ✓ OK        None
TeamInfoForm               showFibaPanel       ✓ OK        None
ActionLog                  events.length > 0   ⚠️ EMPTY     No events shown initially
```

---

## RENDER PERFORMANCE ANALYSIS

### PUBLIC GAME PAGE (LIVE)

```
Render passes per page load:

1. SSR (Server)
   ├─ Prisma fetch (game + boxScores)
   ├─ Calculate quarter scores
   ├─ Build box score tables (home + away)
   ├─ Calculate team stats
   └─ Render all static content

2. Hydration (Client)
   ├─ GameProtocol mounts (CSR)
   ├─ Re-render GameProtocol (React.StrictMode in dev)
   └─ Initial hydration mismatch check

3. Subsequent renders (after user interaction)
   ├─ No state changes on this page (no mutations)
   ├─ Static content stays static
   └─ Only cause: User navigation away

Cost:
├─ Box score table: 22 columns × N players = expensive
├─ Calculated twice (inline + GameProtocol)
└─ Total: ~2-3 full document renders
```

### ADMIN GAME PAGE (LIVE)

```
Render passes per action:

1. Initial mount
   ├─ LiveScoreTracker mounts
   ├─ FibaPanelWrapper mounts
   └─ Initial state setup

2. Timer tick (every ~1 second)
   ├─ setGameTimeLeft (new value)
   ├─ Re-render LiveScoreTracker
   └─ Timeline display updates

3. User clicks +2 button
   ├─ recordGameAction (server action)
   ├─ Server updates DB
   ├─ Page revalidates (if revalidatePath called)
   ├─ Re-render entire page (SSR)
   └─ Hydration on client

Cost:
├─ Every timer tick = 1 full re-render
├─ Every action = Full page SSR + hydration
└─ Total: 60+ renders per minute (idle game)
```

---

## MEMOIZATION OPPORTUNITIES

```
Component                  Memoized?   Should Be?  Why
──────────────────────────────────────────────────────────────
GameProtocol               ✗ NO        ✓ YES       Props stable, expensive render
ActionLog                  ✗ NO        ✓ YES       Events array may have new refs
CourtIndicator             ✓ YES       ✓ YES       Mini component, good candidate
DraggableRosterPanel       ✓ YES       ✓ YES       Drag logic intensive
StatEntryGrid              ✗ NO        ✓ YES       Form, many inputs
FoulPlayerModal            ✗ NO        ✓ YES       Heavy list filtering
FreeThrowModal             ✗ NO        ? MAYBE     Light component
Box score table (inline)   ✗ NO        ✓ YES       Expensive render, stable data
```

---

## SUMMARY: RENDER TREE FINDINGS

| Finding | Severity | Location | Impact |
|---------|----------|----------|---------|
| GameProtocol always mounts | 🟡 HIGH | page.tsx:668 | Empty tables on SCHEDULED games |
| +null rendering | 🔴 CRITICAL | ActionLog:46 | User sees "+null" in events |
| Duplicate box score renders | 🟡 HIGH | page.tsx + GameProtocol | 2x render cost, confusing layout |
| Events log not real-time | 🟠 MEDIUM | page.tsx:623-664 | Public sees stale events |
| No ActionLog on public | 🟡 HIGH | ActionLog orphaned | Real-time events don't reach public |
| Stale data on roster change | 🔴 CRITICAL | LiveScoreTracker | External subs not visible |
| Modal memory leak risk | 🟠 MEDIUM | LiveScoreTracker | Modals stay mounted if not closed |
| No GameProtocol memoization | 🟠 MEDIUM | GameProtocol.tsx | 60+ renders/min on admin page |

---

**STATUS: PHASE 2 COMPLETE** ✅

All render trees mapped, conditional logic identified, performance issues documented.

Ready for PHASE 3 (store forensics).
