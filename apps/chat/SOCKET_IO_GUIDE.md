# Socket.IO Real-Time Game Server

## Overview

Socket.IO сервер для реал-тайм игры в приложении chat. Поддерживает:
- Синхронизацию движения игроков с **интерполяцией и dead reckoning**
- Бросание мяча и физику
- Отслеживание попаданий и выбиваний
- Обновление счёта в реальном времени
- Состояние игровой комнаты с интервалом 50ms
- **Контрольные точки траектории мяча** для гладкого полета
- **Плавное движение игроков** между пакетами обновления

## Структура

```
apps/chat/src/
├── socketServer.ts           # Основной Socket.IO сервер
├── hooks/
│   └── useGameSocket.ts      # React хук для подключения
├── components/
│   └── GameCanvas.tsx        # Визуализация игры
└── app/
    ├── api/socket.ts         # Next.js API route инициализация
    └── game/page.tsx         # Страница с игрой
```

## Запуск

### 1. Установить зависимости
```bash
npm install socket.io socket.io-client
```

### 2. Запустить chat приложение на порту 3011
```bash
npm run chat
```

Socket.IO будет доступен на `http://localhost:3011/`

### 3. Открыть игру
```
http://localhost:3011/game?room=game-room-123&player=0
http://localhost:3011/game?room=game-room-123&player=1
```

Разные игроки в одной комнате будут синхронизированы.

## API Events

### Client → Server Events

#### `join_game`
Присоединить игрока к комнате
```typescript
socket.emit('join_game', {
  roomId: string;      // ID игровой комнаты
  playerIndex: number; // Индекс игрока (0-N)
  x: number;          // Начальная X позиция
  y: number;          // Начальная Y позиция
});
```

#### `player_move`
Обновить позицию игрока
```typescript
socket.emit('player_move', {
  index: number;                         // Индекс игрока
  x: number;                            // X позиция
  y: number;                            // Y позиция
  status: 'alive' | 'eliminated';       // Статус
});
```

#### `shoot_start`
Начать бросание мяча
```typescript
socket.emit('shoot_start', {
  index: number;  // Индекс игрока
  angle: number;  // Угол в радианах
});
```

#### `ball_state`
Обновить состояние мяча
```typescript
socket.emit('ball_state', {
  x: number;                                  // X позиция
  y: number;                                  // Y позиция
  vx: number;                                 // Скорость X
  vy: number;                                 // Скорость Y
  state: 'idle' | 'flying' | 'in_basket';    // Статус мяча
});
```

#### `player_eliminated`
Исключить игрока из игры
```typescript
socket.emit('player_eliminated', {
  index: number;  // Индекс игрока
});
```

#### `score_updated`
Обновить счёт игрока
```typescript
socket.emit('score_updated', {
  index: number;  // Индекс игрока
  score: number;  // Общий счёт
  kills: number;  // Количество попаданий/выбиваний
});
```

### Server → Client Events

#### `game_state_update`
Полное состояние игры (отправляется каждые 50ms)
```typescript
socket.on('game_state_update', (data) => {
  data.players: Array<{
    index: number;
    x: number;
    y: number;
    status: 'alive' | 'eliminated';
    score?: number;
    kills?: number;
  }>;
  data.ball: {
    x: number;
    y: number;
    vx: number;
    vy: number;
    state: 'idle' | 'flying' | 'in_basket';
  };
  data.timestamp: number;
});
```

#### `player_moved`
Игрок переместился
```typescript
socket.on('player_moved', (data) => {
  data.socketId: string;
  data.playerIndex: number;
  data.x: number;
  data.y: number;
  data.status: 'alive' | 'eliminated';
});
```

#### `shoot_started`
Игрок начал бросание
```typescript
socket.on('shoot_started', (data) => {
  data.socketId: string;
  data.playerIndex: number;
  data.angle: number;
  data.timestamp: number;
});
```

#### `ball_updated`
Мяч обновился
```typescript
socket.on('ball_updated', (data) => {
  data.x: number;
  data.y: number;
  data.vx: number;
  data.vy: number;
  data.state: 'idle' | 'flying' | 'in_basket';
  data.timestamp: number;
});
```

