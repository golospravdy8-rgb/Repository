# MULTIPLAYER / WEBSOCKET ANALYSIS REPORT
## Basket Lviv - РУЧЕЁК Game
**Date**: 2026-04-22  
**Analysis Type**: Architecture & Real-Time Functionality

---

## PART 1: WEBSOCKET / SOCKET.IO INFRASTRUCTURE

### 1.1 Socket.IO Presence & Structure

**✅ Socket.IO IS INSTALLED AND CONFIGURED**
- Server: `apps/chat/src/socketServer.ts` (32:export function initializeSocket)
- Alternative advanced version: `apps/chat/src/socketServerAdvanced.ts` (uses advanced physics)
- Client hook: `apps/chat/src/hooks/useGameSocket.ts`
- Configuration: `apps/chat/src/config/socket.config.ts`
- API route initializer: `apps/chat/src/app/api/socket.ts`

**Socket.IO Server Details:**
- Location: `apps/chat/src/socketServer.ts` line 32-250+ (basic version)
- Initialization: via Next.js API route (`apps/chat/src/app/api/socket.ts`)
- CORS: Enabled for `*` (open to all origins)
- Transports: Both `websocket` and `polling` enabled
- Update Interval: 50ms (20 updates/sec)

### 1.2 Events Emitted (Server → Client)

**Server broadcasts these events:**
```
1. player_joined        - When player enters room (line 75)
2. player_moved         - Position update (line 105)
3. shoot_started        - Shoot action initiated (line 125)
4. ball_updated         - Ball physics state (line ~155)
5. score_changed        - Score update
6. game_state_update    - Full game state sync
7. player_eliminated    - Player knocked out
8. player_disconnected  - Disconnection event
9. debug_rooms_info     - Debug: room info (line 31)
```

### 1.3 Events Listened To (Client → Server)

**Client sends these events:**
```
1. join_game           - Initial connection to room (useGameSocket.ts:60)
2. player_move         - Position/status update (line 122)
3. shoot_start         - Shoot initiation (line 136)
4. ball_state          - Ball physics (line 148)
5. player_eliminated   - Self-elimination (line 162)
6. score_updated       - Score change (line 171)
```

### 1.4 Public HTML Demo Status

**⚠️ CRITICAL**: `/public/rucheyok-demo.html` has **NO Socket.IO integration**
- No socket.io imports
- No WebSocket listeners
- No room/player sync
- Uses **sessionStorage only** for local player identity (myPlayerIdx)
- This is a **standalone offline game**, NOT multiplayer

---

## PART 2: GAME STATE SYNCHRONIZATION

### 2.1 Server-Side State Management

**Game Room Structure** (socketServer.ts:21-26):
```typescript
interface GameRoom {
  roomId: string;
  players: Map<string, PlayerState>;  // socket.id → player data
  ball: BallState;
  lastUpdateTime: number;
}
```

**Player State Tracked:**
- Position: `x`, `y`
- Status: `'alive' | 'eliminated'`
- Score: `score`
- Kills: `kills`
- Socket ID: for identifying connection

**Ball State Tracked:**
- Position: `x`, `y`
- Velocity: `vx`, `vy`
- State: `'idle' | 'flying' | 'in_basket'`

### 2.2 Real-Time Sync Mechanism

**Update Flow:**
1. Client sends `player_move` event with position (line 122)
2. Server receives, updates room.players Map (line 99-100)
3. Server broadcasts to **all players in room** (line 105: `io.to(roomId).emit`)
4. All clients receive updated positions and render
5. Interval: 50ms (configured in socketServer.ts:29)

**Data Flow:**
```
Player 1 Browser                Socket.IO Server              Player 2 Browser
    ↓                                 ↓                              ↓
  x,y update ─────→ emit('player_move')
                      ↓
                  Update room.players[socketId]
                      ↓
                  io.to(roomId).emit('player_moved')
                                     ←─────── receive & render
```

### 2.3 Room System

**✅ YES, there IS a room/multiplayer system:**
- Rooms: Identified by `roomId` string parameter
- Each room has independent game state
- Players join with `socket.join(roomId)` (line 47)
- Broadcasts scoped to room: `io.to(roomId).emit(...)` (line 105)
- Multiple concurrent games possible (different roomIds)
- **Default room**: `"general"` (from RucheekGameCanvas prop)

---

## PART 3: PLAYER IDENTITY & LINKING

### 3.1 Player Identification (Public HTML Demo)

