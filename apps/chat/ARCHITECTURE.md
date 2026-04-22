# Socket.IO Game Server Architecture

## 🏗️ Общая архитектура

```
┌─────────────────────────────────────────────────────────────┐
│                     Next.js 14 App                          │
│                   (apps/chat на порту 3011)                 │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┴──────────────┐
        │                             │
   ┌────▼────────┐         ┌─────────▼─────┐
   │  API Route  │         │ Game Pages    │
   │ /api/socket │         │ /game?room=X  │
   └────┬────────┘         └─────────┬─────┘
        │                            │
        │ Initialize              Connect
        │                            │
   ┌────▼──────────────────────────▼──────────┐
   │      Socket.IO Server (порт 3011)       │
   │                                          │
   │  ┌──────────────────────────────────┐   │
   │  │   Game Rooms Manager             │   │
   │  │  ┌────────────────────────────┐  │   │
   │  │  │  Room: game-room-123       │  │   │
   │  │  │  ├─ Players: [P0, P1, P2]  │  │   │
   │  │  │  ├─ Ball State             │  │   │
   │  │  │  └─ Game Loop (50ms)       │  │   │
   │  │  └────────────────────────────┘  │   │
   │  │  ┌────────────────────────────┐  │   │
   │  │  │  Room: room-alpha          │  │   │
   │  │  │  ├─ Players: [P0, P1]      │  │   │
   │  │  │  ├─ Ball State             │  │   │
   │  │  │  └─ Game Loop (50ms)       │  │   │
   │  │  └────────────────────────────┘  │   │
   │  └──────────────────────────────────┘   │
   │                                          │
   │  ┌──────────────────────────────────┐   │
   │  │   Event Handlers                 │   │
   │  │  • join_game                     │   │
   │  │  • player_move                   │   │
   │  │  • shoot_start                   │   │
   │  │  • ball_state                    │   │
   │  │  • player_eliminated             │   │
   │  │  • score_updated                 │   │
   │  └──────────────────────────────────┘   │
   │                                          │
   │  ┌──────────────────────────────────┐   │
   │  │   Physics Engine                 │   │
   │  │  • Gravity                       │   │
   │  │  • Friction                      │   │
   │  │  • Collision Detection           │   │
   │  │  • Boundary Check                │   │
   │  │  • Basket Detection              │   │
   │  └──────────────────────────────────┘   │
   │                                          │
   │  ┌──────────────────────────────────┐   │
   │  │   Broadcast Engine               │   │
   │  │  • game_state_update (50ms)      │   │
   │  │  • player_moved                  │   │
   │  │  • score_changed                 │   │
   │  │  • player_eliminated             │   │
   │  └──────────────────────────────────┘   │
   └──────────────────────────────────────────┘
        │
        │ Socket connection
        │ (WebSocket/Polling)
        │
   ┌────▼──────────────────┐
   │  Browser Clients      │
   │  ┌──────────────────┐ │
   │  │ React Components │ │
   │  │ • GameCanvas     │ │
   │  │ • useGameSocket  │ │
   │  │ • Event Handlers │ │
   │  └──────────────────┘ │
   └───────────────────────┘
```

## 📁 Файловая структура

```
apps/chat/src/
├── socketServer.ts                      # Базовый Socket.IO сервер
│   ├── initializeSocket()               # Инициализация
│   ├── GameRoom interface               # Структура комнаты
│   ├── Event handlers
│   └── Game loop (50ms)
│
├── socketServerAdvanced.ts              # Advanced с физикой
│   ├── initializeSocketAdvanced()       # Инициализация
│   ├── startGameLoop()                  # Game loop с физикой
│   ├── Physics calculations
│   └── Collision detection
│
├── config/
│   └── socket.config.ts                 # Константы и конфиг
│       ├── SOCKET_CONFIG                # Настройки сервера
│       ├── GAME_CONSTANTS               # Игровые константы
│       └── EVENTS                       # Названия событий
│
├── utils/
│   └── physics.ts                       # Физические функции
│       ├── applyGravity()
│       ├── updatePosition()
│       ├── checkCollision()
│       ├── isInBasket()
│       └── ...
│
├── hooks/
│   └── useGameSocket.ts                 # React хук
│       ├── Socket initialization
│       ├── Event subscriptions
│       ├── Emit functions
│       └── Cleanup
│
├── components/
│   └── GameCanvas.tsx                   # React компонент
│       ├── Canvas rendering
│       ├── Mouse input handling
│       └── Game state visualization
│
├── app/
│   ├── api/socket.ts                    # Next.js API route
│   │   └── Handler для инициализации
│   │
│   └── game/
│       └── page.tsx                     # Страница игры
│           ├── Room ID from URL
│           ├── Player index
│           └── GameCanvas component
│
├── SOCKET_IO_GUIDE.md                   # API документация
├── SETUP.md                             # Setup инструкции
└── ARCHITECTURE.md                      # Этот файл
```

