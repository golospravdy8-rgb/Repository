# 🏀 FIBA EVENT ENGINE IMPLEMENTATION PLAN

## ✅ ЩО Я СТВОРИВ (до затвердження)

### 1️⃣ **FIBA_SCHEMA_PROPOSAL.md** — Prisma модулі
- ✅ GameEvent (розширена з fouledPlayerId, foulType, gameClockSeconds)
- ✅ BoxScore (з всіма FIBA полями: fg2Made, ftAttempted, foulsPersonal тощо)
- ✅ GameSubstitution (з gameClockSeconds)
- ✅ GameOnCourt (без змін, відключеного для таймінгу)
- ✅ SQL migration skeleton

### 2️⃣ **lib/fiba/types.ts** — TypeScript Union Types
```typescript
type FibaAction =
  | FieldGoalAction      // 2PT, 3PT
  | FreeThrowAction      // FT_MADE, FT_MISS
  | ReboundAction        // REBOUND_DEF, REBOUND_OFF
  | PassAction           // ASSIST
  | StealAction          // STEAL
  | BlockAction          // BLOCK
  | TurnoverAction       // TURNOVER
  | FoulAction           // P, T, U, D, C
  | SubstitutionAction   // IN, OUT
  | TimeoutAction        // TIMEOUT
  | QuarterAction        // QUARTER_END, GAME_END
```

✅ **Интерфейсы для каждого типа:**
- TwoPointShotAction, ThreePointShotAction (з eventContext)
- PersonalFoulAction (з fouledPlayerId)
- PlayerSubstitutionAction (з playerOutId для автоматичної пари)
- FreeThr rowAction (з ftSequence)
- Всі інші дії

### 3️⃣ **lib/fiba/fiba-event-engine.ts** — Main Engine (750+ рядків)

```typescript
recordFibaEvent(action: FibaAction): Promise<FibaEventResult>
```

✅ **Handlers для всіх типів:**
- `handleFieldGoal()` — fg2Made, fg2Attempted, fg3Made, fg3Attempted
- `handleFreeThrow()` — ftMade, ftAttempted, та game score increment
- `handleRebound()` — reboundsOff, reboundsDef, rebounds
- `handleAssist()`, `handleSteal()`, `handleBlock()`, `handleTurnover()`
- `handleFoul()` — автоматичного DQ на 5+ фолів, розділ по типам (P/T/U/D)
- `handleSubstitution()` — автоматичного розрахунку timeOnCourtSeconds
- `handleTimeout()`

✅ **Кожен handler:**
- Одна Prisma transaction (atomic)
- Обчислює gameClockSeconds (600 - timeLeft)
- Оновлює Game (score), GameEvent, BoxScore, GameOnCourt
- Повертає `FibaEventResult` з ID та валідацією

### 4️⃣ **lib/fiba/stats-calculator.ts** — Statistics Helper (500+ рядків)

✅ **Основні функції:**
- `calculateEfficiency()` — FIBA формула: (PTS+REB+AST+STL+BLK) - (FGA-FGM+FTA-FTM+TO)
- `formatCourtTime()` — MM:SS format
- `getPlayerCourtTime()` — with current segment if on-court
- `calculateFGPercentage()` — 2P%, 3P%, FT%
- `calculatePlayerStats()` — bulk calculation for protocol
- `getTeamFoulCount()` — per quarter
- `isTeamInBonus()` — 5+ фолів = штрафні

### 5️⃣ **lib/fiba/legacy-wrappers.ts** — Backward Compatibility (600+ рядків)

✅ **Тонкі обгортки для всіх старих функцій:**

```typescript
// Все тісно викликає recordFibaEvent()

export async function addScoreWithType(
  gameId, teamId, playerId, points, eventType
) {
  // Points === 1 → FT_MADE
  // Points === 2 → 2PT
  // Points === 3 → 3PT
  await recordFibaEvent({...});
}

export async function addFoul(...) {
  await recordFibaEvent({ type: "FOUL", foulType: "PERSONAL", ... });
}

export async function addFoulTechnical(...) {
  await recordFibaEvent({ type: "FOUL", foulType: "TECHNICAL", ... });
}

export async function addSubstitution(gameId, teamId, playerId, action) {
  const subtype = action === "in" ? "IN" : "OUT";
  await recordFibaEvent({ type: "SUBSTITUTION", subtype, ... });
}

// ... + 25 більше обгорток
```

---

## 📋 НАСТУПНІ КРОКИ (чекаю затвердження)

### КРОК 1A: Оновити prisma/schema.prisma

1. Додати нові поля до GameEvent моделі:
   - fouledPlayerId
   - foulType (enum: PERSONAL | TECHNICAL | UNSPORTSMANLIKE | DISQUALIFYING)
   - wasShooting
   - ftSequence, ftSuccess
   - gameClockSeconds
   - Перейменувати eventSubtype → eventContext

2. Додати нові поля до BoxScore:
   - fg2Made, fg2Attempted, fg3Made, fg3Attempted
   - ftMade, ftAttempted
   - foulsPersonal, foulsTechnical, foulsUnsports, foulsDisq
   - isFouledOut, isDisqualified

3. Додати поле до GameSubstitution:
   - gameClockSeconds
   - playerOutId (для пари)

### КРОК 1B: Запустити міграцію

