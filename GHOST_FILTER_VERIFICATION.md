# Проверка фильтра призраков (2026-04-28)

## Что было исправлено

### 1. onLeave в BasketballRoom.ts
- Добавлен параметр `consented: boolean`
- Теперь удаляет игроков сразу при disconnection
- Логирует количество оставшихся игроков

### 2. Фильтр по nickname в RucheekGameCanvas.tsx
- Пропускает игроков без nickname
- Пропускает игроков с пустым ('') или undefined nickname
- Жёсткий фильтр перед остальными проверками

### 3. Сервер перезагружен
- Все node процессы убиты
- Сервер запущен с чистой памятью
- На чистом сервере нет призраков

## Проверка в браузере

### Шаг 1: Открой http://localhost:3006/chat
- Должна загрузиться страница чата
- В DevTools → Console смотри за сообщениями вида:
  - `[🔴 DEBUG] Checking player:` — все игроки которых видит клиент
  - `[🔴 DEBUG] Removing ghost player (no nickname):` — если призрак пойман

### Шаг 2: Добавь первого игрока
- Введи nickname (например "TestPlayer1")
- Нажми "Додати гравця"
- **Ожидается**: В консоли должно быть:
  ```
  [🟢 COLYSEUS] New player: { key, nickname: 'TestPlayer1' }
  ```

### Шаг 3: Открой второй браузер/вкладку
- В Tab 2: http://localhost:3006/chat?userName=TestPlayer2
- Добавь TestPlayer2
- **Ожидается**: 
  - В Tab 1 должно появиться сообщение о присоединении TestPlayer2
  - В консоли: `[🟢 COLYSEUS] New player: { key, nickname: 'TestPlayer2' }`

### Шаг 4: Закрой Tab 2
- Закрой вкладку с TestPlayer2
- **Ожидается**: 
  - TestPlayer2 должен исчезнуть из Tab 1
  - В консоли серверной части (где npm run dev:safe) должно быть:
    ```
    [Colyseus] Player left - SESSION_ID (TestPlayer2) consented=false
    [Colyseus] Player removed. Remaining: 1
    ```

### Шаг 5: Проверь отсутствие призраков
- Обнови страницу (F5) в Tab 1
- **Ожидается**: 
  - TestPlayer1 появляется один
  - Никаких призраков
  - В консоли: `[🟢 COLYSEUS] Cleared old ghost players on join`

## Признаки призрака (если всё ещё появляются)

- Игрок без имени в списке
- Игрок с пустым nickname ("")
- Игрок с статусом из старой сессии ('eliminated', 'dead')
- Игрок с lastSeen более 30 секунд назад

## Логирование

В консоли браузера (DevTools → Console):
- `[🔴 DEBUG] Removing ghost player (no nickname):` — поймана попытка отрисовать без имени
- `[🔴 DEBUG] Removing eliminated player:` — старый статус отфильтрован
- `[🔴 DEBUG] Removing inactive player:` — stale lastSeen отфильтрован

В консоли сервера (где npm run dev:safe):
- `[Colyseus] Player left -` — игрок отключился
- `[Colyseus] Cleaning up inactive player:` — сервер удалил неактивного игрока

## Статус
- ✅ Server-side: onLeave исправлена
- ✅ Client-side: фильтр по nickname добавлен
- ✅ Dev сервер: перезагружен с чистой памятью
- ⏳ Требуется: Ручная проверка в браузере