## 🔄 Event Flow

### 1. Присоединение к игре

```
Client                          Server
  │                               │
  ├─ useGameSocket() ────────────>│
  │                        (connect)
  │                               │
  ├─ emit('join_game')  ────────>│
  │  { roomId, playerIndex,       │
  │    x, y }                      │
  │                         <──────┤─ Create/Join room
  │                                │
  │<──────────────── emit('room_state')
  │  { players, ball, config }    │
  │                                │
  │<──────────────── emit('player_joined')
  │  { socketId, playerIndex,      │
  │    totalPlayers }              │
  │                                │
```

### 2. Игровой цикл (повторяется каждые 50ms)

```
Server:
  1. Получить текущую comнату
  2. Если ball.state === 'flying':
     a. Применить физику (гравитация, трение)
     b. Обновить позицию мяча
     c. Проверить коллизии со стенами
     d. Проверить, попал ли в корзину
     e. Обновить состояние мяча
  3. Отправить game_state_update всем игрокам

Client:
  1. Получить game_state_update
  2. Обновить состояние UI
  3. Перерисовать canvas
```

### 3. Действие игрока (Бросание)

```
Client                          Server
  │                               │
  ├─ handleCanvasClick()          │
  │                               │
  ├─ emit('shoot_start')  ───────>│
  │  { angle }                     │
  │                         <──────┤─ Calculate velocity
  │                               │
  │<──────────────── emit('shoot_started')
  │  { socketId, angle, speed }   │
  │                                │
  ├─ emit('ball_state') ─────────>│
  │  { x, y, vx, vy, state }      │
  │                         <──────┤─ Update ball physics
  │                                │
  │<──────────────── emit('ball_updated')
  │  { x, y, vx, vy, state }      │
  │                                │
  │         [Каждые 50ms]          │
  │<──────────────── emit('game_state_update')
  │  { players, ball }             │
  │                                │
```

### 4. Попадание в корзину

```
Server (в game loop):
  1. Проверить если мяч близко к корзине
  2. ball.state = 'in_basket'
  3. Найти игрока, который бросил
  4. Увеличить его score на 100
  5. Увеличить его kills на 1
  6. Отправить score_changed событие

Client:
  1. Получить score_changed
  2. Обновить leaderboard
  3. Показать визуальный эффект (опционально)
```

## 💾 Структуры данных

### GameRoom
```typescript
{
  roomId: string;           // "game-room-123"
  players: Map<socketId, PlayerState>;
  ball: BallState;
  lastUpdateTime: number;   // timestamp
  createdAt: number;        // timestamp
  ballBody: PhysicsBody;    // (Advanced only)
}
```

### PlayerState
```typescript
{
  index: number;            // 0, 1, 2, ...
  x: number;               // 0-800
  y: number;               // 0-600
  status: 'alive' | 'eliminated';
  score: number;
  kills: number;
  socketId: string;
  lastUpdate: number;      // timestamp
}
```

### BallState
```typescript
{
  x: number;               // 0-800
  y: number;               // 0-600
  vx: number;             // pixels/sec
  vy: number;             // pixels/sec
  state: 'idle' | 'flying' | 'in_basket';
  lastUpdatedBy?: string; // socketId
  lastUpdatedAt: number;  // timestamp
}
```

### PhysicsBody (Advanced)
```typescript
{
  position: Vector2;       // {x, y}
  velocity: Vector2;       // {vx, vy}
  acceleration: Vector2;   // {ax, ay}
  radius: number;
  mass: number;           // kg
}
```

## 🎯 Event List

### Клиент → Сервер (Sent by client)

| Event | Payload | Description |
|-------|---------|-------------|
| `join_game` | `{roomId, playerIndex, x, y}` | Присоединиться к комнате |
| `player_move` | `{index, x, y, status}` | Обновить позицию |
| `shoot_start` | `{index, angle}` | Начать бросание |
| `ball_state` | `{x, y, vx, vy, state}` | Обновить состояние мяча |
| `player_eliminated` | `{index}` | Исключить игрока |
| `score_updated` | `{index, score, kills}` | Обновить счёт |
| `debug_rooms` | `{}` | Получить список комнат |

