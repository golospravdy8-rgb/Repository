# 🎮 COLYSEUS COMPLETE ARCHITECTURE REBUILD (2026-04-28)

## 📊 ROOT CAUSE ANALYSIS

### Current Problems
1. **onStateChange.once()** → Only fires for INITIAL snapshot
   - If Player A joins first, then Player B → Player B's onStateChange.once() fires AFTER A is added
   - A is not in "new additions", forEach might miss it
   - Solution: Use continuous onStateChange() for ALL state updates

2. **Dual listeners conflict** → onStateChange.once() AND onStateChange() both update remotePlayersRef
   - Double processing, potential race conditions
   - Solution: Single source of truth - onStateChange() only

3. **onChange reliability** → Not guaranteed on every coordinate change
   - Colyseus batches updates
   - onChange might not fire if value changes within same frame
   - Solution: Use onStateChange() which always has full state

4. **Inactivity cleanup** → Too aggressive
   - lastSeen only updated in handleMove
   - Player standing still → lastSeen gets old → deleted after 30s
   - Solution: Update lastSeen on EVERY state change

5. **playerIndex management** → Not updated when players join/leave
   - Server assigns playerIndex at join time based on count
   - If players leave, indices become sparse/wrong
   - Solution: Server updates playerIndex on every join/leave

---

## ✅ RECOMMENDED ARCHITECTURE (Colyseus 0.15+ best practices)

### Server Side (BasketballRoom.ts)
```
1. onJoin():
   - Assign playerIndex based on current count
   - Set x, y from queue position
   - Initialize status = "alive"
   - lastSeen = Date.now()
   - Broadcast "playerJoined"

2. onLeave():
   - Delete player
   - Update all remaining playerIndex (0, 1, 2...)
   - Broadcast "playerLeft"

3. handleMove():
   - Update player.x, player.y from data
   - Update player.status
   - Update player.lastSeen = Date.now()
   - Colyseus auto-detects mutations and broadcasts

4. Physics/Ball():
   - Update ball state
   - Broadcast "ballUpdate" for remote players
```

### Client Side (RucheekGameCanvas.tsx)
```
1. onStateChange.once():
   - Register listeners: onAdd, onChange, onRemove
   - Call updateRemotePlayer() for all existing players
   - → Initial setup only

2. onStateChange() continuous:
   - SINGLE source of truth for remotePlayersRef
   - Iterate ALL players in state.players
   - For each:
     * If exists in map: update coordinates, status, lastSeen
     * If new: add to map
     * If should be removed: delete from map
   - Only forceUpdate if actual changes

3. onMessage('ballUpdate'):
   - Store in remoteBallRef
   - forceUpdate

4. Cleanup on unmount:
   - Clear all intervals
   - room.leave()
   - Clear refs
```

---

## 🔧 IMPLEMENTATION DETAILS

### Key Principle: "State is Source of Truth"
- remotePlayersRef is a CACHE of room.state.players
- Always sync from room.state, never maintain separate state
- onStateChange() is the ONLY place where remotePlayersRef is updated

### Listener Management
```typescript
// Register ONCE (in onStateChange.once)
state.players.onAdd = (player, key) => {
  // Only call when a NEW player is added AFTER listeners are registered
  console.log('[🟢 onAdd] Player added:', key);
  // Quick update for immediate UI response
  updateRemotePlayerFromState(player, key);
};

state.players.onChange = (player, key) => {
  // Only call when field CHANGES
  console.log('[🔴 onChange] Player field changed:', key);
  // Quick update
  updateRemotePlayerFromState(player, key);
};

state.players.onRemove = (player, key) => {
  console.log('[🟡 onRemove] Player removed:', key);
  remotePlayersRef.current.delete(key);
  forceUpdate(x => x + 1);
};

// Then immediately process existing players
state.players.forEach((player, key) => {
  if (key !== room.sessionId) {
    updateRemotePlayerFromState(player, key);
  }
});
```

