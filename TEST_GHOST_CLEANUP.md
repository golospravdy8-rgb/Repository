# TEST: Ghost Player Cleanup (2026-04-28)

## Summary of Fixes Applied

### 1. ✅ Server-Side Changes (BasketballRoom.ts)

- **Added `lastSeen` tracking**:
  - PlayerSchema now has `@type("number") lastSeen: number = 0`
  - Set in `onJoin()` and updated in `handleMove()`

- **Fixed onLeave()**:
  - Changed from allowing reconnection to immediately deleting player
  - Logs player nickname when leaving

- **Added Cleanup Interval (10s)**:
  - Runs every 10 seconds
  - Removes players inactive for 30+ seconds (INACTIVITY_THRESHOLD)
  - Logs cleanup messages to console

### 2. ✅ Client-Side Changes (RucheekGameCanvas.tsx)

- **Added lastSeen defensive filter**:
  - In syncInterval, skip players with stale lastSeen (>30 seconds)
  - Removes them from remotePlayersRef
  - Logs removal with timestamps

### 3. ✅ Schema Changes (schemas.shared.ts)

- **Added lastSeen field to PlayerSchema**:
  - Allows Colyseus to sync the timestamp from server to client

## Test Steps

### Browser Test 1: Single Player Join/Leave
1. Open `http://localhost:3006/?ag=younger&userName=TestPlayer1`
2. Open second browser tab with `http://localhost:3006/?ag=younger&userName=TestPlayer2`
3. Add TestPlayer2 in second tab → should appear in first tab
4. Close second tab (or navigate away)
5. Wait 5 seconds in first tab
6. **EXPECTED**: TestPlayer2 should disappear from canvas
7. Check browser console: should see removal log from syncInterval filter

### Browser Test 2: Ghost from Old Session
1. Open `http://localhost:3006/?ag=younger&userName=GhostTest1`
2. Refresh page (F5)
3. **EXPECTED**: Old GhostTest1 should NOT appear as ghost
4. Check console: should see "Cleared old ghost players on join"

### Browser Test 3: Multiple Players Cleanup
1. Tab 1: TestPlayer1
2. Tab 2: TestPlayer2
3. Tab 3: TestPlayer3
4. Add all to game
5. Close Tab 2 and Tab 3 (leave them for 40+ seconds)
6. **EXPECTED**: Both should disappear from Tab 1 after ~40 seconds
7. Console should show cleanup messages from server side (every 10 seconds)

### Browser Test 4: Active Player Stays
1. Tab 1: ActivePlayer1
2. Tab 2: ActivePlayer2
3. Tab 2: Move player around (every 2 seconds)
4. Close Tab 1
5. **EXPECTED**: ActivePlayer2 should stay visible indefinitely (keeps updating lastSeen)

## Console Log Patterns to Watch For

### Server Console (terminal where npm run dev:safe started)
- `[Colyseus] Player X joining` ✅
- `[Colyseus] Player X leaving` ✅
- `[Colyseus] Cleaning up inactive player: X` (every 10s) ✅

### Client Console (DevTools → Console)
- `[🟢 COLYSEUS] New player: {...}` when added ✅
- `[🔴 DEBUG] Removing inactive player: {...}` after 30+ seconds ✅

## Expected Behavior After Fixes

- ✅ No ghost players persist after refresh
- ✅ Disconnected players disappear after ~40 seconds max
- ✅ Active players stay visible indefinitely
- ✅ Server cleanup runs every 10 seconds
- ✅ Both server and client have defensive filters

## Files Modified

1. `lib/colyseus/BasketballRoom.ts` — server logic
2. `lib/colyseus/schemas.shared.ts` — add lastSeen field
3. `components/public/RucheekGameCanvas.tsx` — client filter

## Status
- Build: ✅ (npm run dev:safe running on port 3006)
- Ready for manual testing: ✅
