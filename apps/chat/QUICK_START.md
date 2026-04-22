# 🚀 Quick Start — Socket.IO Game Server

## 30 секунд для начала

### 1️⃣ Установить
```bash
npm install socket.io socket.io-client
```

### 2️⃣ Запустить
```bash
npm run chat
```

### 3️⃣ Открыть в браузере
```
http://localhost:3011/game?room=game-room-123&player=0
```

## ✅ Готово!

Откройте в разных вкладках/браузерах для мультиплеера:
- Вкладка 1: `?player=0`
- Вкладка 2: `?player=1`

---

## 📋 Что работает

- ✅ Движение игроков в реальном времени
- ✅ Бросание мяча с физикой
- ✅ Коллизионное обнаружение
- ✅ Автоматический скоринг
- ✅ Синхронизация каждые 50ms

---

## 🎮 Управление

| Действие | Как |
|----------|-----|
| Движение | Двигайте мышь |
| Бросание | Кликните на canvas |

---

## 📚 Документация

- **SETUP.md** — полная инструкция
- **SOCKET_IO_GUIDE.md** — API Reference
- **ARCHITECTURE.md** — как это работает
- **IMPLEMENTATION_SUMMARY.md** — что создано

---

## 🔧 Для разработчиков

### Использование React Hook

```typescript
import { useGameSocket } from '@/hooks/useGameSocket';

const { emitPlayerMove, emitShootStart } = useGameSocket({
  roomId: 'game-room-123',
  playerIndex: 0,
  initialX: 100,
  initialY: 500,
  onGameStateUpdate: (data) => {
    console.log(data.players, data.ball);
  },
});
```

### Emit события

```typescript
emitPlayerMove(x, y, 'alive');              // Движение
emitShootStart(Math.PI / 4);                // Бросание
emitScoreUpdate(100, 5);                    // Обновить счёт
```

---

## 🛠️ Переключение версии

Базовая версия (без физики):
```typescript
// В app/api/socket.ts
import { initializeSocket } from '@/socketServer';
```

Advanced версия (с физикой):
```typescript
// В app/api/socket.ts
import { initializeSocketAdvanced } from '@/socketServerAdvanced';
```

---

## 🐛 Отладка

```javascript
// В консоли браузера
socket.emit('debug_rooms');
socket.on('debug_rooms_info', console.log);
```

---

**✨ Наслаждайтесь реал-тайм игрой!**
