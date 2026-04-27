# 🎯 ТЕСТИРОВАНИЕ МУЛЬТИПЛЕЕРА: Диагностика дисплея удаленного игрока
**Дата**: 2026-04-27  
**Commit**: 3cdb4c6  
**Status**: ✅ Dev server запущен, диагностические логи добавлены

---

## 🔧 ЧТО БЫЛО ИСПРАВЛЕНО

### **КРИТИЧЕСКАЯ ПРОБЛЕМА**: Отсутствие поля `status` в Pusher события

**Место**: `/app/api/pusher/route.ts` (строка 22-32)

**Проблема**: 
- Клиент отправляет: `{ playerId, x, y, name, score, **status**, socket_id, ball }`
- API перенаправляет в Pusher: `{ playerId, x, y, name, score, ball, timestamp }`
- **Отсутствует**: `status`

**Результат**:
- Событие `player-move` приходит БЕЗ `status`
- Обработчик события пытается использовать `data.status || 'alive'`
- Новый игрок сохраняется с `status: 'alive'`
- ✅ Это уже исправлено в API route.ts!

### **ДИАГНОСТИЧЕСКИЕ ЛОГИ**: Добавлены для отслеживания

Логи помогут определить, на какой стадии игрок "теряется":

```
[🔴 DEBUG] Initializing Pusher with gameRoomId: general
[🔴 DEBUG] Subscribing to channel: game-general

[🟢 PUSHER] player-joined EVENT: { playerId, nickname, x, y }
[🟢 PUSHER] Skipping local player join event  (если свой ID)

[🟢 PUSHER] player-move EVENT RECEIVED: { playerId, normalized, status, x, y, name, isLocal }
[👁️ RENDER] Stored remote player: { key, status, x, y, name, mapSize }

[🎨 DRAWING] Remote player: { key, name, status, x, y }  (когда рисуется на canvas)
[🔴 DEBUG] Skipping self in render  (если это свой ID)
[🔴 DEBUG] Skipping eliminated player  (если status === 'eliminated')
```

---

## 📋 ПОШАГОВЫЙ ТЕСТ (15-20 минут)

### **ФАЗА 1: Подготовка**

1. **Откройте ДВА браузера** (или 2 вкладки в разных окнах):
   - Браузер A: http://localhost:3006/chat
   - Браузер B: http://localhost:3006/chat

2. **Откройте F12 → Console** в обоих браузерах

3. **Убедитесь что видны логи**:
   ```
   [🔴 DEBUG] Initializing Pusher with gameRoomId: general
   [🔴 DEBUG] Subscribing to channel: game-general
   ```

### **ФАЗА 2: Добавление игроков**

1. **На Браузере A**:
   - Нажмите "Додати гравця"
   - Введите имя: "Alice"
   - Нажмите Enter или OK
   - Смотрите Console:
     ```
     [🔴 DEBUG] Initializing Pusher...
     [🔴 DEBUG] Subscribing to channel: game-general
     ```

2. **На Браузере B**:
   - Нажмите "Додати гравця"
   - Введите имя: "Bob"
   - Нажмите Enter
   - **КРИТИЧНО**: Смотрите Console на Браузере A:
     ```
     [🟢 PUSHER] player-joined EVENT: { playerId: "...", nickname: "Bob", x: 560, y: 584 }
     [👁️ RENDER] Stored remote player: { key: "...", status: "alive", x: 560, y: 584, name: "Bob", mapSize: 1 }
     ```

3. **Проверьте Браузер A**:
   - ❌ Если Bob НЕ видна на canvas → Проверьте логи на шаге выше
   - ✅ Если Bob видна (голубой персонаж) → Переходите на Фазу 3

### **ФАЗА 3: Движение игроков**

1. **На Браузере A**, нажмите кнопку "Кидати мяч"
   - Мяч должен полететь к корзине
   - **Проверьте Console на Браузере B**:
     ```
     [🟢 PUSHER] player-move EVENT RECEIVED: { playerId: "...", status: "idle", x: 560, y: 584 }
     [👁️ RENDER] Stored remote player: { key: "...", status: "idle" }
     ```

2. **Проверьте Браузер B**:
   - Видна ли Alice (голубой персонаж)?
   - Видна ли её позиция обновляется?

### **ФАЗА 4: Интерпретация результатов**

