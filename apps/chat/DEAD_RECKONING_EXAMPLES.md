# 💀 Dead Reckoning — Примеры и best practices

## Что такое Dead Reckoning?

**Dead Reckoning** ("мертвая точка рекона") — это техника, при которой мы **экстраполируем** положение объекта на основе его известной скорости, когда новые данные еще не пришли.

```
Пакет получен в t=0:
  position: (100, 200)
  velocity: (10, 5)

В t=50ms (до следующего пакета):
  estimated_pos = (100, 200) + (10, 5) * 0.05 = (100.5, 200.25)

В t=100ms (если пакет не пришел):
  estimated_pos = (100, 200) + (10, 5) * 0.1 = (101, 200.5)
```

---

## 🎮 Примеры в игре

### Пример 1: Игрок движется линейно вправо

```javascript
// СЕРВЕР отправляет каждые 50ms:
Player 0:
  t=0ms:    x=100, y=500  (начальная позиция)
  t=50ms:   x=110, y=500  (скорость = 10px/50ms = 200px/s)
  t=100ms:  x=120, y=500
  t=150ms:  x=130, y=500

// КЛИЕНТ получает с задержкой ~30ms:
  t=30ms:   получил пакет для t=0ms → prevX=100, x=100, vx=(100-100)/0.03=0
  t=80ms:   получил пакет для t=50ms → prevX=100, x=110, vx=(110-100)/0.05=200
  t=130ms:  получил пакет для t=100ms → prevX=110, x=120, vx=(120-110)/0.05=200

// ИНТЕРПОЛЯЦИЯ на клиенте:
  t=30-80ms:     displayX = 100 + alpha*(110-100)  // alpha: 0→1
  t=80-130ms:    displayX = 110 + alpha*(120-110)  // alpha: 0→1
  
  // Если пакет задерживается, начинаем экстраполировать:
  t=130-180ms:   displayX = 120 + 200*(0.05)*0.5 = 125  // vx * extraTime * damping
```

### Пример 2: Игрок меняет направление (скорость меняется)

```javascript
// Сервер:
  t=0ms:    x=200, y=300  (идет вправо)
  t=50ms:   x=210, y=300  (скорость = 200px/s вправо)
  t=100ms:  x=210, y=310  (вдруг повернул вниз! скорость = 200px/s вниз)
  t=150ms:  x=210, y=320

// Клиент при получении t=100ms пакета:
  prevX=210, x=210, prevY=300, y=310
  vx = (210 - 210) / 0.05 = 0        ❌ ПРОБЛЕМА: vx=0 (не видит горизонтальное движение)
  vy = (310 - 300) / 0.05 = 200      ✅ vy правильно

// При экстраполяции для t=130ms:
  displayY = 310 + 200 * 0.03 * 0.5 = 313
  displayX = 210 + 0 * 0.03 * 0.5 = 210     ✅ Правильно (нет горизонтального движения)
```

### Пример 3: Задержка сетевого соединения

```javascript
// Сценарий: Интернет медленный, задержка пакета = 100ms вместо 30ms

Сервер:       │t=0    │t=50   │t=100  │t=150  │
              │(100,0)│(110,0)│(120,0)│(130,0)│

Клиент получает:
              │       │       │t=30→  │t=100→ │t=150→
              │       │       │пакет0 │пакет1 │пакет2

// При t=150ms (100ms после получения последнего пакета):
  state.lastUpdate = 100ms
  timeSinceUpdate = 150 - 100 = 50ms
  updateInterval = 50ms

  // 50ms > 50ms → переходим на dead reckoning!
  extraTime = (50 - 50) / 1000 = 0
  displayX = 120 + 200 * 0 * 0.5 = 120    ✅ Корректная позиция

// При t=200ms (150ms после получения последнего пакета):
  timeSinceUpdate = 200 - 100 = 100ms

  // 100ms > 50ms → dead reckoning
  extraTime = (100 - 50) / 1000 = 0.05
  displayX = 120 + 200 * 0.05 * 0.5 = 125    ✅ Экстраполировал на 5px
```

---

## 📊 Математика Dead Reckoning

### Базовая формула

```
position(t) = position₀ + velocity * (t - t₀)
```

**В коде:**
```javascript
const extraTime = (timeSinceUpdate - updateInterval) / 1000; // в секундах
displayX = state.x + state.vx * extraTime * damping;
displayY = state.y + state.vy * extraTime * damping;
```

### С затуханием (damping)

Без затухания игрок продолжит движение бесконечно. С затуханием 0.5:
```
// Каждые 50ms затухание снижает экстраполяцию на 50%

t=50ms:   displayX = x + vx * 0 = x                          (интерполяция)
t=100ms:  displayX = x + vx * 0.05 * 0.5 = x + vx*0.025    (20% от полной скорости)
t=150ms:  displayX = x + vx * 0.10 * 0.5 = x + vx*0.05     (40% от полной скорости)
t=200ms:  displayX = x + vx * 0.15 * 0.5 = x + vx*0.075    (60% от полной скорости)
```

