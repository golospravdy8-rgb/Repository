# LiveScoreTracker Full Diagnostic Report — 2026-05-09

## Executive Summary
LiveScoreTracker component has **5 critical architectural problems** preventing it from working. All are traceable to missing database initialization and incomplete server-side logic.

---

## Что Работает ✅

1. **Таймер спускается** — `useEffect` с `isLive` зависимостью корректно считает секунды (gameTimeLeft)
2. **Кнопки START_GAME, START, PAUSE, END_GAME работают** — Server Action правильно обновляет game.status в БД
3. **Компонент RosterPanel рендерится** — Структура "На паркеті" / "Лавка" есть в коде
4. **CourtIndicator компонент создан** — React.memo компонент с зеленым/серым цветом готов
5. **Логика разделения на-паркет/лавка написана** — `onCourtSet` фильтр есть (строка 65)
6. **getDisplayTime функция есть** — Возвращает `timeOnCourtSeconds` из boxScore

---

## Что НЕ Работает / Требует Исправления ❌

### Проблема #1: **BOXSCORES НЕ СОЗДАЮТСЯ**
- **Состояние:** Game 241 имеет 0 BoxScore записей
- **Симптомы:**
  - `getDisplayTime()` не может найти boxScore, возвращает "00:00"
  - Время на паркете никогда не отображается
  - Невозможно считать статистику игрока
  - `isStarter` поле в BoxScore не может быть использовано
- **Где проблема:** Нет инициализации BoxScore при создании игры
- **Код, который ищет boxScore** (LiveScoreTracker.tsx:263):
  ```javascript
  const boxScore = game.boxScores.find(bs => bs.playerId === playerId);
  ```
  → Найти `undefined` потому что массив `game.boxScores` пустой

### Проблема #2: **ONCOURT ЗАПИСИ НЕ СОЗДАЮТСЯ**
- **Состояние:** Game 241 имеет 0 GameOnCourt записей
- **Симптомы:**
  - RosterPanel использует `game.onCourt` для разделения на-паркет/лавка (строка 65)
  - БЕЗ onCourt записей все игроки попадают в "Лавка" секцию
  - Зеленые индикаторы НЕ ГОРЯТ (т.к. `onCourtSet` всегда пустой)
  - Нет визуального разделения между стартовой пятеркой и лавкой
- **Где проблема:** Нет инициализации GameOnCourt + нет обновления при заменах
- **Код, который использует onCourt** (LiveScoreTracker.tsx:65):
  ```javascript
  const onCourtSet = new Set(game.onCourt.filter(oc => oc.onCourt && oc.teamId === teamId).map(oc => oc.playerId));
  ```
  → Фильтрует пустой массив → `onCourtSet` всегда пустой → все игроки в "Лавка"

### Проблема #3: **СТАРТОВАЯ ПЯТЕРКА НЕ ОТДЕЛЕНА ВИЗУАЛЬНО**
- **Состояние:** Нет разделения между стартовой пятеркой (На паркеті) и лавкой
- **Причина:**
  - BoxScore.isStarter поле существует в схеме, но никогда не заполняется
  - GameOnCourt.isStarter существует, но записи не создаются
  - RosterPanel НЕ использует `isStarter` поле для группировки (должен быть отдельный блок для стартеров)
  - Весь код опирается на `game.onCourt` массив, а не на `isStarter` флаг
- **Что ожидается:**
  - Первые 5 игроков команды должны быть СТАРТЕРАМИ
  - Они должны быть визуально отделены (может быть **жирный шрифт**, другой цвет фона)
  - Остальные 6-7 игроков должны быть в "Лавка" секции