#### `player_was_eliminated`
Игрок был исключён
```typescript
socket.on('player_was_eliminated', (data) => {
  data.socketId: string;
  data.playerIndex: number;
  data.timestamp: number;
});
```

#### `score_changed`
Счёт изменился
```typescript
socket.on('score_changed', (data) => {
  data.socketId: string;
  data.playerIndex: number;
  data.score: number;
  data.kills: number;
  data.timestamp: number;
});
```

#### `player_joined`
Игрок присоединился
```typescript
socket.on('player_joined', (data) => {
  data.socketId: string;
  data.playerIndex: number;
  data.x: number;
  data.y: number;
  data.totalPlayers: number;
});
```

#### `player_disconnected`
Игрок отключился
```typescript
socket.on('player_disconnected', (data) => {
  data.socketId: string;
  data.playerIndex?: number;
});
```

## React Hook Usage

```typescript
import { useGameSocket } from '@/hooks/useGameSocket';

function MyGameComponent() {
  const {
    socket,
    isConnected,
    emitPlayerMove,
    emitShootStart,
    emitBallState,
    emitPlayerEliminated,
    emitScoreUpdate,
  } = useGameSocket({
    roomId: 'game-room-123',
    playerIndex: 0,
    initialX: 100,
    initialY: 500,
    onGameStateUpdate: (data) => {
      // Обновить состояние UI
    },
    onPlayerMoved: (data) => {
      // Обновить позицию другого игрока
    },
    // ... другие обработчики
  });

  // Использование
  const handleMove = (x: number, y: number) => {
    emitPlayerMove(x, y, 'alive');
  };

  const handleShoot = (angle: number) => {
    emitShootStart(angle);
  };
}
```

## Game Loop

Сервер отправляет полное состояние игры (`game_state_update`) каждые **50ms** всем игрокам в комнате:

```typescript
setInterval(() => {
  io.to(roomId).emit('game_state_update', {
    players: [...],
    ball: {...},
    timestamp: Date.now()
  });
}, 50); // 50ms = 20 updates per second
```

### Физика мяча

При состоянии `flying` применяется простая физика:
- Гравитация: `vy += 9.8 * deltaTime`
- Движение: `x += vx * deltaTime`, `y += vy * deltaTime`
- При выходе за границы (y > 600): сброс в начальную позицию

## Примеры использования

### Присоединение к игре
```typescript
const { socket } = useGameSocket({
  roomId: 'game-room-123',
  playerIndex: 0,
  initialX: 100,
  initialY: 500,
});
```

### Отправка движения
```typescript
emitPlayerMove(150, 480, 'alive');
```

### Отправка бросания
```typescript
const angle = Math.atan2(targetY - playerY, targetX - playerX);
emitShootStart(angle);
emitBallState(playerX, playerY, Math.cos(angle) * 300, Math.sin(angle) * 300, 'flying');
```

### Обновление счёта
```typescript
emitScoreUpdate(100, 5); // score: 100, kills: 5
```

## Отладка

### Включить логирование в консоли браузера
```typescript
const socket = useGameSocket({
  // ...
  onGameStateUpdate: (data) => {
    console.log('Game state:', data);
  },
});
```

### Проверить активные комнаты
```typescript
socket.emit('debug_rooms');
socket.on('debug_rooms_info', (info) => {
  console.log('Active rooms:', info);
});
```

## Производительность

- **Обновление состояния**: каждые 50ms (20 updates/sec)
- **Поддержка игроков**: до 10+ одновременных игроков в комнате
- **Задержка**: ~50-100ms (зависит от сетевых условий)
- **Скейлинг**: используйте Redis adapter для масштабирования на несколько серверов

## Roadmap

- [ ] Redis adapter для мультисерверного масштабирования
- [ ] Коллизии между игроками
- [ ] Звуковые эффекты
- [ ] Визуализация траектории броска
- [ ] Реплей записи игр
- [ ] Турниры и рейтинговая система
