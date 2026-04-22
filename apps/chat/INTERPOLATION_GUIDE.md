# 🎯 Интерполяция и Dead Reckoning для мультиплеера

##概览 (Обзор)

Для плавного движения игроков в условиях сетевой задержки используется комбинация:
1. **Линейная интерполяция** между полученными пакетами
2. **Dead Reckoning** (мертвая точка рекона) для экстраполяции движения
3. **Контрольные точки траектории** мяча для гладкого полета

---

## 📊 Архитектура

### Хранение состояния удаленного игрока

```javascript
remotePlayerStates[socketId] = {
  // Идентификация
  playerIndex: 0,           // индекс игрока (0-5)
  socketId: "abc123",       // Socket.IO ID

  // Позиция: интерполяция между старой и новой
  x: 400, y: 500,           // ТЕКУЩАЯ синхронизированная позиция
  prevX: 380, prevY: 490,   // ПРЕДЫДУЩАЯ позиция (для интерполяции)
  vx: 50, vy: 10,           // СКОРОСТЬ (dead reckoning)

  // Временная информация
  lastUpdate: 1234567890,   // timestamp последнего обновления
  updateInterpolationAlpha: 0.5, // 0-1: прогрес интерполяции (0=prevX/Y, 1=x/y)

  // Отрисовка
  displayX: 390, displayY: 495, // интерполированная позиция для рисования

  // Состояние игры
  status: 'alive' | 'running' | 'shooting' | 'eliminated',
  shootPhase: null | 'aiming' | 'charging' | 'flying',
  aimAngle: -1.57,
  power: 45,
  score: 10,
  kills: 2,

  // Состояние мяча
  ball: {
    x: 200, y: 300,
    vx: 5, vy: -2,
    state: 'flying',
    lastUpdate: timestamp,
    controlPoints: [           // Контрольные точки для интерполяции траектории
      {x: 195, y: 310, vx: 5, vy: -1.5, t: timestamp-50},
      {x: 200, y: 300, vx: 5, vy: -2, t: timestamp}
    ]
  },

  color: '#4fc3f7'
};
```

---

## 🔄 Процесс обновления

### 1️⃣ Получение пакета `player_moved`

```javascript
socket.on('player_moved', (data) => {
  // data: {socketId, playerIndex, x, y, status, timestamp}

  // Сохраняем СТАРУЮ позицию как prevX/Y для интерполяции
  state.prevX = state.x;
  state.prevY = state.y;

  // Вычисляем СКОРОСТЬ через dead reckoning
  const dt = (Date.now() - state.lastUpdate) / 1000;  // в секундах
  state.vx = (data.x - state.x) / dt;
  state.vy = (data.y - state.y) / dt;

  // Обновляем текущую позицию
  state.x = data.x;
  state.y = data.y;

  // Сбрасываем интерполяцию (начинаем с 0)
  state.updateInterpolationAlpha = 0;
  state.lastUpdate = Date.now();
});
```

### 2️⃣ Обновление интерполяции в `update()`

```javascript
function updateRemotePlayerInterpolation() {
  const now = Date.now();
  const updateInterval = 50; // ms (сервер отправляет каждые 50ms)

  Object.values(remotePlayerStates).forEach(state => {
    const timeSinceUpdate = now - state.lastUpdate;

    if (timeSinceUpdate < updateInterval) {
      // === ФАЗА 1: Интерполяция между пакетами ===
      // Плавное движение от prevX/Y к x/y
      state.updateInterpolationAlpha = Math.min(1, timeSinceUpdate / updateInterval);
      const a = state.updateInterpolationAlpha;

      state.displayX = state.prevX + a * (state.x - state.prevX);
      state.displayY = state.prevY + a * (state.y - state.prevY);
    } else {
      // === ФАЗА 2: Dead Reckoning (экстраполяция) ===
      // После интервала обновления предполагаем, что игрок продолжает двигаться
      const extraTime = (timeSinceUpdate - updateInterval) / 1000;

      state.displayX = state.x + state.vx * extraTime * 0.5; // 0.5 = затухание
      state.displayY = state.y + state.vy * extraTime * 0.5;
      state.updateInterpolationAlpha = 1;
    }
  });
}
```

### 3️⃣ Отрисовка интерполированной позиции

```javascript
function draw() {
  Object.entries(remotePlayerStates).forEach(([socketId, rState]) => {
    // Используем displayX/Y (интерполированная позиция)
    drawStick(rState.displayX, rState.displayY, pose, 0, false, color);
  });
}
```

---

## ⚽ Интерполяция мяча (Ball Trajectory)

### Контрольные точки (Control Points)

**Сервер отправляет:**
```javascript
io.to(roomId).emit('game_state_update', {
  ball: {x, y, vx, vy, state},
  ballControlPoints: [
    {x: 200, y: 300, vx: 5, vy: -2, t: 1000},
    {x: 205, y: 295, vx: 5, vy: -3, t: 1050},
    {x: 210, y: 288, vx: 5, vy: -4, t: 1100}
  ],
  timestamp: now
});
```

**Клиент хранит контрольные точки:**
```javascript
state.ball.controlPoints = [
  {x: 200, y: 300, vx: 5, vy: -2, t: 1000},
  {x: 205, y: 295, vx: 5, vy: -3, t: 1050},
  {x: 210, y: 288, vx: 5, vy: -4, t: 1100}
];
```

### Интерполяция позиции мяча