```bash
npx prisma migrate dev --name fiba_event_system_v1
```

### КРОК 2: Замінити імпорти в actions/game.ts

Замість локальних функцій (addScore, addFoul тощо), імпортувати з legacy-wrappers:

```typescript
// Старе:
export async function addScore(...) { /* 100 рядків логіки */ }

// Нове:
export { addScoreWithType, addFoul, addReboundDef } from "@/lib/fiba/legacy-wrappers";
```

### КРОК 3: Перевірити тип інтеграції

Старі функції з actions/game.ts можуть мати додаткову логіку (achievements, revalidatePath).
Потрібно зберегти цю функціональність.

Наприклад:
```typescript
export async function addScore(gameId, teamId, playerId, points) {
  const { newAchievements } = await addScoreWithType(gameId, teamId, playerId, points, "normal");
  
  // Старе: sync achievements
  // await syncAchievements(playerId);
  
  revalidatePath(`/admin/games/${gameId}`);
  revalidatePath(`/game/${gameId}`);
  // ...
  
  return { newAchievements };
}
```

### КРОК 4: Оновити SecretarialProtocol компонент

Компонент вже читає BoxScore. Змінюючи структуру BoxScore, він автоматично буде мати:
- fg2Made, fg2Attempted → 2P% розрахунок
- fg3Made, fg3Attempted → 3P% розрахунок
- ftMade, ftAttempted → FT% розрахунок
- foulsPersonal, foulsTechnical, foulsUnsports, foulsDisq → правильний виклад фолів

Потрібні мінімальні зміни в Template:
```typescript
// Старе:
<td>{player.points}-{player.rebounds}-{player.assists}</td>

// Нове:
<td>
  {player.fgMade}-{player.fgAttempted} ({player.fgPercent}%)
  {player.ftMade}-{player.ftAttempted} ({player.ftPercent}%)
</td>
```

### КРОК 5: Додати Running Score (опціонально на першому етапі)

Компонент SecretarialProtocol може отримувати Play-by-Play лог:
```typescript
<RunningScoreTable events={game.events} />
```

Для кожного evento відобразити:
- Гравець, дія, точки
-累計 home score, away score

---

## 🎯 ПЕРЕВАГИ РЕАЛІЗАЦІЇ

### ✅ Архітектурні переваги:

1. **Single Source of Truth** — recordFibaEvent() виконує всю логіку
2. **Atomic Transactions** — кожна дія = одна Prisma транзакція
3. **Type Safety** — FibaAction Union охоплює все
4. **Backward Compatible** — LiveScoreTracker.tsx НЕ змінюється
5. **FIBA Compliant** — всі поля для офіційного протоколу

### ✅ Функціональні переваги:

1. **fouledPlayerId** — вирішує "на кого був фол"
2. **gameClockSeconds** — точний час для Play-by-Play
3. **foulType розділення** — P/T/U/D окремо трекуються
4. **Автоматичний DQ** — на 5 фолів гравець видаляється
5. **Running Score** — можливо розрахувати з eventContext
6. **Court Time** — правильно розраховується на sub OUT

### ✅ Maintainability:

1. Вся нова логіка в lib/fiba/ (відділена від legacy)
2. Старі функції простої обгортки (2-3 рядка)
3. Легко додати нові типи подій
4. Легко скасувати legacy-wrappers (вийти з режиму сумісності)

---

## ❓ ПИТАННЯ ПЕРЕД ЗАТВЕРДЖЕННЯМ

1. **fouledPlayerId** — як обробити в UI?
   - Зараз: опціонально в action
   - Можемо: додати окремо select в UI (або залишити null)

2. **Free Throws** — логіка штрафних?
   - Зараз: FT як окремий FibaAction або як points=1 у FIELD_GOAL
   - Рекомендація: залишити як FT_MADE через addScoreWithType(gameId, teamId, playerId, 1)

3. **Plus/Minus** — повна реалізація?
   - Зараз: заглушка в stats-calculator
   - Потребує: логування enter/exit за часом для на-коurt periods
   - Рекомендація: на КРОК 2 (детальніше)

4. **PDF** — залишити html2canvas або заміняти?
   - Зараз: комп фіксує структуру, PDF якість підвищується автоматично
   - Рекомендація: спочатку html2canvas, потім перейти на pdf-lib

---

## 📊 ФАЙЛОВА СТРУКТУРА

```
lib/fiba/
├── types.ts                  // FibaAction union + interfaces
├── fiba-event-engine.ts      // recordFibaEvent() + handlers
├── stats-calculator.ts       // efficiency, court-time, percentages
└── legacy-wrappers.ts        // addScore, addFoul, тощо

actions/
├── game.ts                   // ЗАМІНА: імпортувати з legacy-wrappers

prisma/
├── schema.prisma             // ОНОВИТИ: нові поля

components/
└── SecretarialProtocol.tsx   // МІНІМАЛЬНА ЗМІНА: нові BoxScore поля
```

---

## ✅ ГОТОВО К ЗАТВЕРДЖЕННЮ?

Якщо все добре виглядає, скажи:

```
ЗАТВЕРДЖУЮ КРОК 1: Schema + Types
```

І я почну:
1. Актуальне оновлення schema.prisma
2. Міграція Prisma
3. Інтеграція з actions/game.ts
4. Тестування з LiveScoreTracker