### Проблема #4: **ЗЕЛЕНЫЕ ИНДИКАТОРЫ НЕ ГОРЯТ**
- **Состояние:** Все индикаторы серые (#3a4a5a), никогда не зеленые (#39d983)
- **Причина:**
  - CourtIndicator получает prop `isOnCourt={true}` для на-паркет секции (строка 128)
  - CourtIndicator получает prop `isOnCourt={false}` для лавки (строка 177)
  - БЕЗ GameOnCourt записей **ВСЕ** игроки попадают в лавку (bench раздел)
  - Поэтому **ВСЕ** индикаторы имеют `isOnCourt=false` → серый цвет
- **Решение:** Когда GameOnCourt записи будут созданы и обновлены при заменах, индикаторы автоматически загорятся зеленым

### Проблема #5: **ВРЕМЯ НА ПАРКЕТЕ НЕ РАССЧИТЫВАЕТСЯ**
- **Состояние:** Все игроки показывают "00:00" или не показывают время вообще
- **Причины:**
  1. **BoxScore записи не существуют** → `getDisplayTime()` возвращает "00:00"
  2. **enteredAt не устанавливается** → нет начального времени входа
  3. **timeOnCourtSeconds не обновляется** → нет накопления времени
  4. **recordSubstitution НЕ обновляет GameOnCourt** → статус на-паркет не меняется
- **Код в recordSubstitution (строки 391-411):**
  - ✅ Обновляет BoxScore.timeOnCourtSeconds и enteredAt
  - ❌ НЕ обновляет GameOnCourt.onCourt флаг
  - ❌ НЕ обновляет GameOnCourt.lastSubInTimestamp
- **Что происходит при замене:**
  - BoxScore данные обновляются (время считается)
  - Но `game.onCourt` в response остается неизменный
  - RosterPanel смотрит только на `game.onCourt`, не на BoxScore
  - Игроки не меняют секцию (на-паркет → лавка или наоборот)

### Проблема #6: **ЛОГИКА ЗАМЕНЫ НЕПОЛНАЯ**
- **recordSubstitution() делает:**
  - ✅ Вычисляет время выхода игрока (gameClockSeconds - enteredAt)
  - ✅ Накапливает в timeOnCourtSeconds
  - ✅ Устанавливает enteredAt для входящего игрока
  - ✅ Создает GameEvent для логирования
  - ❌ **НЕ обновляет GameOnCourt.onCourt флаг для выходящего игрока** (TRUE → FALSE)
  - ❌ **НЕ обновляет GameOnCourt.onCourt флаг для входящего игрока** (FALSE → TRUE)
  - ❌ **НЕ обновляет GameOnCourt.lastSubInTimestamp**
- **Результат:** RosterPanel продолжает показывать того же игрока как "На паркеті", потому что `game.onCourt` не изменился

---

## Причины Проблем 🔍

| Проблема | Коренная Причина |
|----------|------------------|
| Нет BoxScore | Нет функции инициализации игры (startGame / setupGame) |
| Нет GameOnCourt | Нет функции инициализации стартовой пятерки |
| Нет визуального разделения | RosterPanel использует только `onCourt` массив, не использует `isStarter` |
| Зеленые индикаторы не горят | Все игроки в "bench" секции из-за пустого `onCourt` массива |
| Время не считается | Хотя BoxScore.timeOnCourtSeconds теоретически может считаться, но: (1) нет BoxScore записей, (2) есть ошибка в логике время (см. ниже) |
| Замена не работает | recordSubstitution() обновляет BoxScore, но НЕ обновляет GameOnCourt флаги |

### Дополнительная Проблема: **ЛОГИКА ВРЕМЕНИ НЕПРАВИЛЬНАЯ**

В `recordSubstitution()` (строки 393-394):
```javascript
const enteredAtValue = playerOut.enteredAt || 0;
const timeAdded = gameClockSeconds - enteredAtValue;
```

**Проблема:** Логика предполагает, что `enteredAt` хранит **gameClock**, но логика обратная:
- Если игрок вошел при gameClock=600 (начало)
- И выходит при gameClock=500 (1 минута позже)
- То `timeAdded = 500 - 600 = -100` → **ОТРИЦАТЕЛЬНОЕ значение!**

**Правильная логика должна быть:**
```javascript
const timeAdded = enteredAtValue - gameClockSeconds; // Обратный порядок!
```

Или хранить `enteredAt` как реальное время в миллисекундах, а не как gameClock.

---

## Что Потрібно Виправити (Конкретні Кроки) 🔧

### 1️⃣ **Создать функцию инициализации игры (initializeGameBoxScores)**
   - Файл: `app/actions/game-events.ts`
   - Создать новую Server Action: `initializeGameBoxScores(gameId, homeTeamId, awayTeamId)`
   - Логика:
     ```
     ДЛЯ КАЖДОГО игрока домашней команды:
       - Создать BoxScore { gameId, playerId, teamId, isStarter: (number < 6) }
       - Создать GameOnCourt { gameId, playerId, teamId, onCourt: (number < 6), isStarter: (number < 6), lastSubInTimestamp: 600 }
     
     ДЛЯ КАЖДОГО игрока гостевой команды:
       - Создать BoxScore { gameId, playerId, teamId, isStarter: (number < 6) }
       - Создать GameOnCourt { gameId, playerId, teamId, onCourt: (number < 6), isStarter: (number < 6), lastSubInTimestamp: 600 }
     ```
   - Вызвать эту функцию при START_GAME

### 2️⃣ **Исправить логику замены в recordSubstitution()**
   - Файл: `app/actions/game-events.ts`
   - Добавить обновление GameOnCourt флагов:
     ```javascript
     // Выходящий игрок
     await tx.gameOnCourt.update({
       where: { gameId_playerId: { gameId, playerId: playerOutId } },
       data: { onCourt: false }
     });
     
     // Входящий игрок
     await tx.gameOnCourt.update({
       where: { gameId_playerId: { gameId, playerId: playerInId } },
       data: { onCourt: true, lastSubInTimestamp: gameClockSeconds }
     });
     ```

### 3️⃣ **Исправить математику времени в recordSubstitution()**
   - Файл: `app/actions/game-events.ts` (строки 393-394)
   - Изменить:
     ```javascript
     // БЫЛО (НЕПРАВИЛЬНО):
     const timeAdded = gameClockSeconds - enteredAtValue;
     
     // СТАЛО (ПРАВИЛЬНО):
     const timeAdded = enteredAtValue - gameClockSeconds; // Или использовать Date.now()
     ```
   - Альтернатива: хранить `enteredAt` как `Date.now()` в миллисекундах, а не как gameClock

### 4️⃣ **Обновить RosterPanel для визуального разделения стартовой пятерки**
   - Файл: `components/live-tracker/LiveScoreTracker.tsx` (строки 54-202)
   - Добавить новую секцию "Стартерів" ПЕРЕД "На паркеті"
   - Логика:
     ```javascript
     const starters = onCourt.filter(p => /* получить isStarter из boxScore */);
     const nonStarters = onCourt.filter(p => !/* isStarter */);
     
     // Рендер:
     // 1. "⭐ Стартерів (5)" с жирным шрифтом / другим фоном
     // 2. "На паркеті (5)" с обычным форматированием (если есть замены)
     // 3. "Лавка (X)"
     ```
   - Или просто добавить визуальное различие в стиле (жирный шрифт для starters)

### 5️⃣ **Убедиться, что данные включают все необходимые поля**
   - В LiveScoreTracker.tsx: убедиться, что `boxScore.isStarter` доступен
   - Может быть, нужно расширить включение `boxScores` в запросе Game

### 6️⃣ **Добавить инициализацию при загрузке игры в админ-панели**
   - Файл: `app/admin/games/[id]/page.tsx`
   - При загрузке игры со статусом SCHEDULED, автоматически вызвать `initializeGameBoxScores`
   - ИЛИ добавить кнопку "Инициализировать игру" в UI

---

## Диагностический Тест

Запущен тест: `diagnostic-livescoretracker.js`

**Результат:**
```
Game ID: 241
Home Team: Mighty Ducks (11 players)
Away Team: Димчасті Леопарди (7 players)

❌ BoxScores count: 0
❌ OnCourt records count: 0
```

**Вывод:** БЕЗ инициализации BoxScore и GameOnCourt, LiveScoreTracker не может работать.

---

## Рекомендованный Порядок Исправлений

1. **Создать `initializeGameBoxScores()` Server Action** (10 мин)
2. **Исправить логику времени в `recordSubstitution()`** (5 мин)
3. **Добавить GameOnCourt обновления в `recordSubstitution()`** (5 мин)
4. **Обновить RosterPanel для визуального разделения стартеров** (15 мин)
5. **Протестировать инициализацию при START_GAME** (10 мин)

**Всего: ~45 минут**

---

## Заключение

**Основная проблема:** LiveScoreTracker компонент ГОТОВ и работает, но опирается на данные (BoxScore + GameOnCourt), которых **НЕ СУЩЕСТВУЕТ в базе**.

**Сравнение:**
- ✅ UI компонент готов (RosterPanel, CourtIndicator, getDisplayTime)
- ✅ Логика разделения готова (onCourtSet фильтр)
- ✅ Timer работает
- ❌ Инициализация данных ОТСУТСТВУЕТ
- ❌ Обновление при заменах НЕПОЛНОЕ

**Решение:** Добавить инициализацию данных и завершить логику обновления GameOnCourt при заменах.

