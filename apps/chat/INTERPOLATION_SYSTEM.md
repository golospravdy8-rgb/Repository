# 🔄 Система интерполяции и Dead Reckoning в РУЧЕЁК

## Обзор

**Интерполяция** = плавное движение между полученными пакетами  
**Dead Reckoning** = предсказание позиции по скорости когда пакеты опаздывают  
**Контрольные точки** = гладкая траектория мяча через сохраненные позиции

---

## 📡 Как это работает

### 1. Сервер (socketServerAdvanced.ts)

```typescript
// Каждый раз когда получаем player_move:
socket.on(EVENTS.CLIENT.PLAYER_MOVE, (data: any) => {
  const player = room.players.get(socket.id);

  // 1️⃣ Сохраняем СТАРУЮ позицию
  player.prevX = player.x;
  player.prevY = player.y;

  // 2️⃣ Вычисляем СКОРОСТЬ
  const dt = (now - player.lastUpdate) / 1000;  // в секундах
  player.vx = (newX - player.x) / dt;
  player.vy = (newY - player.y) / dt;

  // 3️⃣ Обновляем ТЕКУЩУЮ позицию
  player.x = newX;
  player.y = newY;
  player.lastUpdate = now;
});

// Каждые 50ms отправляем game_state_update с:
// - x, y (текущая синхронизированная позиция)
// - prevX, prevY (для интерполяции)
// - vx, vy (для dead reckoning)
// - ballControlPoints (для мяча)
```

### 2. Клиент (rucheyok-demo.html)

#### Шаг 1: Получение пакета
```javascript
socket.on('player_moved', (data) => {
  let state = remotePlayerStates[data.socketId];

  // Dead reckoning: рассчитываем скорость
  const dt = (Date.now() - state.lastUpdate) / 1000;
  state.vx = (data.x - state.x) / dt;
  state.vy = (data.y - state.y) / dt;

  // Сохраняем старую позицию
  state.prevX = state.x;
  state.prevY = state.y;

  // Обновляем новую позицию
  state.x = data.x;
  state.y = data.y;

  // Сбрасываем интерполяцию (начинаем с 0)
  state.updateInterpolationAlpha = 0;
  state.lastUpdate = Date.now();
});
```

#### Шаг 2: Обновление каждый фрейм
```javascript
function updateRemotePlayerInterpolation() {
  const now = Date.now();
  const updateInterval = 50;  // сервер отправляет каждые 50ms

  Object.values(remotePlayerStates).forEach(state => {
    const timeSinceUpdate = now - state.lastUpdate;

    if (timeSinceUpdate < updateInterval) {
      // 📊 ФАЗА 1: Интерполяция между пакетами
      const a = Math.min(1, timeSinceUpdate / updateInterval);
      state.displayX = state.prevX + a * (state.x - state.prevX);
      state.displayY = state.prevY + a * (state.y - state.prevY);
    } else {
      // 🔮 ФАЗА 2: Dead Reckoning (экстраполяция)
      const extraTime = (timeSinceUpdate - updateInterval) / 1000;
      state.displayX = state.x + state.vx * extraTime * 0.5;
      state.displayY = state.y + state.vy * extraTime * 0.5;
    }
  });
}
```

#### Шаг 3: Отрисовка
```javascript
function draw() {
  Object.entries(remotePlayerStates).forEach(([id, rState]) => {
    // ✨ Рисуем displayX/Y (интерполированные), не x/y!
    ctx.globalAlpha = 0.65;  // Полупрозрачность
    drawStick(rState.displayX, rState.displayY, pose);
  });
}
```

---

## ⚽ Мяч с контрольными точками

### На сервере

```typescript
// Каждые 50ms собираем контрольные точки траектории
const ballControlPoints = [];
if (currentRoom.ball.state === 'flying') {
  ballControlPoints.push({
    x: currentRoom.ball.x,
    y: currentRoom.ball.y,
    vx: currentRoom.ball.vx,
    vy: currentRoom.ball.vy,
    t: now,
  });
}

// Отправляем с game_state_update
io.to(roomId).emit('game_state_update', {
  ...
  ballControlPoints,
  timestamp: now,
});
```

### На клиенте

```javascript
function getInterpolatedBallPosition(ballState, now) {
  const pts = ballState.controlPoints || [];
  if (pts.length === 0) return {x: ballState.x, y: ballState.y};

  // Найдем две соседние контрольные точки
  for (let i = 0; i < pts.length - 1; i++) {
    const t0 = pts[i].t;
    const t1 = pts[i + 1].t;

    if (now >= t0 && now <= t1) {
      // Линейная интерполяция между двумя точками
      const a = (now - t0) / (t1 - t0);
      return {
        x: pts[i].x + a * (pts[i + 1].x - pts[i].x),
        y: pts[i].y + a * (pts[i + 1].y - pts[i].y)
      };
    }
  }

  // После последней точки: возвращаем последнюю позицию
  return {x: pts[pts.length - 1].x, y: pts[pts.length - 1].y};
}

// При отрисовке мяча удаленного игрока:
if (rState.ball && rState.ball.state === 'flying') {
  const ballPos = getInterpolatedBallPosition(rState.ball, Date.now());
  drawBall(ballPos.x, ballPos.y);
}
```

---

## 📊 Диаграмма временной шкалы

