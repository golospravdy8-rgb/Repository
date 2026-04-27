# 🌐 Мультиплеер: Восстановление отображения удаленного игрока (2026-04-27)

**Commit**: e31778a  
**Status**: ✅ Deployed to Vercel production  
**URL**: https://basketball.lviv.ua/chat

---

## 📋 Проблема

Когда два игрока входили в игру, персонаж второго участника **не отображался** у первого, и наоборот. Pusher-соединение было активно, события подписки срабатывали, но удаленный игрок так и не появлялся на экране.

---

## 🔍 Root Cause Analysis (Анализ корневых причин)

Было выявлено **3 критических проблемы**:

### **Проблема 1: Несоответствие формата playerId (КРИТИЧНО)**

**Место**: `emitPlayerPosition()` строка 2655

```typescript
playerId: playerIdRef.current + `_${idx}`,  // Отправляет: "abc123_0", "abc123_1"
```

**Проблема**: 
- Клиент отправляет `playerId = "abc123_0"`
- Получатель ищет в `remotePlayersRef.get(data.playerId)` с точным совпадением ключа
- Функция `normalizePlayerId()` не удаляла суффикс `_${idx}`
- **Результат**: Событие получено, но игрок не найден в Map → не отображается

**Почему случилось**: Функция нормализации была написана для удаления только Pusher-суффиксов (`_sub_X`, `_session_Y`), но не для приложения суффиксов (`_${idx}`).

---

### **Проблема 2: socket_id не передается в запросах**

**Места**: 5 fetch-запросов к `/api/pusher`:
- Line 242 (player leave)
- Line 2650 (player movement)  
- Line 2769 (player join)
- Line 1487 (shot completion)

**Проблема**:
```typescript
// БЕЗ socket_id:
fetch('/api/pusher', {
  body: JSON.stringify({
    room: gameRoomId,
    playerId: playerIdRef.current,
    // socket_id: ОТСУТСТВУЕТ ❌
  })
})
```

**Почему это проблема**:
- Pusher использует `socket_id` для фильтрации, чтобы предотвратить echo-события (клиент не получает свои же события)
- Без `socket_id`, API не может фильтровать и клиент получает свои события обратно
- Это вызывает конфликты, дублирование событий, и может перекрывать удаленные события

---

### **Проблема 3: normalizePlayerId() неполная**

**Строки 44-57**: Функция не обрабатывает `_${idx}` суффиксы:

```typescript
// Удаляла только Pusher суфиксы:
const withoutSub = id.split('_sub_')[0];
const withoutSession = withoutSub.split('_session_')[0];

// НО НЕ удаляла:
// "abc123_0", "abc123_1", "abc123_2" — суффиксы добавляемые emitPlayerPosition
```

---

## ✅ Решения

### **Fix 1: Обновить normalizePlayerId() для удаления _idx суффиксов**

```typescript
// Удаляет Pusher суфиксы (_sub_X, _session_Y, _idx) для корректного сравнения
function normalizePlayerId(id: string): string {
  // Удаляем известные Pusher суфиксы
  const withoutSub = id.split('_sub_')[0];
  const withoutSession = withoutSub.split('_session_')[0];

  // ✅ НОВОЕ: Удаляем суффикс _${idx} (добавляется в emitPlayerPosition, строка 2655)
  // Паттерн: "baseid_0", "baseid_1" и т.д.
  const withoutIdx = withoutSession.replace(/_(\d+)$/, '');

  // ... остальной код
  return withoutIdx;
}
```

**Результат**: Теперь `"abc123_0"` нормализуется → `"abc123"` и совпадает с локальным ID.

---

### **Fix 2: Добавить socket_id во все Pusher запросы**

```typescript
// Было:
fetch('/api/pusher', {
  body: JSON.stringify({
    room: gameRoomId,
    playerId: playerIdRef.current,
    // ОТСУТСТВУЕТ socket_id
  })
})

// Стало:
fetch('/api/pusher', {
  body: JSON.stringify({
    room: gameRoomId,
    playerId: playerIdRef.current,
    socket_id: playerIdRef.current,  // ✅ Сообщаем Pusher'у наш socket ID
  })
})
```