### Сервер → Клиент (Broadcast from server)

| Event | Payload | Frequency |
|-------|---------|-----------|
| `game_state_update` | `{players[], ball, timestamp}` | 50ms |
| `player_moved` | `{socketId, playerIndex, x, y, status}` | Per event |
| `shoot_started` | `{socketId, playerIndex, angle, timestamp}` | Per event |
| `ball_updated` | `{x, y, vx, vy, state, timestamp}` | Per event |
| `player_was_eliminated` | `{socketId, playerIndex, timestamp}` | Per event |
| `score_changed` | `{socketId, playerIndex, score, kills, timestamp}` | Per event |
| `player_joined` | `{socketId, playerIndex, totalPlayers}` | Per event |
| `player_disconnected` | `{socketId, playerIndex}` | Per event |
| `room_state` | `{players[], ball, config}` | On join |
| `debug_rooms_info` | `[{roomId, playerCount}]` | On request |

## 🎮 Game Loop Implementation

```typescript
function startGameLoop(io, roomId) {
  const interval = setInterval(() => {
    const room = gameRooms.get(roomId);
    if (!room) {
      clearInterval(interval);
      return;
    }

    const now = Date.now();
    const deltaTime = (now - room.lastUpdateTime) / 1000;

    // ⚽ Update ball physics
    if (room.ball.state === 'flying') {
      // 1. Apply forces (gravity)
      applyGravity(room.ballBody, deltaTime);

      // 2. Update velocity
      room.ballBody.velocity.y += 9.8 * deltaTime;
      room.ballBody.velocity.x *= 0.99; // friction

      // 3. Update position
      room.ballBody.position.x += room.ballBody.velocity.x * deltaTime;
      room.ballBody.position.y += room.ballBody.velocity.y * deltaTime;

      // 4. Boundary checks
      const { collided, normal } = checkBoundaryCollision(...);
      if (collided) {
        bounceFromNormal(room.ballBody.velocity, normal);
      }

      // 5. Check basket
      if (isInBasket(room.ballBody.position, ...)) {
        room.ball.state = 'in_basket';
        // Award points...
      }

      // Sync with ball state
      room.ball.x = room.ballBody.position.x;
      room.ball.y = room.ballBody.position.y;
    }

    // 📡 Broadcast to all players
    io.to(roomId).emit('game_state_update', {
      players: Array.from(room.players.values()),
      ball: room.ball,
      timestamp: now,
    });

    room.lastUpdateTime = now;
  }, 50); // Every 50ms
}
```

## 🔍 Debugging

### Логирование в консоли сервера

```
[Socket.IO] Client connected: socket_abc123
[Socket.IO] Player 0 joined room game-room-123
[Socket.IO] Starting game loop for room game-room-123
[Socket.IO] Client disconnected: socket_abc123
[Socket.IO] Room game-room-123 cleaned up (empty)
```

### Логирование в консоли браузера

```javascript
// В DevTools
socket.on('game_state_update', (data) => {
  console.log('⚽ Ball:', data.ball);
  console.log('👥 Players:', data.players);
});
```

## 📊 Performance Metrics

| Metric | Value | Notes |
|--------|-------|-------|
| Update Frequency | 50ms | 20 updates/sec |
| Network Latency | ~50-100ms | Зависит от сети |
| Physics Calculations | <5ms | Per update |
| Memory per Room | ~1-5MB | 10 игроков |
| CPU Usage | ~2-5% | 10 комнат × 10 игроков |

## 🚀 Optimization Tips

1. **Уменьшить UPDATE_INTERVAL** для большей отзывчивости (но больше нагрузка)
2. **Увеличить UPDATE_INTERVAL** для меньшей нагрузки (но меньше плавность)
3. **Использовать WebSocket** вместо Polling для более низкой задержки
4. **Redis Adapter** для масштабирования на несколько серверов
5. **Client-side Prediction** для более плавного движения
6. **Quantize Data** (отправлять координаты как int вместо float)

## 🔐 Security Considerations

1. **Валидация входных данных** - проверить что x, y в пределах суда
2. **Rate Limiting** - ограничить частоту событий от клиента
3. **Server Authority** - сервер всегда принимает решение по физике
4. **Cheat Detection** - проверить неправдоподобные scores/speeds

## 📚 Дополнительно

- [Socket.IO Docs](https://socket.io/docs/)
- [Canvas API Docs](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
- [Game Physics Basics](https://en.wikipedia.org/wiki/Video_game_physics)
