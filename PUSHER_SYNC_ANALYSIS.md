# 🔄 PUSHER SYNCHRONIZATION — ПОЛНЫЙ АНАЛИЗ

**Дата**: 2026-04-27  
**Компонент**: `RucheekGameCanvas.tsx`  
**Статус**: ✅ ПОЛНОСТЬЮ ИНТЕГРИРОВАН

---

## 📡 АРХИТЕКТУРА СИНХРОНИЗАЦИИ

```
┌─────────────────────────────────────────────────────────────┐
│ PUSHER REALTIME SYNCHRONIZATION FOR RUCHEEK GAME             │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Player A (localhost)              Player B (Vercel/Remote) │
│  ┌──────────────────┐              ┌──────────────────┐    │
│  │ Local Game State │──emit──>     │ Remote Game View │    │
│  │                  │  player-move │                  │    │
│  │                  │  player-join │                  │    │
│  │                  │  shot-done   │                  │    │
│  └──────────────────┘              └──────────────────┘    │
│         ↑                                       │             │
│         └<──── Pusher Channel ─────────────────┘             │
│              game-${gameRoomId}                              │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 СОБЫТИЯ PUSHER (EVENTS)

### 1️⃣ `player-joined` — Новый игрок присоединился
**Где отправляется**:
- `handleAddPlayer()` → `/api/pusher/join` (line 2712)

**Данные**:
```typescript
{
  room: gameRoomId,
  playerId: playerIdRef.current,
  playerIndex: idx,
  nickname: name,
  order: assignedOrder,      // Global order from server
  x: newPlayer.x,
  y: newPlayer.y,
  color: newPlayer.color,
}
```

**Где получается**:
- `channel.bind('player-joined', ...)` (line 115)
- Добавляет нового игрока в `remotePlayersRef`
- Показывает сообщение: "✅ {nickname} присоединився!"

**Примечание**: Нормализует playerId перед добавлением (удаляет Pusher суфиксы `_sub_X`)

---

### 2️⃣ `player-move` — Игрок переместился или выпустил мяч
**Где отправляется**:
- `emitPlayerPosition()` (line 2576) → `/api/pusher` (line 2585)
- Отправляется **для каждого живого игрока** на сервер
- **Частота**: Каждый frame (в рендер loop)

**Данные**:
```typescript
{
  room: gameRoomId,
  playerId: playerIdRef.current + `_${idx}`,  // Добавляет индекс игрока
  x: myPlayer.x,
  y: myPlayer.y,
  name: myPlayer.name,
  score: myPlayer.score,
  status: myPlayer.status,        // 'idle', 'running', 'shooting', 'eliminated'
  ball: {                         // Если мяч в полете
    x: ball.x,
    y: ball.y,
    vx: ball.vx,                  // Velocity X
    vy: ball.vy,                  // Velocity Y
    rot: ball.rot,                // Rotation
    state: ball.state             // 'flying', 'scored', 'missed'
  } || null
}
```

**Где получается**:
- `channel.bind('player-move', ...)` (line 155)
- Обновляет позицию в `remotePlayersRef`
- Отображает удаленного игрока на canvas с мячом

**Примечание**: Нормализует playerId перед обновлением

---

### 3️⃣ `player-leave` — Игрок вышел из игры
**Где отправляется**:
- `useEffect cleanup` → `/api/pusher` с `action: 'leave'` (line 218-226)
- Когда компонент размонтируется или игрок выходит

**Данные**:
```typescript
{
  room: gameRoomId,
  playerId: playerIdRef.current,
  action: 'leave'
}
```

**Где получается**:
- `channel.bind('player-leave', ...)` (line 184)
- Удаляет игрока из `remotePlayersRef`
- Игрок исчезает с экрана

---

### 4️⃣ `shot-completed` — Игрок забил/промахнулся
**Где отправляется**:
- `handleScored()` → `/api/pusher/shot` (line 1425)
- Только для игрока индекса 0 (первого, локального)

**Данные**:
```typescript
{
  room: gameRoomId,
  playerId: playerIdRef.current,
  playerIndex: idx,
  nickname: p.name || userName || 'Player',
  shotScore: 1,
  accuracy: ss.accuracy || 0,    // 0-100%
  collisionType: 'swish'
}
```

**Где получается**:
- `channel.bind('shot-completed', ...)` (line 190)
- Обновляет leaderboard (gsRef.current.leaderboard)
- Показывает сообщение: "⚽ {nickname}: {score}pts ({accuracy}%)"

---

## 📥 ИНИЦИАЛИЗАЦИЯ PUSHER

**Где**: `useEffect` (line 102-233)

```typescript
const pusherClient = new Pusher(
  process.env.NEXT_PUBLIC_PUSHER_KEY!,
  { cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER! }
);

