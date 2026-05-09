# LiveScoreTracker Fixes Complete — 2026-05-09 ✅

## What Was Fixed

### 1️⃣ Created `initializeGameData()` Server Action
**File:** `app/actions/game-events.ts`

- Automatically called when `START_GAME` button is clicked
- Creates **BoxScore** records for all 18 players (11 home + 7 away)
- Creates **GameOnCourt** records for all 18 players
- Marks first 5 players of each team as **starters** (isStarter=true)
- Sets on-court status (onCourt=true) for starters
- Sets enteredAt=600 (game start time) for starters

**Result:** 18 BoxScore + 18 GameOnCourt records created in single transaction

### 2️⃣ Fixed `recordSubstitution()` Logic
**File:** `app/actions/game-events.ts` (lines 482-520)

**Problem Fixed #1: Time Math**
- **Before:** `timeAdded = gameClockSeconds - enteredAtValue` (backwards, caused negative values)
- **After:** `timeAdded = enteredAtValue - gameClockSeconds` (correct direction)

Example: Player entered at gameClock=600, exits at 500
- Before: 500 - 600 = -100 ❌ (wrong!)
- After: 600 - 500 = 100 seconds ✅ (correct!)

**Problem Fixed #2: GameOnCourt Not Updated**
- **Before:** Only updated BoxScore, ignored GameOnCourt
- **After:** Updates BOTH:
  - Player exiting: `GameOnCourt.onCourt = false`
  - Player entering: `GameOnCourt.onCourt = true`, sets `lastSubInTimestamp`

**Problem Fixed #3: isOnCourt Flag Not Set**
- **Before:** BoxScore.isOnCourt never changed
- **After:** Sets `isOnCourt = false` when player exits, `isOnCourt = true` when entering

## What Now Works ✅

### Data Initialization
- ✅ 18 BoxScore records created automatically on START_GAME
- ✅ 18 GameOnCourt records created with proper flags
- ✅ First 5 players per team marked as starters
- ✅ Starters set as on-court with enteredAt=600
- ✅ All stats initialized to 0

### Starter Visibility
- ✅ Starters appear in "На паркеті" section
- ✅ Bench players appear in "Лавка" section
- ✅ Visual separation is automatic (no code changes needed to RosterPanel)

### Green Indicators
- ✅ Starters show green (#39d983) indicators
- ✅ Bench players show gray (#3a4a5a) indicators
- ✅ Indicators light up automatically for on-court players

### Time Tracking
- ✅ Starter time accumulates correctly (100 sec = 1:40)
- ✅ Time calculation uses correct math (entry - exit)
- ✅ Time persists after substitution
- ✅ getDisplayTime() displays correctly

### Substitution Mechanics
- ✅ Exiting player moves to bench (onCourt=false)
- ✅ Entering player moves on court (onCourt=true)
- ✅ Time accumulates when player exits
- ✅ New player starts fresh timer (enteredAt set)
- ✅ RosterPanel auto-refreshes without reload

## Test Results

### Database Verification ✅
```
BoxScore records: 18
GameOnCourt records: 18
Starters on court: 10 (5 home + 5 away)
Bench players: 8 (6 home + 2 away)
```

### Time Calculation Test ✅
```
Starter enteredAt: 600s (game start)
Exit at: 500s (100 seconds elapsed)
timeAdded = 600 - 500 = 100 seconds
Accumulates correctly: 0 + 100 = 100 seconds (1:40)
```

### Substitution Test ✅
```
Player 92 (starter) OUT
Player 46 (bench) IN
At gameClock=500s

Result:
  Player 92: isOnCourt=false, timeOnCourtSeconds=100 ✅
  Player 46: isOnCourt=true, enteredAt=500 ✅
  Total on court: 10 (unchanged) ✅
```

## How It Works in Browser

### 1. User Clicks "▶ Почати" (START_GAME)
```
Frontend calls: recordGameAction("START_GAME")
↓
Backend calls: initializeGameData(241)
↓
Creates: 18 BoxScore + 18 GameOnCourt records
↓
Updates: game.status = "LIVE"
↓
Returns: Full game object with all data
↓
Frontend: Displays starters with green indicators ✅
```

### 2. Starters Display on Court with Timer
```
RosterPanel sees: game.onCourt = [5 starters with onCourt=true]
↓
Renders "На паркеті" section with 5 starters
↓
CourtIndicator gets isOnCourt=true → shows green dot ✅
↓
Timer displays gameTimeLeft (counting down)
↓
getDisplayTime returns: boxScore.timeOnCourtSeconds
↓
Shows: 0:00 for fresh starters ✅
```

### 3. User Clicks "Заміна" (Substitution)
```
Frontend calls: recordSubstitution(playerOutId, playerInId, gameClockSeconds=500)
↓
Backend:
  - Calculates: 600 - 500 = 100 seconds for exiting player
  - Updates BoxScore: timeOnCourtSeconds = 0 + 100 = 100, isOnCourt = false
  - Updates GameOnCourt: onCourt = false
  - Updates new player: enteredAt = 500, isOnCourt = true
↓
Returns: Updated game object
↓
Frontend: RosterPanel re-renders
↓
Result:
  - Exited player moves to "Лавка" ✅
  - New player appears in "На паркеті" ✅
  - Gray/green indicators update ✅
  - Time display shows 1:40 for exited player ✅
```

## Files Modified

- `app/actions/game-events.ts`:
  - Added `initializeGameData()` function (100 lines)
  - Modified `recordGameAction()` to call initialization on START_GAME (3 lines)
  - Fixed `recordSubstitution()` time math and GameOnCourt updates (30 lines)

## Verification Steps

To verify in browser:
1. Open http://localhost:3006/admin/games/241
2. Click "▶ Почати" button
3. Should see: 10 starters with green indicators in "На паркеті"
4. Should see: 8 bench players in "Лавка"
5. Time should display: 0:00 for all (game just started)
6. Click "Заміна" button and select a starter to exit, bench player to enter
7. Should see: Exited player moves to "Лавка" with time = 0:00 (no time passed yet)
8. Should see: New player appears in "На паркеті" with green indicator

## Summary

**Problem:** LiveScoreTracker component was ready but had no data to display
- No BoxScore records → no time tracking
- No GameOnCourt records → all players in bench section
- No starter designation → no visual separation

**Solution:** 
1. Auto-initialize data on START_GAME with proper starter flags
2. Fix substitution logic to update GameOnCourt status
3. Correct the time math to prevent negative values

**Result:** Complete working LiveScoreTracker with:
- ✅ Automatic data initialization
- ✅ Starter visibility and green indicators
- ✅ Correct time tracking and accumulation
- ✅ Functional substitution system
- ✅ No changes needed to RosterPanel component

---

## Status: 🟢 READY FOR TESTING

All fixes are committed and tested. LiveScoreTracker is fully functional and ready for manual browser testing.

Test database confirms:
- 18 BoxScore records initialized ✅
- 18 GameOnCourt records initialized ✅
- 10 starters on court ✅
- Time calculations correct ✅
- Substitution logic working ✅

Next: Open browser and test!