---

## 🏀 Dead Reckoning для мяча

### Проблема: Мяч ускоряется (гравитация)

```javascript
// Простой dead reckoning НЕ учитывает гравитацию!

ball.vy = -10  // кидок вверх
gravity = 0.2  // пиксели/фрейм²

// Каждый фрейм на сервере:
ball.vy += gravity = -9.8, -9.6, -9.4, ...

// Если мы просто экстраполируем с vx/vy:
// displayY = 100 + (-9) * extraTime  // НЕПРАВИЛЬНО! не учитываем, что vy меняется

// Правильно:
// Нужно использовать контрольные точки траектории (как мы делаем)
// Или применить упрощенное ускорение:
displayY = y + vy * extraTime + 0.5 * gravity * extraTime²
```

### Решение: Контрольные точки

Вместо экстраполяции с одной точкой, сервер отправляет **последовательность контрольных точек**:

```javascript
// Сервер вычисляет физику каждый фрейм, собирает контрольные точки

controlPoints = [
  {x: 200, y: 100, vy: -10, t: 0},      // начало броска
  {x: 210, y: 92,  vy: -8.2, t: 50},    // 50ms спустя
  {x: 220, y: 83,  vy: -6.4, t: 100},   // мяч ускоряется вниз
  {x: 230, y: 73,  vy: -4.6, t: 150},
  {x: 240, y: 62,  vy: -2.8, t: 200},
];

// Клиент интерполирует через эти точки:
displayY = catmullRom(p0, p1, p2, p3, t)  // гладкая кривая!
```

---

## ⚠️ Ошибки и как их избежать

### Ошибка 1: Newtonian Explosion (взрыв скорости)

```javascript
// ❌ НЕПРАВИЛЬНО:
state.x = data.x;
state.y = data.y;
state.vx = data.x - state.prevX;  // БЕЗ деления на dt!
state.vy = data.y - state.prevY;

// Если пакет приходит быстро (dt=0.016s):
// vx = (120 - 110) / 0.016 = 625 px/s  ⚠️ ОГРОМНАЯ СКОРОСТЬ!

// ✅ ПРАВИЛЬНО:
const dt = (Date.now() - state.lastUpdate) / 1000;  // в секундах
state.vx = (data.x - state.x) / dt;
state.vy = (data.y - state.y) / dt;
```

### Ошибка 2: Проблема с коррекцией

```javascript
// ❌ Если реальное положение > 100px от интерполированного:
// Клиент просто телепортируется (рывок)

if (Math.hypot(dx, dy) > 100) {
  displayX = x;
  displayY = y;  // Рывок!
}

// ✅ ПРАВИЛЬНО: плавная коррекция через сплайн
// Или: растянуть коррекцию на несколько фрейм ов
state.correctionAlpha = 0;
state.correctionTarget = {x: data.x, y: data.y};

// В update():
state.correctionAlpha = Math.min(1, state.correctionAlpha + 0.02);
const a = state.correctionAlpha;
displayX = displayX + a * (correctionTarget.x - displayX);
displayY = displayY + a * (correctionTarget.y - displayY);
```

### Ошибка 3: Экстраполяция в бесконечность

```javascript
// ❌ НЕПРАВИЛЬНО: без дампинга и без лимита
extraTime = (timeSinceUpdate - updateInterval) / 1000;
displayX = x + vx * extraTime;  // Если extraTime > 10s, скатится за карту!

// ✅ ПРАВИЛЬНО: с дампингом и лимитом
const maxExtraTime = 0.5;  // макс 500ms экстраполяции
extraTime = Math.min(maxExtraTime, extraTime);
displayX = x + vx * extraTime * 0.5;  // damping=0.5
```

---

## 🎯 Настройка параметров

### Идеальные значения для разных жанров

#### Баскетбольная игра (как РУЧЕЁК)
```javascript
updateInterval: 50,           // 20 updates/sec достаточно
extrapolationDamping: 0.5,   // 50% затухания
maxExtraTime: 0.3,           // макс 300ms без пакета
```

#### FPS (напр., Valorant)
```javascript
updateInterval: 16,           // ~60 updates/sec
extrapolationDamping: 0.8,   // 80% (более агрессивная экстраполяция)
maxExtraTime: 0.1,           // макс 100ms без пакета
```

#### MMO (напр., WoW)
```javascript
updateInterval: 100,          // 10 updates/sec (экономим трафик)
extrapolationDamping: 0.3,   // 30% (консервативно)
maxExtraTime: 1.0,           // макс 1s без пакета
```