const channel = pusherClient.subscribe(`game-${gameRoomId}`);

// Bind 4 events
channel.bind('player-joined', ...);
channel.bind('player-move', ...);
channel.bind('player-leave', ...);
channel.bind('shot-completed', ...);

// Cleanup on unmount
return () => {
  channel.unbind_all();
  pusherClient.unsubscribe(`game-${gameRoomId}`);
}
```

**Канал**: `game-${gameRoomId}`  
Пример: `game-general`, `game-room1`, `game-test_ghost`

---

## 🔄 ДАННЫЕ НА ЛОКАЛЬНОМ ХРАНИЛИЩЕ

Что **НЕ** синхронизируется через Pusher:
- Полная игра `gs` (game state)
- Все стрелки мяча (trajectories)
- Все фазы aiming/charging
- Порядок очередности

**Почему?**
- `gs` слишком большой (~2MB в памяти)
- Изменяется каждый frame
- Локальные вычисления (physics)

**Что ЕСТЬ в localStorage**:
- Полное состояние игры (для F5 recovery)
- Порядок выбывания (для новой игры)

**Синхронизируется**:
- ✅ Позиция игрока (x, y)
- ✅ Статус игрока (idle, running, shooting)
- ✅ Мяч (если летит/в полёте)
- ✅ Скор игрока
- ✅ События (join, leave, shot)

---

## 📊 ПОТОК ДАННЫХ (EXAMPLE)

### Сценарий: 2 игрока, Player1 бросает

**Шаг 1**: Player1 добавлен
```
Player1 → POST /api/pusher/join
          {playerId: "p1", nickname: "Player1", x: 680, ...}
          ↓
          Pusher broadcast: 'player-joined' event
          ↓
          Player2 получает и добавляет в remotePlayersRef
          ↓
          Player2 видит на canvas: "Player1" с номером 1
```

**Шаг 2**: Player2 добавлен
```
Player2 → POST /api/pusher/join
          {playerId: "p2", nickname: "Player2", x: 738, ...}
          ↓
          Pusher broadcast: 'player-joined' event
          ↓
          Player1 получает и видит Player2 на canvas
```

**Шаг 3**: Player1 выпускает мяч
```
Player1 → launchBall()
          emitPlayerPosition() каждый frame
          ↓
          POST /api/pusher
          {playerId: "p1", x: 680, y: 544, ball: {x, y, vx, vy, ...}}
          ↓
          Pusher broadcast: 'player-move' event
          ↓
          Player2 получает и видит:
          - Player1 в позиции (680, 544)
          - Мяч летит к хупу
```

**Шаг 4**: Player1 забивает
```
Player1 → handleScored()
          POST /api/pusher/shot
          {playerId: "p1", shotScore: 1, accuracy: 95}
          ↓
          Pusher broadcast: 'shot-completed' event
          ↓
          Player2 получает и видит:
          - Сообщение: "⚽ Player1: 1pts (95%)"
          - Leaderboard обновлен
```

---

## 🎯 RUCHEEK GAME SYNC

**НОВОЕ** для Rucheek (по плану):
Сейчас передается:
- ✅ Позиции игроков
- ✅ Статусы (idle, running, shooting)
- ✅ Мяч (полет, скорость)
- ✅ События (join, leave, shot)

**ТРЕБУЕТСЯ добавить** (для полной синхронизации прав):
```
// Новое событие: turn-passed
{
  room: gameRoomId,
  playerId: currentPlayerId,
  nextPlayerId: nextPlayerGetRight,
  hasActiveRight: true/false,
  timestamp: Date.now()
}

// Новое событие: player-eliminated
{
  room: gameRoomId,
  playerId: eliminatedPlayerId,
  reason: "knocked_out",
  timestamp: Date.now()
}

