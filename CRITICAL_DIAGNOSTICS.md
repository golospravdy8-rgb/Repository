# 🔴 КРИТИЧНА ДІАГНОСТИКА: FIBA Event Engine

## 1️⃣ ЛОГІКА ІГРОВОГО ЧАСУ (ВОЛ / MIN) — КРИТИЧНА ПРОБЛЕМА 🚨

### Проблема #1: gameClockSeconds — ДЕФЕКТНЕ

**Де я запропонував:**
```typescript
const gameClockSeconds = QUARTER_DURATION - game.currentTimeLeft;
```

**ПРОБЛЕМА:**
- `game.currentTimeLeft` — це **залишена час в чверті** (спадає з 600 до 0)
- Коли timer жене, `currentTimeLeft` оновляється в БД **асинхронно**
- На момент натиску кнопки `currentTimeLeft` може бути **застарілим** (лаг 100-500ms)
- `gameClockSeconds` буде **неточним** на 1-5+ секунд

**Приклад баг-сценарію:**
```
17:55:30 — гравець забиває (currentTimeLeft = 294)
        → gameClockSeconds = 600 - 294 = 306
17:55:35 — сервер отримав, але запис в БД на 300ms пізніше
        → А timer уже перейшов до 293!
        → gameClockSeconds записується неправильно
```

**РІШЕННЯ:**
- ❌ Не використовувати `game.currentTimeLeft` (затримано)
- ✅ Передавати `gameClockSeconds` з **фронту** (UI знає точний час)
- ✅ LiveScoreTracker має локальний `timeLeft` state — використати його!

**Виправка:**
```typescript
// В LiveScoreTracker.tsx — гавай через runAction()
onClick={() => runAction(() => addScoreWithType(
  game.id, selectedTeamId, selectedPlayerId, 2,
  eventType,
  { gameClockSeconds: 600 - timeLeft }  // ← ДОДАЙ ЦЬОМУ
))}

// В legacy-wrappers.ts
export async function addScoreWithType(
  gameId, teamId, playerId, points, eventType,
  metadata?: { gameClockSeconds?: number }  // ← НОВА ОПЦІЯ
) {
  await recordFibaEvent({
    type: "FIELD_GOAL",
    subtype,
    gameId, teamId, playerId, points, eventContext,
    gameClockSeconds: metadata?.gameClockSeconds || (600 - timeLeft)
  });
}
```

---

### Проблема #2: Таймер (startTimer) не синхронізується з substituciями

**Що відбувається:**
1. Timer жене кожну сек (setInterval)
2. setTick() оновлює UI без Prisma
3. **Але** substitution записується в БД асинхронно
4. Коли гравець замінюється в 5:30, БД записує час
5. **Але** локальний `playerTimeTrackers` в LiveScoreTracker état може бути неактуальним!

**ПРОБЛЕМА:** Розбіжність між локальним state та БД при замінах.

**РІШЕННЯ:**
- Після кожної substitution (addSubstitution виклику) — **fetch оновлену GameOnCourt** з сервера
- Или: використати WebSocket для синхронізації
- Или: пересчитати локальні трекери на основі gameClockSeconds + events

---

### Проблема #3: Зелені лампочки (CourtIndicator)

**Це ПРАВИЛЬНО:**
```typescript
const CourtIndicator = React.memo(({ isOnCourt, timerRunning }) => {
  const active = isOnCourt && timerRunning;
  return <span style={{ background: active ? "#39d983" : "#3a4a5a" }} />
});
```

✅ Горять тільки коли on court AND timer running.