**Current Method:**
```javascript
// Stored in browser sessionStorage
let myPlayerIndices = [];

function isMyPlayer(idx) {
  return myPlayerIndices.includes(idx);
}

// Saved when adding player
myPlayerIndices.push(idx);
sessionStorage.setItem('rucheek_myIndices', JSON.stringify(myPlayerIndices));
```

**⚠️ PROBLEM**: Uses **array index** (0-5) instead of persistent user ID
- No link to user account or phone
- Resets on page reload
- Cannot identify same player across sessions
- Works only for local client

### 3.2 React Component Version (RucheekGameCanvas)

**Player Name Linking:**
```typescript
// From ChatPage (line 2765-2770)
<RucheekGameCanvas
  userName={user ? `${user.firstName} ${user.lastName}` : "Гравець"}
  userPhone={user?.phone || ""}
  gameRoomId={activeRoom}
/>
```

**React Component Accepts:**
- `userName`: From chat user object (`firstName + lastName`)
- `userPhone`: User's phone number
- `gameRoomId`: Chat room ID (e.g., "general")
- `isVisible`: Toggle visibility

**But RucheekGameCanvas Does NOT:**
- ❌ Use the `userName` for game state
- ❌ Use the `userPhone` for player identification
- ❌ Send player identity to Socket.IO server
- ❌ Track which chat user owns which game player
- Uses `pname` state (local, not synced)

### 3.3 Socket.IO Player Identity Issue

**Server tracks players by:**
```javascript
room.players.set(socket.id, { index, x, y, status, score, kills })
```

**Problems:**
- Uses Socket.IO `socket.id` (temporary connection ID)
- No link to user account, phone, or chat identity
- No persistence across reconnects (new socket.id = new player)
- Cannot match "user X in chat" to "player Y in game"
- No authentication or verification

---

## PART 4: INTEGRATION STATUS - WHAT WORKS vs WHAT'S BROKEN

### ✅ WHAT WORKS (Infrastructure Present)

1. **Socket.IO Server Initialized** ✓
   - Listening on Next.js API route
   - Supports multiple rooms
   - Event system configured

2. **Client Socket.IO Hook** ✓
   - `useGameSocket.ts` has all emit/listen functions
   - Proper connection lifecycle
   - Reconnection with backoff

3. **Game State Broadcast** ✓
   - Server receives position updates
   - Broadcasts to room immediately
   - Multiple players can join same room

4. **Room Isolation** ✓
   - `io.to(roomId).emit()` properly scopes broadcasts
   - No cross-room data leaks

### ❌ WHAT'S BROKEN / MISSING

#### **CRITICAL ISSUES:**

1. **RucheekGameCanvas Does NOT Use Socket.IO** 🔴
   - Component has no `useGameSocket` hook
   - No socket connection
   - No event listeners
   - Game runs entirely locally (standalone)
   - **Impact**: Players see different games, cannot compete/interact

2. **No Player Identity Linking** 🔴
   - Cannot match chat user to game player
   - Cannot persist player across reconnects
   - No authentication in game
   - Cannot store scores by user
   - **Impact**: Multiplayer is impossible

3. **Public HTML Demo vs React Component Mismatch** 🔴
   - Two different game implementations:
     - `/public/rucheyok-demo.html` - Offline only
     - `RucheekGameCanvas.tsx` - Has socket infrastructure but doesn't use it
   - React component doesn't use the socket it has access to
   - **Impact**: Confusion, dead code, cannot scale

4. **No Client-Side Rendering of Remote Players** 🔴
   - `RucheekGameCanvas` has local `players` Map (line 32)
   - Listens to socket events (supposedly)
   - But **has no handlers** to update game state from socket
   - Canvas renders only local state, ignores broadcasts
   - **Impact**: Each player sees only themselves

5. **Ball Physics Not Networked** 🔴
   - Ball state sent via `emitBallState()` but never rendered
   - Server receives ball updates but no game loop processes them
   - Each client runs physics independently
   - **Impact**: Ball position diverges between players