// Новое событие: game-completed
{
  room: gameRoomId,
  winnerId: winnerPlayerId,
  winners hp: 10,
  timestamp: Date.now()
}
```

---

## 🔧 API ENDPOINTS (BACKEND)

### POST /api/pusher/join
**Отправляет**: `player-joined` событие в канал  
**Получает**: playerIndex, nickname, x, y, order  
**Эффект**: Все видят нового игрока

### POST /api/pusher (player-move)
**Отправляет**: `player-move` событие в канал  
**Получает**: x, y, status, ball, score  
**Эффект**: Все видят движение и мяч

### POST /api/pusher (leave)
**Отправляет**: `player-leave` событие в канал  
**Получает**: action: 'leave'  
**Эффект**: Игрок исчезает с экранов

### POST /api/pusher/shot
**Отправляет**: `shot-completed` событие в канал  
**Получает**: shotScore, accuracy, nickname  
**Эффект**: Все видят результат выстрела

---

## ⚠️ ИЗВЕСТНЫЕ ОГРАНИЧЕНИЯ

1. **Позиции не синхронизируются для дополнительных игроков** (только индекс 0)
   - `emitPlayerPosition()` отправляет ВСЕХ игроков локального клиента
   - Но получается только от игроков других клиентов
   - **Решение**: Каждый клиент отправляет своих игроков

2. **Game state НЕ синхронизируется**
   - `hasActiveRight`, `hasThrown`, `isEliminated` локальные!
   - Другие игроки их НЕ видят
   - **Проблема**: Мигание номера видно только локально

3. **Права и выбивания НЕ синхронизируются**
   - Нужны новые события (turn-passed, player-eliminated, game-completed)
   - **Требуется**: Добавить эти события для полной синхронизации Rucheek

---

## ✅ ЧТО СИНХРОНИЗИРУЕТСЯ СЕЙЧАС

| Данные | Синхро? | Частота | Комментарий |
|--------|---------|---------|------------|
| Позиция (x, y) | ✅ | Каждый frame | player-move |
| Статус | ✅ | Каждый frame | player-move |
| Мяч (полет) | ✅ | Каждый frame | player-move |
| Скор | ✅ | После гола | player-move + shot |
| Join/Leave | ✅ | При входе/выходе | player-joined/leave |
| Shot event | ✅ | После забива | shot-completed |
| **hasActiveRight** | ❌ | --- | **ТРЕБУЕТСЯ** |
| **hasThrown** | ❌ | --- | **ТРЕБУЕТСЯ** |
| **isEliminated** | ❌ | --- | **ТРЕБУЕТСЯ** |
| **Порядок выб.** | ❌ | --- | **ТРЕБУЕТСЯ** |

---

## 🚀 PLAN: ПОЛНАЯ СИНХРОНИЗАЦИЯ RUCHEEK

### Что добавить:

**1. Событие: turn-passed**
```typescript
// При launchBall():
fetch('/api/pusher/turn', {
  method: 'POST',
  body: JSON.stringify({
    room: gameRoomId,
    currentPlayerId: playerIdRef.current,
    nextPlayerId: nextPlayer.playerId,
    hasActiveRight: true/false
  })
});

// На приеме:
channel.bind('turn-passed', (data) => {
  remotePlayersRef.current.forEach(rp => {
    if (rp.playerId === data.currentPlayerId) 
      rp.hasActiveRight = false;
    if (rp.playerId === data.nextPlayerId) 
      rp.hasActiveRight = true;
  });
});
```

**2. Событие: player-eliminated**
```typescript
// При handleScored():
fetch('/api/pusher/eliminated', {
  method: 'POST',
  body: JSON.stringify({
    room: gameRoomId,
    playerId: eliminatedPlayerId,
    eliminatedBy: currentPlayerId
  })
});

// На приеме:
channel.bind('player-eliminated', (data) => {
  remotePlayersRef.current.forEach(rp => {
    if (rp.playerId === data.playerId)
      rp.isEliminated = true;
  });
});
```

**3. Событие: game-completed**
```typescript
// При завершении игры:
fetch('/api/pusher/game-end', {
  method: 'POST',
  body: JSON.stringify({
    room: gameRoomId,
    winnerId: winner.playerId,
    eliminationOrder: eliminationOrderRef.current
  })
});

// На приеме:
channel.bind('game-completed', (data) => {
  gs.state = 'finished';
  gs.winner = data.winnerId;
});
```

---

## 📝 SUMMARY

**Текущее состояние**:
- ✅ Позиции синхронизируются
- ✅ События join/leave/shot работают
- ✅ Мяч видно в полете
- ❌ Права (hasActiveRight) НЕ синхронизируются
- ❌ Выбивание (isEliminated) НЕ видно для других
- ❌ Порядок очередности НЕ синхронизируется

**Для полной Rucheek синхронизации**:
Нужны 3 новых события (turn-passed, player-eliminated, game-completed) с API endpoints на бэке.

**Время реализации**: ~2 часа (если нужна полная версия)

**Приоритет**: СРЕДНИЙ (сейчас игра работает локально + отправляет позиции)