### Continuous Sync (Main Loop)
```typescript
room.onStateChange((state) => {
  const prevSize = remotePlayersRef.current.size;
  
  // 1. Ensure all state players are in map (handles late arrivals)
  state.players.forEach((player, key) => {
    if (key !== room.sessionId) {
      const existing = remotePlayersRef.current.get(key);
      
      if (!existing) {
        // New player - add it
        const updated = createPlayerObject(player, key);
        remotePlayersRef.current.set(key, updated);
      } else {
        // Existing - update coordinates and status
        existing.x = getPlayerX(player);
        existing.y = getPlayerY(player);
        existing.status = player.status;
        existing.lastSeen = player.lastSeen;
        existing.playerIndex = player.playerIndex;
        remotePlayersRef.current.set(key, existing);
      }
    }
  });
  
  // 2. Remove players not in state
  const toDelete = [];
  remotePlayersRef.current.forEach((_, key) => {
    if (!state.players.has(key)) {
      toDelete.push(key);
    }
  });
  toDelete.forEach(key => remotePlayersRef.current.delete(key));
  
  // 3. Re-render if size changed
  const newSize = remotePlayersRef.current.size;
  if (newSize !== prevSize || toDelete.length > 0) {
    forceUpdate(x => x + 1);
  }
});
```

---

## 📋 COORDINATE LOGIC

### Queue Positions (Waiting Players)
```typescript
function getPlayerX(player) {
  if (player.status === 'shooting' || player.status === 'running') {
    return player.x; // Real coordinate
  } else {
    // Queue position based on playerIndex
    const pos = QUEUE_POSITIONS[Math.min(player.playerIndex, QUEUE_POSITIONS.length - 1)];
    return pos.x;
  }
}

function getPlayerY(player) {
  return groundYRef.current; // Always at ground level
}
```

---

## 🔴 ANTI-PATTERNS TO AVOID

### ❌ Don't do this:
```typescript
// Using once() and expecting continuous updates
room.onStateChange.once(() => { ... });
state.players.forEach(...); // Only once!

// Maintaining separate state
let localPlayers = [];
// Later: localPlayers !== room.state.players

// Calling updateRemote multiple times for same player
onAdd -> updateRemote
onChange -> updateRemote  
onStateChange -> updateRemote
// = triple processing, forceUpdate called 3x

// Assuming onChange fires for every mutation
player.x = 100; // might not trigger onChange!

// Not cleaning up on unmount
useEffect(() => {
  // setup
  // missing: return () => { cleanup }
})
```

### ✅ Do this instead:
```typescript
// Single source of truth
room.onStateChange((state) => {
  // Full state reconciliation here
  remotePlayersRef.current = new Map();
  state.players.forEach((player, key) => {
    if (key !== room.sessionId) {
      remotePlayersRef.current.set(key, formatPlayer(player, key));
    }
  });
});

// Cleanup on unmount
useEffect(() => {
  return () => {
    if (roomRef.current) roomRef.current.leave();
    clearAllIntervals();
  };
}, []);

// Efficient re-render
const prevSize = remotePlayersRef.current.size;
// update...
if (remotePlayersRef.current.size !== prevSize) {
  forceUpdate(x => x + 1);
}
```

---

## 🎯 EXPECTED BEHAVIOR AFTER REBUILD

### Scenario: Player A joins, then Player B joins
1. Player A connects:
   - onStateChange.once fires
   - onAdd/onChange listeners registered
   - forEach finds no existing players
   - remotePlayersRef.current.size = 0 ✓

2. Player B connects:
   - Player B's onStateChange.once fires
   - onAdd/onChange listeners registered
   - forEach iterates state.players
     * Finds Player A
     * updateRemotePlayer called for A
     * remotePlayersRef.current.set(A.sessionId, A)
   - remotePlayersRef.current.size = 1 ✓

3. Player A moves mouse:
   - server handleMove updates player.x, player.y
   - Colyseus broadcasts state patch
   - All clients' onStateChange fires
   - Both update remotePlayersRef
   - Both see movement ✓

4. Player B moves mouse:
   - Same as above
   - Player A sees Player B move ✓

### Console Output
```
[🟢 INIT] State received
[🟢 onAdd] Listeners registered
[🟢 INIT] Processing 0 existing players
[🟢 STATE] State update received: 2 players
[🟢 STATE] Player found: sessionB
[🔴 STATE] Updating coords: sessionB x=480 y=584
[🔵 RENDER] remotePlayersRef size: 1
```

---

## 📊 COMPARISON: OLD vs NEW

| Aspect | OLD | NEW |
|--------|-----|-----|
| State listeners | multiple places | Single onStateChange() |
| Late arrivals | ❌ Not handled | ✅ Handled in forEach |
| Coordinate updates | ❌ Missed some | ✅ All captured |
| Re-render | 3+ per update | ≤1 per update |
| Code clarity | ❌ Confusing | ✅ Single pattern |
| Debugging | ❌ Hard | ✅ Easy |
| Race conditions | ❌ Possible | ✅ None |

---

## 🚀 NEXT: IMPLEMENTATION

Ready to implement this architecture in actual code?