---

## 🧪 Тестирование Dead Reckoning

### Симуляция задержки в Chrome

```
1. DevTools → Network tab
2. Throttling → "Slow 3G" (400ms RTT)
3. Откройте 2 вкладки с игроками
4. Движение должно оставаться плавным
```

### Логирование для диагностики

```javascript
// В update() функции добавьте:
console.group('Dead Reckoning Debug');
Object.entries(remotePlayerStates).forEach(([id, state]) => {
  const timeSinceUpdate = Date.now() - state.lastUpdate;
  const isExtrapolating = timeSinceUpdate > 50;

  console.log(`Player ${state.playerIndex}:`, {
    real_pos: `(${state.x}, ${state.y})`,
    display_pos: `(${state.displayX.toFixed(0)}, ${state.displayY.toFixed(0)})`,
    velocity: `(${state.vx.toFixed(1)}, ${state.vy.toFixed(1)}) px/s`,
    time_since_update: timeSinceUpdate + 'ms',
    mode: isExtrapolating ? '🔮 DEAD RECKONING' : '📊 INTERPOLATING',
    alpha: state.updateInterpolationAlpha.toFixed(2)
  });
});
console.groupEnd();
```

---

## 📚 Дополнительные техники

### 1. Client-Side Prediction (CSP)

Не ждем ответа сервера — сразу применяем локальное движение:

```javascript
// Клиент вводит команду движения
playerMove(x, y);

// Сразу обновляем локального игрока (optimistic)
myPlayer.x = x;

// Отправляем на сервер
socket.emit('player_move', {x, y});

// Сервер подтверждает (или корректирует)
socket.on('player_move_confirmed', (data) => {
  // Проверяем, если ошибка > порога:
  if (Math.hypot(data.x - myPlayer.x, data.y - myPlayer.y) > 10) {
    // Корректируем
    myPlayer.x = data.x;
  }
});
```

### 2. Lag Compensation (компенсация лага)

"откатываем" объекты в прошлое на величину текущего лага:

```javascript
// Если лаг = 100ms, рисуем объект на 100ms раньше
const currentLag = estimatedNetworkLatency();  // ~100ms
const pastTime = Date.now() - currentLag;

// Интерполируем мяч на позицию 100ms назад
const ballPastPos = getInterpolatedBallPosition(ball, pastTime);
drawBall(ballPastPos.x, ballPastPos.y);  // Более точно!
```

### 3. Reconciliation (примирение)

После получения подтверждения сервера плавно корректируем ошибку:

```javascript
const serverPos = {x: 145, y: 320};
const clientPos = {x: 142, y: 319};
const error = {
  x: serverPos.x - clientPos.x,  // 3px ошибка
  y: serverPos.y - clientPos.y   // 1px ошибка
};

// Распределяем корректив на 10 фреймов
state.corrections = [];
for (let i = 0; i < 10; i++) {
  state.corrections.push({
    x: error.x / 10,
    y: error.y / 10
  });
}

// В update():
if (state.corrections.length > 0) {
  const corr = state.corrections.shift();
  state.displayX += corr.x;
  state.displayY += corr.y;
}
```

---

## 🚀 Оптимизация

### Способ 1: Уменьшить updateInterval

```javascript
// Было: 50ms (20 updates/sec)
// Станет: 33ms (~30 updates/sec)
const updateInterval = 33;

// Плюсы: более плавная интерполяция
// Минусы: +50% трафика, +25% CPU на сервере
```

### Способ 2: Адаптивный updateInterval

```javascript
// Динамически меняем интервал в зависимости от нагрузки
if (activeRooms > 100) {
  updateInterval = 100;  // 10 updates/sec в пиковое время
} else if (activeRooms > 50) {
  updateInterval = 66;   // 15 updates/sec
} else {
  updateInterval = 50;   // 20 updates/sec (нормальный режим)
}
```

### Способ 3: Сжатие данных

```javascript
// Вместо отправки всех координат:
// {x: 123.456, y: 456.789}

// Отправляем целые числа + смещение:
// {dx: 3, dy: -5}  (смещение от предыдущего пакета)
// Сокращает на 30% размер пакета
```

---

## 🎓 Заключение

**Dead Reckoning** — это мощный инструмент для скрытия задержки в сетевых играх:

| Техника | Когда использовать | Точность |
|---------|------------------|----------|
| Strict Sync | Медленные игры (шахматы) | 100% |
| Interpolation | Большинство игр | ~95% |
| **Dead Reckoning** | **Быстрые игры** | **~90%** |
| + Control Points | Мячи, снаряды | ~98% |

Комбинируя **интерполяцию + dead reckoning + контрольные точки**, получаем идеальный баланс между плавностью и точностью! 🎮