6. **No Interpolation/Reconciliation** 🔴
   - Raw position deltas sent over network
   - No smoothing or dead reckoning
   - Would appear jittery if connected
   - (Note: `socketServerAdvanced.ts` has physics but isn't used)

7. **No Authority / Anti-Cheat** 🔴
   - Client sends own position directly to server
   - Server trusts client data without validation
   - Client could send fake positions, scores, eliminations
   - **Impact**: Cheating is trivial

---

## PART 5: FILE INVENTORY

### Architecture Files

| File | Purpose | Status |
|------|---------|--------|
| `apps/chat/src/socketServer.ts` | Basic socket handler | ✓ Implemented |
| `apps/chat/src/socketServerAdvanced.ts` | Physics-enabled version | ⚠️ Implemented but unused |
| `apps/chat/src/app/api/socket.ts` | Next.js API route to init socket | ✓ Initialized |
| `apps/chat/src/hooks/useGameSocket.ts` | React hook for socket | ✓ Implemented |
| `apps/chat/src/config/socket.config.ts` | Socket configuration | ✓ Configured |
| `apps/chat/src/utils/physics.ts` | Physics calculations | ✓ Exists |
| `apps/chat/src/components/GameCanvas.tsx` | Alternative game renderer | ⚠️ Different implementation |
| `components/public/RucheekGameCanvas.tsx` | Main game component | ⚠️ Missing socket integration |
| `components/public/ChatPage.tsx` | Renders RucheekGameCanvas | ✓ Passes props |
| `public/rucheyok-demo.html` | Standalone static game | ✓ Offline-only |

### Files That Need Changes

**MUST MODIFY:**
1. `components/public/RucheekGameCanvas.tsx` - Add `useGameSocket` hook, update state from events
2. `apps/chat/src/socketServer.ts` - Add player identity validation, implement game loop

**SHOULD CONSIDER:**
3. `apps/chat/src/socketServerAdvanced.ts` - Replace basic version with this (has physics)
4. Add authentication layer for socket connections
5. Add client-side interpolation/smoothing

---

## PART 6: ROOT CAUSE ANALYSIS

### Why is multiplayer broken?

**Reason #1: Two Parallel Implementations**
- HTML demo (`public/rucheyok-demo.html`) built as offline game
- React component (`RucheekGameCanvas.tsx`) added later
- No one connected them

**Reason #2: Incomplete Socket Integration**
- Socket infrastructure scaffolded but never wired up
- Hooks exist but not imported in component
- Events defined but no handlers in canvas

**Reason #3: Design Assumption Mismatch**
- Socket server assumes **server runs game loop** (line 29 UPDATE_INTERVAL)
- Canvas assumes **client runs game loop** (local canvas animation)
- These approaches are incompatible without reconciliation

---

## PART 7: RECOMMENDED FIX PRIORITY

### Phase 1: Basic Multiplayer (1-2 hours)
1. Add `useGameSocket` hook to `RucheekGameCanvas.tsx`
2. Wire socket event handlers to update `players` Map
3. Render remote players on canvas
4. Test with 2 browsers in same room

### Phase 2: Game Logic Sync (2-3 hours)
1. Move game loop to server (`socketServerAdvanced.ts`)
2. Client sends input (click, angle, power)
3. Server simulates, broadcasts state
4. Client interpolates/renders

### Phase 3: Player Identity (1-2 hours)
1. Link Socket.IO connection to user account
2. Store player name from chat user
3. Validate player ownership on actions
4. Persist scores to database

---

## SUMMARY TABLE

| Aspect | Status | Evidence |
|--------|--------|----------|
| Socket.IO Server | ✓ Exists | `socketServer.ts:32` |
| Socket.IO Client | ✓ Exists | `useGameSocket.ts:21` |
| Game Rooms | ✓ Implemented | `socketServer.ts:28 gameRooms Map` |
| Real-Time Broadcast | ✓ Coded | `io.to(roomId).emit()` on line 105 |
| Integration in Game | ❌ BROKEN | No useGameSocket in RucheekGameCanvas |
| Player Identity | ❌ MISSING | No user/phone linking to game |
| Client-Side Rendering | ❌ INCOMPLETE | No socket event handlers in canvas |
| Server-Side Physics | ⚠️ PARTIAL | Advanced server exists but not used |
| **Overall Status** | **🔴 NON-FUNCTIONAL** | Infrastructure exists but not integrated |

---

## CONCLUSION

The project has **all the infrastructure pieces** for multiplayer (socket server, hooks, events, rooms) but they are **completely disconnected from the game component**. It's like having a network layer implemented but the game still thinks it's offline.

The main game component (`RucheekGameCanvas.tsx`) runs as a pure local canvas game and does not use Socket.IO at all. The socket infrastructure was built but never integrated into the actual game rendering pipeline.

**Time to working multiplayer:** ~3-4 hours of focused integration work.

