# ⚡ Интерполяция — Quick Reference

## 🔥 Самые важные части

### 1. Структура состояния удаленного игрока

```javascript
{
  x, y,              // Текущая (синхронизированная) позиция
  prevX, prevY,      // Предыдущая (для интерполяции)
  vx, vy,            // Скорость (для dead reckoning)
  lastUpdate,        // Время последнего обновления
  displayX,          // ✨ РИСУЕМ ОТСЮДА (интерполированная)
  displayY           // ✨ РИСУЕМ ОТСЮДА
}
```

### 2. Получение пакета от сервера

```javascript
socket.on('player_moved', (data) => {
  // 1. Сохраняем старую позицию
  state.prevX = state.x;
  state.prevY = state.y;

  // 2. Рассчитываем скорость (dead reckoning)
  const dt = (Date.now() - state.lastUpdate) / 1000;
  state.vx = (data.x - state.x) / dt;
  state.vy = (data.y - state.y) / dt;

  // 3. Обновляем текущую позицию
  state.x = data.x;
  state.y = data.y;

  // 4. Сбрасываем интерполяцию
  state.updateInterpolationAlpha = 0;
  state.lastUpdate = Date.now();
});
```

### 3. Обновление интерполяции каждый фрейм

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
      // 🔮 ФАЗА 2: Dead reckoning (экстраполяция)
      const extraTime = (timeSinceUpdate - updateInterval) / 1000;
      state.displayX = state.x + state.vx * extraTime * 0.5;
      state.displayY = state.y + state.vy * extraTime * 0.5;
    }
  });
}
```

### 4. Отрисовка

```javascript
function draw() {
  Object.entries(remotePlayerStates).forEach(([id, state]) => {
    // ✨ Используем displayX/Y (интерполированные)
    drawStick(state.displayX, state.displayY, pose, 0, false, color);
  });
}
```

---

## ⚽ Мяч (Control Points)

### Отправка контрольных точек (сервер)

```javascript
// socketServerAdvanced.ts
io.to(roomId).emit(EVENTS.SERVER.GAME_STATE_UPDATE, {
  ball: {...},
  ballControlPoints: [
    {x: 200, y: 300, vx: 5, vy: -2, t: now},
    {x: 205, y: 295, vx: 5, vy: -3, t: now + 50},
    // ... больше точек
  ]
});
```

### Интерполяция мяча (клиент)

```javascript
function getInterpolatedBallPosition(ballState, now) {
  const pts = ballState.controlPoints || [];
  if (pts.length === 0) return {x: ballState.x, y: ballState.y};

  for (let i = 0; i < pts.length - 1; i++) {
    if (now >= pts[i].t && now <= pts[i + 1].t) {
      const a = (now - pts[i].t) / (pts[i + 1].t - pts[i].t);
      return {
        x: pts[i].x + a * (pts[i + 1].x - pts[i].x),
        y: pts[i].y + a * (pts[i + 1].y - pts[i].y)
      };
    }
  }

  return {x: pts[pts.length - 1].x, y: pts[pts.length - 1].y};
}
```

---

## 📊 Визуализация

```
ИНТЕРПОЛЯЦИЯ:                   DEAD RECKONING:
─────────────                   ───────────────

Пакет 1           Пакет 2       Нет пакета
│ t=0              │ t=50        │ t=100
│ x=100            │ x=110       │ x=?
│                  │             │
└────────○────────│             │
    α=0.5          │             │
    x = 100 +      │             │
    0.5*(110-100)  │             │
    = 105          └──────○──────
                   vx=200px/s
                   extraTime=50ms
                   x = 110 + 200*0.05*0.5 = 115
```

---

## 🎮 Примеры использования

### Добавить в Вашу игру

```javascript
// 1. В update():
updateRemotePlayerInterpolation();

// 2. В draw():
Object.entries(remotePlayerStates).forEach(([id, state]) => {
  drawPlayer(state.displayX, state.displayY, state);
  if (state.ball) {
    const pos = getInterpolatedBallPosition(state.ball, Date.now());
    drawBall(pos.x, pos.y);
  }
});

// 3. На сервере отправляем контрольные точки мяча
io.to(roomId).emit('game_state_update', {
  // ... остальное ...
  ballControlPoints: [{x, y, vx, vy, t}]
});
```

---

## ⚙️ Настройки

| Параметр | Значение | Где менять |
|----------|----------|-----------|
| updateInterval | 50ms | INTERPOLATION_GUIDE.md |
| extrapolationDamping | 0.5 | updateRemotePlayerInterpolation() |
| maxControlPoints | 5 | player_moved handler |
| updateInterpolationAlpha | 0-1 | расчет в update() |

---

## 🐛 Диагностика

### Консоль браузера

```javascript
// Проверить состояние игроков
console.table(
  Object.entries(remotePlayerStates).map(([id, s]) => ({
    player: s.playerIndex,
    displayPos: `(${s.displayX|0}, ${s.displayY|0})`,
    realPos: `(${s.x|0}, ${s.y|0})`,
    velocity: `(${s.vx|1}, ${s.vy|1})`,
    delay: Date.now() - s.lastUpdate + 'ms'
  }))
);

// Проверить контрольные точки мяча
Object.values(remotePlayerStates).forEach(s => {
  if (s.ball?.controlPoints) {
    console.log(`Player ${s.playerIndex} ball points:`, s.ball.controlPoints.length);
  }
});
```

---

## 🚀 Optimization Tips

1. **Уменьшить updateInterval** (50ms → 33ms) = плавнее, но +50% трафика
2. **Увеличить updateInterval** (50ms → 100ms) = экономнее, но рывковатее
3. **Отключить damping** (0.5 → 1.0) = точнее, но может телепортироваться
4. **Увеличить damping** (0.5 → 0.3) = консервативнее, плавнее

---

## ✅ Checklist

- [ ] `remotePlayerStates` структура заполнена правильно
- [ ] `updateRemotePlayerInterpolation()` вызывается в `update()`
- [ ] `displayX/Y` используются при отрисовке, не `x/y`
- [ ] Dead reckoning работает когда `timeSinceUpdate > updateInterval`
- [ ] Контрольные точки мяча собираются и отправляются с сервера
- [ ] `getInterpolatedBallPosition()` правильно интерполирует через точки
- [ ] Удаленные игроки видны на экране (полупрозрачные)
- [ ] Движение удаленных игроков плавное, без рывков
- [ ] При сетевой задержке (DevTools throttling) остается плавным

---

## 📚 Дополнительно

Полные детали:
- Математика: **INTERPOLATION_GUIDE.md**
- Примеры: **DEAD_RECKONING_EXAMPLES.md**
- Общий API: **SOCKET_IO_GUIDE.md**