| Условие | Логи видны | Игрок на canvas | Статус | Решение |
|---------|-----------|---|---|---|
| ✅ Оба видят друг друга | ✅ Все логи | ✅ Оба видны | **РАБОТАЕТ** | ✅ Deploy to Vercel |
| ❌ Логи не появляются | ❌ [🟢 PUSHER] | ❌ Ничего не видно | Channel не получает события | Проверьте `gameRoomId` (должен быть одинаковым) |
| ❌ [RECEIVED] есть, но не [RENDER] | ✅ RECEIVED | ❌ Ничего | Проблема в Map | Добавьте логи в render loop (уже добавлены!) |
| ❌ [RENDER] есть, но игрок не рисуется | ✅ RENDER | ❌ Ничего | Проблема в canvas drawing | Проверьте координаты (x, y) |

---

## 🔍 КЛЮЧЕВЫЕ ПРОВЕРКИ

### **Проверка 1: gameRoomId совпадает**
```javascript
// В консоли обоих браузеров:
localStorage.getItem('gameRoom')  // Должны быть идентичны!
```

### **Проверка 2: Pusher канал один и тот же**
```javascript
// Должно быть идентично в обоих браузерах:
`game-${gameRoomId}`  // e.g. "game-general"
```

### **Проверка 3: status передается в API**
```javascript
// В браузере откройте Network → Найдите POST /api/pusher
// Payload должен содержать:
{
  "status": "idle",  // или "shooting", "running"
  "x": 560,
  "y": 584,
  // ... другие поля
}
```

---

## 📊 ОЖИДАЕМЫЙ ВЫВОД КОНСОЛИ

### **Сценарий 1: Все работает ✅**

```
[🔴 DEBUG] Initializing Pusher with gameRoomId: general
[🔴 DEBUG] Subscribing to channel: game-general

[🟢 PUSHER] player-joined EVENT: { 
  playerId: "player_1714234500123_abc456", 
  nickname: "Bob", 
  x: 560, 
  y: 584 
}
[👁️ RENDER] Stored remote player: { 
  key: "player_1714234500123_abc456", 
  status: "alive", 
  x: 560, 
  y: 584, 
  name: "Bob", 
  mapSize: 1 
}

[🟢 PUSHER] player-move EVENT RECEIVED: { 
  playerId: "player_1714234500123_abc456_0", 
  normalized: "player_1714234500123_abc456", 
  status: "idle", 
  x: 560, 
  y: 584, 
  name: "Bob", 
  isLocal: false 
}
[👁️ RENDER] Stored remote player: { 
  key: "player_1714234500123_abc456_0", 
  status: "idle", 
  x: 560, 
  y: 584, 
  name: "Bob", 
  mapSize: 1 
}

[🎨 DRAWING] Remote player: { 
  key: "player_1714234500123_abc456_0", 
  name: "Bob", 
  status: "idle", 
  x: 560, 
  y: 584 
}
```

### **Сценарий 2: Channel не получает события ❌**

```
[🔴 DEBUG] Initializing Pusher with gameRoomId: general
[🔴 DEBUG] Subscribing to channel: game-general

// ... На Браузере B добавляем Bob
// НО на Браузере A НИЧЕГО не появляется!

// ⚠️ Смотрите Network tab:
// POST /api/pusher должен получить 200 OK
// Но события не приходят из Pusher
```

**Причины**:
- gameRoomId не совпадает (Браузер A использует "general", B использует "other-room")
- Pusher ключ неправильный
- Pusher подписка не прошла

---

## 🎬 ЗАПУСК

```bash
# Terminal 1: Dev server
npm run dev:safe

# Terminal 2: Откройте сайт
# Браузер A: http://localhost:3006/chat
# Браузер B: http://localhost:3006/chat

# F12 → Console в обоих
# Выполните тест из ФАЗЫ 2
```

---

## ✅ ФИНАЛЬНЫЙ ЧЕКЛИСТ

- [ ] Dev сервер запущен (`npm run dev:safe`)
- [ ] Оба браузера открыты на http://localhost:3006/chat
- [ ] F12 Console открыта в обоих браузерах
- [ ] Логи `[🔴 DEBUG] Initializing Pusher` видны
- [ ] Добавлены два игрока (Alice и Bob)
- [ ] На Браузере A видны логи присоединения Bob
- [ ] На Браузере A видна голубая фигура Bob на canvas
- [ ] На Браузере B видны логи присоединения Alice
- [ ] На Браузере B видна голубая фигура Alice на canvas

---

## 🚀 СЛЕДУЮЩИЙ ШАГ

Если все работает ✅:
1. `git add -A && git commit -m "..."`
2. `git push origin main`
3. Vercel автоматически deploy'ит
4. Проверьте на https://basketball.lviv.ua/chat

Если что-то не работает ❌:
1. Скопируйте логи из Console
2. Сравните с Сценарием 2
3. Проверьте Network tab
4. Убедитесь что gameRoomId совпадает

---

**Status**: Ready for testing! 🎮