```javascript
function getInterpolatedBallPosition(ballState, now) {
  const pts = ballState.controlPoints;
  if (!pts || pts.length === 0) return {x: ballState.x, y: ballState.y};

  // Найдем две соседние контрольные точки
  for (let i = 0; i < pts.length - 1; i++) {
    const t0 = pts[i].t;
    const t1 = pts[i + 1].t;

    if (now >= t0 && now <= t1) {
      // Линейная интерполяция между двумя точками
      const a = (now - t0) / (t1 - t0);  // 0-1: прогрес между точками
      return {
        x: pts[i].x + a * (pts[i + 1].x - pts[i].x),
        y: pts[i].y + a * (pts[i + 1].y - pts[i].y)
      };
    }
  }

  // После последней точки: экстраполируем по скорости
  const last = pts[pts.length - 1];
  const extraTime = (now - last.t) / 1000;
  return {
    x: last.x + last.vx * extraTime,
    y: last.y + last.vy * extraTime
  };
}
```

---

## 🎮 Диаграмма временной шкалы

```
Сервер отправляет пакеты каждые 50ms:
────────────────────────────────────────────────
│ t=0     t=50    t=100   t=150   t=200
│ PKT#1   PKT#2   PKT#3   PKT#4   PKT#5
└────────────────────────────────────────────────

Клиент получает (с задержкой ~30-50ms):
────────────────────────────────────────────────
│         t=30    t=80    t=130   t=180
│         PKT#1   PKT#2   PKT#3   PKT#4
└────────────────────────────────────────────────

Клиент интерполирует:
  t=0-50:     linearly от prevX/Y → x/Y        (alpha: 0→1)
  t=50-100:   dead reckoning по vx/vy          (экстраполяция)
  t=100:      получен новый пакет → начнем сначала
```

---

## 📈 Сравнение методов синхронизации

| Метод | Плавность | Точность | Задержка | Сложность |
|-------|-----------|----------|----------|-----------|
| **Strict Sync** (телепортация) | ❌ Рывки | ✅ 100% | ❌ Видна | ⭐ |
| **Linear Interp** (плавно) | ✅ Отлично | ⚠️ ~95% | ✅ Скрыта | ⭐⭐ |
| **Dead Reckoning** (экстраполяция) | ✅ Отлично | ⚠️ ~90% | ✅ Скрыта | ⭐⭐ |
| **Dead Reck + Ball Points** (комбо) | ✅✅ Идеально | ✅ ~98% | ✅ Скрыта | ⭐⭐⭐ |

---

## 🔧 Параметры настройки

### В HTML клиенте (rucheyok-demo.html):

```javascript
// Интервал обновления сервера (ms)
const updateInterval = 50;  // 20 updates/sec

// Затухание при экстраполяции (0-1, где 1=полная скорость)
const extrapolationDamping = 0.5;

// Максимум контрольных точек для интерполяции траектории
const maxControlPoints = 5;
```

### На сервере (socketServerAdvanced.ts):

```typescript
export const SOCKET_CONFIG = {
  game: {
    updateInterval: 50, // ms - может менять на 33 (30fps) или 100 (10fps)
  }
};
```

---

## 🎯 Улучшения и расширения

### 1. Catmull-Rom сплайн для мяча (вместо линейного)

```javascript
// Вместо линейной интерполяции используем гладкий сплайн через 4 точки
function catmullRom(p0, p1, p2, p3, t) {
  const v0 = (p2 - p0) * 0.5;
  const v1 = (p3 - p1) * 0.5;
  const a = 3 * (p1 - p2) + v0 + v1;
  const b = 2 * (p2 - p1) - v0 - 2 * v1;
  return a * t * t * t + b * t * t + v0 * t + p1;
}
```

### 2. Адаптивная задержка (lag prediction)

```javascript
// Измеряем среднюю задержку пакетов и компенсируем
let packetLatencies = [];
let estimatedLag = 30; // ms

// При получении нового пакета записываем временную метку
// Анализируем разницу между отправкой сервера и получением клиентом
```

### 3. Коррекция при большой ошибке

```javascript
// Если игрок "телепортируется" (> 100px смещение), сбрасываем интерполяцию
const dx = state.x - state.prevX;
const dy = state.y - state.prevY;
if (Math.hypot(dx, dy) > 100) {
  // Не интерполируем, сразу телепортируемся (коррекция)
  state.displayX = state.x;
  state.displayY = state.y;
}
```

---

## 🧪 Тестирование

### Локально (один браузер):

```bash
# Откроем 2 вкладки одного браузера
Tab 1: http://localhost:3011/game?room=test&player=0
Tab 2: http://localhost:3011/game?room=test&player=1

# Добавим игроков и нажмем Старт
# Должны видеть удаленного игрока полупрозрачным
# Его движение должно быть плавным (интерполяция)
```

### С сетевой задержкой (Chrome DevTools):

```
DevTools → Network → Throttling → "Slow 3G" (400ms задержка)
Должна видеть, что интерполяция все еще работает плавно
```

### Диагностика:

```javascript
// В консоли браузера
Object.entries(remotePlayerStates).forEach(([id, state]) => {
  console.log(`Player ${state.playerIndex}:`, {
    pos: `(${state.displayX.toFixed(0)}, ${state.displayY.toFixed(0)})`,
    vel: `(${state.vx.toFixed(1)}, ${state.vy.toFixed(1)})`,
    alpha: state.updateInterpolationAlpha.toFixed(2),
    lastUpdate: Date.now() - state.lastUpdate + 'ms ago',
    ballPoints: state.ball?.controlPoints?.length ?? 0
  });
});
```

---

## 📚 Дополнительные ресурсы

- [Entity Interpolation (Valve's networking)](https://developer.valvesoftware.com/wiki/Entity_interpolation)
- [Dead Reckoning Wikipedia](https://en.wikipedia.org/wiki/Dead_reckoning)
- [Networking for Game Programmers (Glenn Fiedler)](https://www.gafferongames.com/post/networked_physics/)
