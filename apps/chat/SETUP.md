# Socket.IO Game Server — Setup & Usage

## 📦 Структура файлов

```
apps/chat/src/
├── socketServer.ts                  # Базовый Socket.IO сервер
├── socketServerAdvanced.ts          # Advanced версия с физикой
├── api/
│   └── socket.ts                    # Next.js API route для инициализации
├── config/
│   └── socket.config.ts             # Конфиг и константы
├── utils/
│   └── physics.ts                   # Физика мяча
├── hooks/
│   └── useGameSocket.ts             # React хук для подключения
├── components/
│   └── GameCanvas.tsx               # Компонент визуализации
└── app/
    └── game/
        └── page.tsx                 # Страница игры
```

## 🚀 Установка и запуск

### 1. Установить зависимости в корневой папке

```bash
cd D:\n8n\basket-lviv
npm install socket.io socket.io-client
```

**Или (если уже установлено):**
```bash
npm list socket.io
```

### 2. Запустить chat приложение на порту 3011

**Способ 1: Отдельно**
```bash
npm run chat
```

**Способ 2: Вместе с другими приложениями**
```bash
npm run portal
# или
npm run dev:all
```

### 3. Открыть в браузере

**Одиночная игра (тестирование):**
```
http://localhost:3011/game?room=game-room-123&player=0
```

**Мультиплеер (2 игрока в одной комнате):**
- Вкладка 1: `http://localhost:3011/game?room=game-room-123&player=0`
- Вкладка 2: `http://localhost:3011/game?room=game-room-123&player=1`

**Разные комнаты:**
- Вкладка 1: `http://localhost:3011/game?room=room-alpha&player=0`
- Вкладка 2: `http://localhost:3011/game?room=room-beta&player=0`

## 🎮 Использование

### Базовый Socket.IO сервер (socketServer.ts)

```typescript
// Используется в api/socket.ts
import { initializeSocket } from '@/socketServer';

export default function handler(req, res) {
  if (!res.socket.server.io) {
    const io = initializeSocket(res.socket.server);
    res.socket.server.io = io;
  }
  res.status(200).json({ ok: true });
}
```

**Особенности:**
- Базовая обработка событий игроков
- Простая синхронизация состояния
- Обновление каждые 50ms

### Advanced Socket.IO сервер (socketServerAdvanced.ts)

```typescript
// Для использования с физикой мяча
import { initializeSocketAdvanced } from '@/socketServerAdvanced';

export default function handler(req, res) {
  if (!res.socket.server.io) {
    const io = initializeSocketAdvanced(res.socket.server);
    res.socket.server.io = io;
  }
  res.status(200).json({ ok: true });
}
```

**Особенности:**
- Полная физика мяча (гравитация, трение, отскок)
- Коллизионное обнаружение
- Проверка попаданий в корзину
- Автоматическое начисление очков

## 📡 Events Reference

### Отправка с клиента → Сервер

```typescript
const { emitPlayerMove, emitShootStart, emitBallState, emitScoreUpdate } = useGameSocket({
  roomId: 'game-room-123',
  playerIndex: 0,
  initialX: 100,
  initialY: 500,
});

// Движение игрока
emitPlayerMove(200, 400, 'alive');

// Начать бросание (угол в радианах)
emitShootStart(Math.PI / 4); // 45°

// Обновить состояние мяча
emitBallState(200, 400, 100, -50, 'flying');

// Обновить счёт
emitScoreUpdate(100, 5); // score: 100, kills: 5
```

### Получение с сервера → Клиент

```typescript
useGameSocket({
  roomId: 'game-room-123',
  playerIndex: 0,
  initialX: 100,
  initialY: 500,
  
  // Получение полного состояния игры (каждые 50ms)
  onGameStateUpdate: (data) => {
    console.log('Players:', data.players);
    console.log('Ball:', data.ball);
  },
  
  // Другой игрок переместился
  onPlayerMoved: (data) => {
    console.log(`Player ${data.playerIndex} moved to ${data.x}, ${data.y}`);
  },
  
  // Игрок начал бросание
  onShootStarted: (data) => {
    console.log(`Player ${data.playerIndex} shooting at angle ${data.angle}`);
  },
  
  // Состояние мяча обновилось
  onBallUpdated: (data) => {
    console.log('Ball position:', data.x, data.y);
  },
  
  // Игрок исключен из игры
  onPlayerEliminated: (data) => {
    console.log(`Player ${data.playerIndex} eliminated`);
  },
  
  // Счёт изменился
  onScoreChanged: (data) => {
    console.log(`Player ${data.playerIndex} score: ${data.score}`);
  },
  
  // Новый игрок присоединился
  onPlayerJoined: (data) => {
    console.log(`Player ${data.playerIndex} joined (total: ${data.totalPlayers})`);
  },
  
  // Игрок отключился
  onPlayerDisconnected: (data) => {
    console.log(`Player disconnected`);
  },
});
```

## 🎯 Примеры использования

### Пример 1: Простая игра

```typescript
import { GameCanvas } from '@/components/GameCanvas';

export default function GamePage() {
  return (
    <GameCanvas 
      roomId="game-room-123" 
      playerIndex={0} 
      width={800} 
      height={600} 
    />
  );
}
```