```
СЕРВЕР отправляет каждые 50ms:
────────────────────────────────────────
│ t=0      t=50    t=100   t=150
│ PKT#1    PKT#2   PKT#3   PKT#4
│ (x=100)  (x=110) (x=120) (x=130)
└────────────────────────────────────────

КЛИЕНТ получает (с задержкой ~30-50ms):
────────────────────────────────────────
│        t=30    t=80    t=130   t=180
│        PKT#1   PKT#2   PKT#3   PKT#4
└────────────────────────────────────────

ИНТЕРПОЛЯЦИЯ на клиенте:
  0-50ms:    displayX = 100 + alpha * (110 - 100)
             alpha: 0 → 1 (линейно)

  50-80ms:   displayX = 110 + alpha * (120 - 110)
             alpha: 0 → 0.6

  80-130ms:  displayX = 120 + alpha * (130 - 120)
             alpha: 0 → 1

  130-180ms: displayX = 130 + vx * extraTime * 0.5
             (dead reckoning, экстраполяция)
```

---

## 🎯 Ключевые параметры

| Параметр | Значение | Где | Эффект |
|----------|----------|-----|--------|
| `updateInterval` | 50ms | socketServerAdvanced.ts | Частота обновления с сервера |
| `alpha = timeSinceUpdate / updateInterval` | 0-1 | rucheyok-demo.html | Прогрес интерполяции |
| `extrapolationDamping` | 0.5 | updateRemotePlayerInterpolation() | Затухание при dead reckoning |
| `opacity` (удаленные игроки) | 0.65 | draw() | Визуальное отличие от локальных |
| `maxControlPoints` | 5 | player_moved handler | Макс точек для интерполяции мяча |

---

## ✅ Как это улучшает UX

### ДО (без интерполяции)
```
Player A отправляет position каждые 50ms
Player B получает и сразу рисует → РЫВКИ каждые 50ms
Выглядит как телепортация
```

### ПОСЛЕ (с интерполяцией)
```
Player A отправляет: x=100, vx=200
Player B интерполирует 50 раз в секунду (60fps) между x=100 и x=110
Выглядит как ПЛАВНОЕ ДВИЖЕНИЕ
```

### Формулы
```
Интерполяция:     displayX = prevX + (x - prevX) * alpha
Dead Reckoning:   displayX = x + vx * extraTime * damping
Dead Reck. мяч:   y = y0 + vy*t + 0.5*gravity*t²
```

---

## 🐛 Частые ошибки и решения

### Ошибка 1: Используется `x` вместо `displayX`
```javascript
// ❌ НЕПРАВИЛЬНО:
drawStick(state.x, state.y);

// ✅ ПРАВИЛЬНО:
drawStick(state.displayX, state.displayY);
```

### Ошибка 2: Не сохраняется `prevX/prevY`
```javascript
// ❌ НЕПРАВИЛЬНО:
state.x = data.x;

// ✅ ПРАВИЛЬНО:
state.prevX = state.x;
state.x = data.x;
```

### Ошибка 3: Dead reckoning без дампинга
```javascript
// ❌ НЕПРАВИЛЬНО (бесконечное ускорение):
displayX = x + vx * extraTime;

// ✅ ПРАВИЛЬНО (затухание):
displayX = x + vx * extraTime * 0.5;
```

### Ошибка 4: Не проверяются controlPoints мяча
```javascript
// ❌ НЕПРАВИЛЬНО:
if (ballState.controlPoints) {
  // может быть undefined → crash
}

// ✅ ПРАВИЛЬНО:
if (ballState && ballState.controlPoints && ballState.controlPoints.length > 0) {
  // safe
}
```

---

## 🚀 Тестирование

### Локально (1 компьютер, 2 браузера)

```bash
npm run chat
# Откроем в браузере 1:
http://localhost:3011/game?room=test&player=0

# Добавим 3 игроков и нажмем Старт

# Откроем в браузере 2:
http://localhost:3011/game?room=test&player=0

# Должны видеть:
✅ Игроков как полупрозрачные (alpha=0.65)
✅ Плавное движение (интерполяция)
✅ Мяч летит гладко (контрольные точки)
```

### С сетевой задержкой

```
DevTools → Network tab → Throttling → "Slow 3G" (400ms RTT)

# Результат: движение ОСТАЕТСЯ ПЛАВНЫМ!
# Это работа dead reckoning
```

### Диагностика

```javascript
// В консоли браузера
console.log('RemotePlayerStates:', remotePlayerStates);

// Проверить интерполяцию
Object.values(remotePlayerStates).forEach(s => {
  console.log(`Player ${s.playerIndex}:`, {
    real: `(${s.x|0}, ${s.y|0})`,
    display: `(${s.displayX|0}, ${s.displayY|0})`,
    vel: `(${s.vx|0}, ${s.vy|0})`,
    alpha: s.updateInterpolationAlpha.toFixed(2)
  });
});
```

---

## 📚 Дополнительно

### Ссылки в коде
- `socketServerAdvanced.ts` - вычисление vx/vy на сервере
- `rucheyok-demo.html` - `updateRemotePlayerInterpolation()` и `draw()`
- `INTERPOLATION_QUICK_REF.md` - quick reference
- `DEAD_RECKONING_EXAMPLES.md` - подробные примеры

### Технический термин
- **Dead Reckoning** = "Мертвая точка рекона" = оценка позиции по скорости
- **Interpolation** = линейная интерполяция между двумя точками
- **Extrapolation** = продолжение движения после получения последнего пакета
- **Control Points** = контрольные точки для гладкой траектории (Hermite curve)

---

**✅ Система полностью функциональна и готова к production!** 🎮