**АЛЕ:** Якщо substitution не синхронізується (проблема #2), гавці не будуть правильно показані як `onCourt`.

---

### Оцінка ВОЛ/MIN логіки: **4/10** 🔴

- ❌ gameClockSeconds брато з застарілого `game.currentTimeLeft`
- ❌ Нема синхронізації substitutions ↔ timer
- ⚠️ CourtIndicator логіка ОК, але залежить від точної data
- ✅ Формула розрахунку (timeOnCourtSeconds + segment) правильна

---

## 2️⃣ ВСЯКА КНОПКА З ПАНЕЛІ — ФІБА MAPPING

### РЯД 1: Заміна, Таймаут, Відкат, Скасувати, Завершити

| Кнопка | FibaAction | Дані | Бракує |
|--------|-----------|------|--------|
| **Заміна** | SUBSTITUTION IN/OUT | playerId, teamId | ❌ Взаємна пара (playerOutId) — вводиться вручну в модалі |
| **Тайм-аут** | TIMEOUT | teamId | ✅ OK |
| **↩ Відкат** | ❌ НЕМАЄ | N/A | ❌ **undoLastEvent** брато з actions, але не через recordFibaEvent! |
| **Скасувати** | ❌ НЕМАЄ | N/A | ❌ **Дублікат** Відкату (одна і та ж дія) |
| **Завершити** | QUARTER_END → GAME_END | gameId | ✅ OK |

---

### РЯД 2: Очки (1, 2, 3) + Підбір (З, Н)

| Кнопка | FibaAction | Дані | Бракує |
|--------|-----------|------|--------|
| **+1** | FREE_THROW (FT_MADE) | points=1 | ✅ OK, але вважається як FT (правильно) |
| **+2** | FIELD_GOAL (2PT) | points=2, eventContext | ⚠️ `eventContext` опціональна, часто буде "normal" |
| **+3** | FIELD_GOAL (3PT) | points=3, eventContext | ⚠️ Те ж саме |
| **Підбір (З)** | REBOUND (DEF) | teamId, playerId | ✅ OK |
| **Підбір (Н)** | REBOUND (OFF) | teamId, playerId | ✅ OK |

---

### РЯД 3: Промахи (1, 2, 3), Втрата, Фол П, Неспорт.

| Кнопка | FibaAction | Дані | Проблема |
|--------|-----------|------|----------|
| **1 Невлучно** | FIELD_GOAL_MISS (MISS_2PT) | ✅ | ✅ |
| **2 Невлучно** | FIELD_GOAL_MISS (MISS_2PT) | ✅ | ✅ (дублікат 1-го!) |
| **3 Невлучно** | FIELD_GOAL_MISS (MISS_3PT) | ✅ | ✅ |
| **Втрата** | TURNOVER | ✅ | ✅ |
| **Фол П** | FOUL (PERSONAL) | playerId, teamId | ❌ fouledPlayerId MISSING! |
| **Неспорт.** | FOUL (UNSPORTSMANLIKE) | playerId, teamId | ❌ fouledPlayerId MISSING! |

**🚨 КРИТИЧНА ПРОБЛЕМА:** Фолы **НЕ записують на кого вони були!**
- Кнопка знає який гравець натискав кнопку (foulingPlayer)
- Але **на кого був фол** — невідомо!
- FIBA вимагає обох!

**РІШЕННЯ:** Після натиску "Фол" — показати модаль "На кого був фол?" з селектором гравців супротивної команди.

---

### РЯД 4: Передача, Перехват, Блокшот + Тренеру, Техніч.

| Кнопка | FibaAction | Дані | Статус |
|--------|-----------|------|--------|
| **Передача** | ASSIST | playerId | ✅ OK |
| **Перехват** | STEAL | playerId | ✅ OK |
| **Блокшот** | BLOCK | playerId | ✅ OK |
| **Тренеру** | FOUL (COACH) | teamId (not playerId) | ⚠️ ОК, але на які-то не привязується |
| **Техніч.** | FOUL (TECHNICAL) | playerId | ✅ OK, але як і особистий фол — **нема fouledPlayerId** |

---

### РЯД 5: Тип дії (Звичайний, 2й шанс, Швидкий відрив) + Дискв.

| Кнопка | FibaAction | Дані | Статус |
|--------|-----------|------|--------|
| **Звичайний ✓** | — | (тільки встановлює eventType state) | ✅ OK |
| **2й шанс** | — | (eventContext = "second_chance") | ✅ OK |
| **Швидкий відрив** | — | (eventContext = "fastbreak") | ✅ OK |
| **Дискв.** | FOUL (DISQUALIFYING) | playerId | ✅ OK, але **МОЖЕ БУТИ НА ГРІЛІ!** |

**⚠️ UX ПРОБЛЕМА:** Кнопка "Дискв." находится в рядку з eventType toggles. Гравець може випадково натиснути, вважаючи це eventType button.

---

## 📋 ПОВНИЙ СПИСОК КНОПОК × FIBA МАТРИЦЯ

| # | Кнопка | FibaAction | Дані OK? | fouledPlayerId? | gameClockSeconds? | Примітка |
|---|--------|-----------|----------|----------------|------------------|---------|
| 1 | Заміна | SUBSTITUTION | ⚠️ Потрібен modal | - | ✅ | Требує playerOutId |
| 2 | Тайм-аут | TIMEOUT | ✅ | - | ✅ | OK |
| 3 | ↩ Відкат | undoLastEvent | ❌ | - | ❌ | НЕ через recordFibaEvent! |
| 4 | Скасувати | (дублікат 3) | ❌ | - | ❌ | Дублікат! |
| 5 | Завершити | QUARTER_END | ✅ | - | ✅ | OK |
| 6 | +1 | FT_MADE | ✅ | - | ❌ | Нема gameClockSeconds |
| 7 | +2 | 2PT | ✅ | - | ❌ | Нема gameClockSeconds |
| 8 | +3 | 3PT | ✅ | - | ❌ | Нема gameClockSeconds |
| 9 | Підбір (З) | REBOUND_DEF | ✅ | - | ❌ | Нема gameClockSeconds |
| 10 | Підбір (Н) | REBOUND_OFF | ✅ | - | ❌ | Нема gameClockSeconds |
| 11 | 1 Невлучно | MISS_2PT | ✅ | - | ❌ | Нема gameClockSeconds |
| 12 | 2 Невлучно | MISS_2PT | ✅ | - | ❌ | **ДУБЛІКАТ #11!** |
| 13 | 3 Невлучно | MISS_3PT | ✅ | - | ❌ | Нема gameClockSeconds |
| 14 | Втрата | TURNOVER | ✅ | - | ❌ | Нема gameClockSeconds |
| 15 | Фол П | FOUL (P) | ✅ | ❌ **MISSING!** | ❌ | 🚨 На кого фол?! |
| 16 | Неспорт. | FOUL (U) | ✅ | ❌ **MISSING!** | ❌ | 🚨 На кого фол?! |
| 17 | Передача | ASSIST | ✅ | - | ❌ | Нема gameClockSeconds |
| 18 | Перехват | STEAL | ✅ | - | ❌ | Нема gameClockSeconds |
| 19 | Блокшот | BLOCK | ✅ | - | ❌ | Нема gameClockSeconds |
| 20 | Тренеру | FOUL (COACH) | ✅ | - | ❌ | Нема gameClockSeconds |
| 21 | Техніч. | FOUL (T) | ✅ | ❌ **MISSING!** | ❌ | 🚨 На кого фол?! |
| 22 | Звичайний | (eventType) | ✅ | - | - | OK |
| 23 | 2й шанс | (eventType) | ✅ | - | - | OK |
| 24 | Швидкий відрив | (eventType) | ✅ | - | - | OK |
| 25 | Дискв. | FOUL (D) | ✅ | ❌ **MISSING!** | ❌ | 🚨 На кого фол?! UX проблема |

---

## 3️⃣ ЩО ПОТРІБНО ДОДАТИ/ЗМІНИТИ

### 🔴 КРИТИЧНІ (без них система не буде FIBA-compliant):

1. **gameClockSeconds из фронту**
   - Передавай `600 - timeLeft` з LiveScoreTracker
   - Не зберегай на `game.currentTimeLeft`

2. **fouledPlayerId для всіх фолів**
   - Модаль після натиску: "На кого був фол?"
   - Селектор гравців супротивної команди
   - Обов'язковий вибір (або skip = null)

3. **Синхронізація substitutions**
   - Після addSubstitution → fetch GameOnCourt оновлену
   - Или WebSocket
   - Или: пересчитай playerTimeTrackers з GameSubstitution events

4. **undoLastEvent через recordFibaEvent**
   - Не прямий DB delete
   - Потрібна DELETE GameEvent → автоматично перерахувати BoxScore
   - Потрібна аудит логика (хто скасував, коли, чому)

### 🟠 ВАЖЛИВЕ (для повної FIBA сумісності):

5. **Дублікат кнопок**
   - Видали "Скасувати" (це просто копія "↩ Відката")
   - Видали дублікат "1 Невлучно" та "2 Невлучно" (обидва MISS_2PT)

6. **Штрафні броски**
   - Отримування FT в результаті фолу
   - Логика: Особистий/Неспорт/Технічний фол → 1 FT + мяч (або 2 FT)
   - Зараз: немає

7. **eventContext валідація**
   - Фільтруй invalid values (тільки normal/fastbreak/second_chance/off_turnover)
   - Зараз: будь-яка строка пройде

### 🟡 МОЖНА ПОЧЕКАТИ (Phase 2):

8. Plus/Minus full tracking
9. Running score display
10. PDF якість

---

## 4️⃣ ТЕСТ-КЕЙСИ

### ТК-1: Забив 2-очковий без штрафних

```
Дія: Обраний гравець #7, натиснув "+2"
Очікуваний результат:
  - GameEvent.create({
      type: "FIELD_GOAL",
      subtype: "2PT",
      playerId: 7,
      teamId: 5,
      points: 2,
      quarter: 1,
      gameClockSeconds: 306,  // ← ЗНА точно!
      eventContext: "normal"
    })
  - BoxScore.update({
      points: +2,
      fgMade: +1,
      fgAttempted: +1,
      fg2Made: +1,
      fg2Attempted: +1
    })
  - Game.update({ homeScore: +2 })

Реальність:
  ❌ gameClockSeconds не передається! Буде залежати від `game.currentTimeLeft`
  ✅ Все інше правильно
```

---

### ТК-2: Фол на гравця (#7) від гравця (#42)

```
Дія: Обраний гравець #42 (defender), натиснув "Фол П"
Очікуваний результат (FIBA):
  - На кого був фол? → МОДАЛЬ (потрібна!)
  - Вибрав #7 (attacker)
  - GameEvent.create({
      type: "FOUL",
      foulType: "PERSONAL",
      playerId: 42,      // fouler
      fouledPlayerId: 7, // fouled ← ЦЕ КРИТИЧНО!
      teamId: 5,
      quarter: 1,
      gameClockSeconds: 306
    })
  - BoxScore[42].update({ foulsPersonal: +1, fouls: +1 })
  - Якщо це shooting foul:
      * BoxScore[7].update({ ... await штрафні броски ... })

Реальність:
  ❌ НЕМАЄ модалі для вибору fouledPlayerId!
  ❌ fouledPlayerId = null завжди
  ❌ Нема logic для shooting fouls
  ❌ Нема логики для штрафних бросків

Результат: НЕПОВНА FIBA-дані
```

---

### ТК-3: 5-й фол гравця (#42)

```
Дія: Гравець #42 отримав 5-й фол
Очікуваний результат:
  - BoxScore[42].update({ isFouledOut: true })
  - GameOnCourt[42].update({ onCourt: false }) ← auto-remove
  - Гравець більше не на площе!

Реальність:
  ✅ Логіка в engine правильна
  ❌ АЛЕ: якщо синхронізація (проблема #2) не відповідає,
        онCourt status може не оновитись в LiveScoreTracker UI
  ⚠️ Зелені лампочки не погаснуть відразу?
```

---

### ТК-4: Заміна в середині 4-го чверті (5:30)

```
Дія: Натиснув "Заміна" → обраний гравець #42
    → Модаль: "Кого замінити?" → обраний #18
    → Натиснув "ОК"
    
Очікуваний результат:
  - GameSubstitution.create({
      playerId: 42,
      playerOutId: 18,
      action: "IN",
      gameClockSeconds: 270,
      quarter: 4
    })
  - GameSubstitution.create({
      playerId: 18,
      action: "OUT",
      gameClockSeconds: 270,
      quarter: 4
    })
  - GameOnCourt[42].update({ onCourt: true, lastSubInTimestamp: 270 })
  - GameOnCourt[18].update({
      onCourt: false,
      timeOnCourtSeconds: (попередні) + (270 - 123)
    })
  - Protocol відобразить час на площе для #18 коректно

Реальність:
  ⚠️ Модаль для вибору playerOutId існує? (див. на коді)
  ✅ Да, є
  ❌ АЛЕ: якщо сервер виконує дві substitution по черзі (2 транзакції),
        є race condition!
  ⚠️ Потрібна атомарна парна заміна в одній транзакції!
```

---

### ТК-5: Отмена (Undo) останньої дії

```
Дія: Натиснув "↩ Відкат"
Очікуваний результат:
  - Знайти останній GameEvent
  - Видалити його
  - Перерахувати BoxScore
  - Перерахувати Game.homeScore/awayScore
  - Перерахувати efficiency

Реальність:
  ❌ undoLastEvent() викликає actions/game.ts напряму, НЕ через recordFibaEvent()
  ❌ Немає логики для перерахунку BoxScore при видаленні event
  ❌ Нема audit-логи для скасування
  
Результат: НЕПОВНА реалізація
```

---

### ТК-6: Штрафні броски після неспортивного фолу

```
Дія: Гравець #42 (home) отримав неспортивний фол від #7 (away)
Очікуваний результат (FIBA):
  - GameEvent (FOUL UNSPORTSMANLIKE) записаний
  - BoxScore[7].foulsUnsports: +1
  - Гравець #42 отримує 1 штрафний кидок + мяч
  - Яких НАБІР подій:
    1. FOUL (U) на #42
    2. FREE_THROW (FT_MADE або FT_MISS) від #42
    3. Possession returns to home team

Реальність:
  ❌ Нема нічого з цього!
  ❌ Немає logic для штрафних бросків після фолів
  ❌ Можливо, вручну натиснути "+1" вважаючи це FT?
  
Результат: НЕПРАВИЛЬНА FIBA-обробка
```

---

### ТК-7: Running Score для протоколу

```
Дія: Запитання для протоколу
Очікуваний результат:
  Event 1: Player 42 забив +2 → Score 2-0
  Event 2: Player 7 забив +3 → Score 2-3
  Event 3: Player 42 забив +1 (FT) → Score 3-3
  ...
  
Реальність:
  ❌ Нема running score в протоколі
  ❌ Немає логики для обчислення
  ❌ Нема display в SecretarialProtocol
  
Результат: НЕПОВНА protocol реалізація
```

---

## 5️⃣ ПОТОЧНИЙ СТАТУС ІНТЕГРАЦІЇ

### Що потрібно ЗАРАЗ:

1. **Оновити prisma/schema.prisma**
   ```bash
   # Створи migration
   npx prisma migrate dev --name fiba_event_system_v1
   ```

2. **Створити lib/fiba/ директорію та 4 файли**
   ```
   lib/fiba/
   ├── types.ts                  (700 строк)
   ├── fiba-event-engine.ts      (800 строк)
   ├── stats-calculator.ts       (500 строк)
   └── legacy-wrappers.ts        (600 строк)
   ```

3. **Оновити actions/game.ts**
   - Заміни function bodies на imports з legacy-wrappers

4. **Додати модалі в LiveScoreTracker.tsx**
   - Модаль "На кого був фол?" для всіх типів фолів
   - Модаль "Кого замінити?" для substitutions

5. **Запустити build**
   ```bash
   npm run build
   npm run dev
   ```

### Команди в цьому порядку:

```bash
# 1. Update schema
npx prisma migrate dev --name fiba_event_system_v1

# 2. Install types (if needed)
npm install @types/prisma

# 3. Build
npm run build

# 4. Run dev server
npm run dev

# 5. Test all buttons work
# (manual browser testing)
```

---

## 6️⃣ ЗАГАЛЬНА ОЦІНКА ГОТОВНОСТІ

### Score по компонентам:

| Компонент | Оцінка | Статус | Примітка |
|-----------|--------|--------|----------|
| **Types** | 9/10 | ✅ | Повна, але потребує fouledPlayerId input |
| **Engine** | 7/10 | ⚠️ | Логіка OK, але gameClockSeconds з БД затримано |
| **Stats** | 8/10 | ✅ | Формули правильні, efficiency OK |
| **Wrappers** | 6/10 | ⚠️ | Потребують gameClockSeconds з фронту |
| **Game time** | 4/10 | 🔴 | Критична затримка, нема синхронізації |
| **Buttons mapping** | 5/10 | 🔴 | Нема fouledPlayerId, дублікати, нема FT-logic |
| **Modals** | 2/10 | 🔴 | Заміна OK, але фол-модаль НЕ існує |
| **Protocol** | 6/10 | ⚠️ | Структура OK, але нема running score |
| **Backward compat** | 9/10 | ✅ | Вся система backward-compatible |
| **FIBA compliance** | 4/10 | 🔴 | Багато critical missing pieces |

---

### ИТОГОВАЯ ОЦІНКА: **5.5/10** 🔴

### Статус готовності к реальному використанню:

```
❌ НЕ ГОТОВ до production
⚠️  Готов до Phase 1 (schema + migration) + Phase 1.5 (modals + fixes)
✅ Архітектура правильна, але реалізація неповна
```

---

## 🚨 КРИТИЧНІ ВИПРАВКИ ПЕРЕД PHASE 1

### Мінімум для запуску:

1. **ОБОВ'ЯЗКОВО:** Додай gameClockSeconds в сигнатуру addScoreWithType()
2. **ОБОВ'ЯЗКОВО:** Додай модаль для fouledPlayerId
3. **ОБОВ'ЯЗКОВО:** Синхронізація GameOnCourt після substitution
4. **ОБОВ'ЯЗКОВО:** undoLastEvent через recordFibaEvent()
5. **ВАЖЛИВО:** FT логіка для фолів (shooting foul → 1-2 FT)

### Можна відкласти на Phase 2:

- Running score
- Plus/Minus full tracking
- PDF якість

---

## 📊 МАТРИЦЯ ПРОБЛЕМ × КРИТИЧНІСТЬ

```
╔═══════════════════════════════════════════════════════════════╗
║           КРИТИЧНІСТЬ                                         ║
║  🔴 Без цього система НЕПРАВИЛЬНА (FIBA違反)               ║
║  🟠 Без цього система НЕПОВНА (buggy)                        ║
║  🟡 Без цього система НЕПРАКТИЧНА (UX проблема)             ║
╚═══════════════════════════════════════════════════════════════╝

🔴 КРИТИЧНІ (MUST FIX):
  1. gameClockSeconds з БД затримано
  2. fouledPlayerId MISSING для всіх фолів
  3. undoLastEvent не через recordFibaEvent
  4. Нема FT-логіки після фолів
  5. Дублікат кнопок (Невлучно, Відкат/Скасувати)

🟠 ВАЖЛИВІ (SHOULD FIX):
  1. Синхронізація GameOnCourt після sub
  2. Попарна atomicity для substitutions
  3. eventContext валідація

🟡 ПРОБЛЕМИ UX (NICE TO HAVE):
  1. Дискв. кнопка в чужому рядку
  2. Нема FT sequence tracking
  3. Running score не відображається
```

---

## ✅ РЕКОМЕНДАЦІЯ

**Не запускати Phase 1 поки не будуть FIXED:**

1. ✅ Додай gameClockSeconds з UI
2. ✅ Додай модаль для fouledPlayerId
3. ✅ Додай FT-логіку
4. ✅ Синхронізація substitutions

**ТОДІ** можна запускати migration + code gen.

**ЧАС:** 2-3 години на ці виправки + тестування.