### Пример 2: Кастомная реализация

```typescript
'use client';

import { useGameSocket } from '@/hooks/useGameSocket';
import { useState } from 'react';

export function CustomGame() {
  const [scores, setScores] = useState<Map<number, number>>(new Map());
  
  const { emitPlayerMove, emitShootStart } = useGameSocket({
    roomId: 'game-room-123',
    playerIndex: 0,
    initialX: 100,
    initialY: 500,
    
    onGameStateUpdate: (data) => {
      // Обновить состояние UI
      const scoreMap = new Map<number, number>();
      data.players.forEach((p) => {
        scoreMap.set(p.index, p.score);
      });
      setScores(scoreMap);
    },
  });

  const handleMouseMove = (e: React.MouseEvent) => {
    emitPlayerMove(e.clientX, e.clientY, 'alive');
  };

  const handleShoot = () => {
    emitShootStart(Math.PI / 4);
  };

  return (
    <div onMouseMove={handleMouseMove}>
      <button onClick={handleShoot}>Shoot</button>
      <div>
        {Array.from(scores.entries()).map(([playerIndex, score]) => (
          <p key={playerIndex}>Player {playerIndex}: {score} pts</p>
        ))}
      </div>
    </div>
  );
}
```

### Пример 3: Турнир (мультиплеер)

```typescript
// Создать несколько комнат
const rooms = [
  'tournament-room-1',
  'tournament-room-2',
  'tournament-room-3',
];

rooms.forEach((roomId, index) => {
  // Каждая комната имеет 2-4 игроков
  for (let playerIdx = 0; playerIdx < 3; playerIdx++) {
    const playerNum = index * 3 + playerIdx;
    // window.open(`/game?room=${roomId}&player=${playerIdx}`);
  }
});
```

## 🔍 Отладка

### Включить логирование

В `src/config/socket.config.ts`:
```typescript
export const SOCKET_CONFIG = {
  performance: {
    logConnections: true,        // Логировать подключения
    logRoomUpdates: false,        // Логировать обновления комнаты
    debugMode: true,              // Режим отладки
  },
};
```

### Проверить активные комнаты

```typescript
const { socket } = useGameSocket({...});

// Отправить запрос отладки
socket?.emit('debug_rooms');

// Получить результат
socket?.on('debug_rooms_info', (info) => {
  console.log('Active rooms:', info);
  // [
  //   { roomId: 'game-room-123', playerCount: 2 },
  //   { roomId: 'room-alpha', playerCount: 1 },
  // ]
});
```

### Посмотреть статистику сервера

В `socketServerAdvanced.ts`:
```typescript
import { getGameStats } from '@/socketServerAdvanced';

// В API route или обработчике события
const stats = getGameStats();
console.log('Active rooms:', stats.activeRooms);
console.log('Total players:', stats.totalPlayers);
console.log('Rooms:', stats.rooms);
```

## 📊 Производительность

### Оптимизация

1. **Обновление состояния**: 50ms (20 updates/sec)
   - Можно увеличить до 100ms для снижения нагрузки
   - Или уменьшить до 30ms для большей отзывчивости

2. **Максимум игроков на комнату**: 10 (в конфиге)
   - Увеличить в `SOCKET_CONFIG.room.maxPlayersPerRoom`

3. **Физика**: включена в Advanced версии
   - Отключить в базовой версии для меньшей нагрузки

### Масштабирование

Для нескольких серверов используйте Redis adapter:

```bash
npm install @socket.io/redis-adapter redis
```

```typescript
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

const pubClient = createClient({ host: 'localhost', port: 6379 });
const subClient = pubClient.duplicate();

await Promise.all([pubClient.connect(), subClient.connect()]);

io.adapter(createAdapter(pubClient, subClient));
```

## 🐛 Возможные проблемы

### Socket не подключается

**Решение:**
1. Проверить что chat приложение запущено на порту 3011
2. Проверить CORS в конфиге
3. Очистить кэш браузера и перезагрузить

### Физика мяча ведет себя странно

**Решение:**
1. Проверить гравитацию в конфиге (GAME_CONSTANTS.GRAVITY)
2. Проверить коэффициент отскока (BOUNCE_COEFFICIENT)
3. Убедиться что используется Advanced версия сервера

### Задержки в синхронизации

**Решение:**
1. Уменьшить UPDATE_INTERVAL в конфиге (но это увеличит нагрузку)
2. Использовать WebSocket вместо polling
3. Проверить качество сетевого соединения

## 📚 Дополнительные ресурсы

- Socket.IO документация: https://socket.io/docs/v4/
- Physics concepts: https://en.wikipedia.org/wiki/Video_game_physics
- Canvas API: https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API

## ✅ Чек-лист

- [ ] Установлены зависимости (socket.io, socket.io-client)
- [ ] Запущено chat приложение на порту 3011
- [ ] Открыта игра в браузере
- [ ] Два игрока могут синхронизироваться в одной комнате
- [ ] Мяч физически движется правильно
- [ ] Попадание в корзину начисляет очки
- [ ] Счёт обновляется в реальном времени

**✨ Готово к использованию!**