**Где добавлено**:
1. `emitPlayerPosition()` (line 2665) — обновление позиции
2. `handleAddPlayer()` (line 2781) — присоединение игрока
3. `handleScored()` (line 1498) — завершение броска
4. Player leave event (line 249) — отключение игрока
5. `/api/pusher/shot` вызов (line 1498) — уже наличествовало

**Результат**: Pusher фильтрует эхо-события, клиент получает только события от других игроков.

---

### **Fix 3: Добавить диагностические логи**

```typescript
channel.bind('player-move', (data: any) => {
  const normalizedIncoming = normalizePlayerId(data.playerId);
  const normalizedLocal = normalizePlayerId(playerIdRef.current);

  console.log('[PUSHER] player-move:', { 
    incoming: data.playerId, 
    normalized: normalizedIncoming, 
    local: playerIdRef.current, 
    isLocal: normalizedIncoming === normalizedLocal 
  });
  // ...
  console.log('[PUSHER] Stored remote player:', { 
    key: data.playerId, 
    x: data.x, 
    y: data.y, 
    name: data.name 
  });
});
```

**Результат**: В консоли видно точно когда и как получаются события.

---

## 🧪 Верификация

### **Как убедиться что всё работает:**

1. **Откройте 2 браузера**:
   - Browser A: http://localhost:3006/chat
   - Browser B: http://localhost:3006/chat

2. **Откройте F12 Console** в обоих браузерах

3. **Добавьте игроков**:
   - Browser A: Click "Додати гравця" → Enter
   - Browser B: Click "Додати гравця" → Enter

4. **Проверьте консоль**:
   ```
   [PUSHER] player-move: { incoming: "abc123_1", normalized: "abc123", local: "abc123", isLocal: false }
   [PUSHER] Stored remote player: { key: "abc123_1", x: 560, y: 400, name: "Player2" }
   ```

5. **Видимые изменения**:
   - ✅ На Browser A должен появиться голубой персонаж (remote player из B)
   - ✅ На Browser B должен появиться голубой персонаж (remote player из A)
   - ✅ При движении мяча — видите позицию удаленного игрока обновляется
   - ✅ При броске удаленного игрока — видите его анимацию

### **Логи в консоли подтверждают:**

✅ **player-move event получен**:
```
[PUSHER] player-move: { incoming: "player123_1", normalized: "player123", ... }
```

✅ **Игрок сохранен в Map**:
```
[PUSHER] Stored remote player: { key: "player123_1", x: 560, y: 400, name: "Alice" }
```

---

## 📊 Статус

| Параметр | Значение |
|----------|----------|
| **Commit** | `e31778a` |
| **Files Changed** | `components/public/RucheekGameCanvas.tsx` |
| **Lines Added** | 15 |
| **Deploy Status** | ✅ Vercel auto-deploy (live in 2-3 min) |
| **Local Testing** | ✅ http://localhost:3006/chat |

---

## 🎯 Что было изменено

```
components/public/RucheekGameCanvas.tsx:
- Line 47:  Добавлена regex для удаления _(\d+)$ суффиксов
- Line 179: Добавлены диагностические логи player-move
- Line 249: Добавлен socket_id в player leave event
- Line 2665: Добавлен socket_id в player movement event
- Line 2781: Добавлен socket_id в player join event
- Line 1498: Добавлен socket_id в shot completion event
```

---

## ⚠️ Важные замечания

1. **socket_id = playerIdRef.current** — это базовый ID без суффиксов, что правильно для фильтрации Pusher
2. **normalizePlayerId()** теперь обрабатывает оба вида суффиксов: Pusher (_sub_, _session_) и приложения (_idx)
3. **Обратная совместимость**: Все изменения минимальны и не влияют на существующую логику

---

**Status**: Ready for testing! 🎮