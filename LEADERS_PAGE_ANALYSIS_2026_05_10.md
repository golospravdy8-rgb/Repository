# 📊 АНАЛІЗ СТОРІНКИ «ЛІДЕРИ СЕЗОНУ» — ТЕХНІЧНИЙ ЗВІТ
**Дата:** 2026-05-10 | **Версія:** v1.0 | **Статус:** ✅ ФУНКЦІОНАЛЬНА ЗІ ОБМЕЖЕННЯМИ

---

## 1. ТЕКУЩЕЕ СОСТОЯНИЕ

### 1.1 Архітектура (серверна частина)

**Файли:**
- `app/(public)/leaders/page.tsx` — SSR сторінка (Next.js Server Component)
- `components/public/LeadersSection.tsx` — Client Component з табами та фільтрами
- `lib/stats-calculator.ts` — логіка агрегації статистики
- `app/api/leaders/weekly/route.ts` — API для тижневих лідерів (не використовується на сторінці)

**Поточний flow:**
1. Сторінка отримує параметр `?ag=younger|older` (вікова група)
2. Знаходить активний сезон для групи
3. Запитує из БД всі boxScores для ігор зі статусом `FINAL` або `LIVE`
4. Передає дані у `calculateLeaderStats()` для агрегації
5.렌деру `LeadersSection` компонент з результатами

### 1.2 Поточна функціональність

✅ **Працює:**
- Фільтр за віковою групою (U-14 / U-16) — 2 кнопки на мобілці, текст на десктопі
- 5 табів: Очки, Підбори, Передачі, Блоки, Перехоплення
- Сортування ТОП-10 по обраній статистиці
- Герой-картка лідера (з фото, рейтингом, кількістю ігор)
- Таблиця на десктопі (6 колонок)
- Мобільні карточки (3 колонки статистики)
- Обробка отсутності даних (сообщение)
- Медалі для рейтингу (🥇🥈🥉)

❌ **НЕ працює / частково:**
- Коефіцієнт успішності бросків (FG%) — немає на сторінці
- 3-очкові % — немає
- Вільні кидки % — немає
- Хвилини на майданчику (MPG) — немає
- Гра ПО КОМАНДАХ — немає табу/фільтра
- Гра ПО ПОЗИЦІЯМ — немає
- Тижневі лідери (API існує, але не використовується)
- Поточні лідери (протягом сезону, не на сторінці)

### 1.3 Дефекти та странности

| № | Проблема | Тип | Вплив | Статус |
|---|----------|------|--------|--------|
| 1 | `scale-125` на батьківському div | UX | Весь контент збільшений на 125% | Покривається CLAUDE.md |
| 2 | Неповна статистика в LeaderStats | Data | Немає FG%, 3P%, FT%, MPG | Блокує розширення |
| 3 | Жорсткі 5 табів | UX | Неможна додати нові статистики | Архітектурне обмеження |
| 4 | Без табу «Всі команди» / «По позиціям» | Product | Обмежена функціональність | Планована фіча |
| 5 | `scale-125` чинить помилки на мобілці | UX | Може бути обрізане на малих екранах | Critical |

---

## 2. ОЖИДАЕМАЯ ФУНКЦІОНАЛЬНІСТЬ (по аналогії з NBA.com, FIBA)

### 2.1 Основні сценарії

**Сценарій 1: Перегляд загальних лідерів (поточна реалізація)**
```
Користувач → Обирає вікову групу → Обирає категорію → Бачить ТОП-10 гравців
```

**Сценарій 2: Лідери по командах (планований)**
```
Користувач → Обирає вікову групу → Обирає команду → Бачить лідерів цієї команди
```

**Сценарій 3: Лідери по позиціях (планований)**
```
Користувач → Обирає вікову групу → Обирає позицію (C, F, G) → Бачить ТОП гравців на цій позиції
```

**Сценарій 4: Деталі гравця (планований)**
```
Користувач → Клацає на гравця → Переходить на /players/[id] з усіма розпалами
```

### 2.2 Що ПОВИННО бути на сторінці

**Верхньої блок:**
```
Лідери сезону
Вікова група: [U-14 / U-16]  (на мобілці — кнопки, на десктопі — текст)
```

**Второй блок — Навігаційні таби (основна категорія):**
```
Сортування по:
  📊 Очки (PPG) — найбільш релевантна
  🔄 Передачі (APG)
  📦 Підбори (RPG)
  🛡️ Блоки (BPG)
  🤲 Перехоплення (SPG)
  💪 Рейтинг (Rating) — агрегована метрика
  ⏱️ Хвилини (MPG) — для контексту активності
```

**Третій блок — Доповнювальні фільтри (у вигляді меню / seconda line табів):**
```
▸ Усі команди (за замовчуванням)
  └─ Або обрати конкретну команду зі списку
▸ Усі позиції (за замовчуванням)
  └─ Або обрати: PG (розігравець) | SG (гравець) | SF (крайній) | PF (потужний) | C (центр)
▸ Період: Весь сезон | Останні 5 ігор | Останній місяць (якщо є дата)
```

**Четвертий блок — Герой (лідер по обраній категорії):**
```
┌─────────────────────────────────────────┐
│  🥇 ЛІДЕР — ОЧКИ                        │
│  [Фото 40x40]  Максим Бережинський    │
│                ДП Ліцей № 81          │
│                                    0.9  │
│                              оч/гру     │
│                                12 ігор  │
└─────────────────────────────────────────┘
```

**П'ятий блок — Таблиця / Карточки (ТОП-10 або ТОП-20):**

**На ДЕСКТОПІ (таблиця 7-8 колонок):**
```
┌──┬────────────────┬──────────┬─────┬────────┬──────┬──────┐
│# │ ГРАВЕЦЬ        │ КОМАНДА  │ ІГРИ│ РЕЙТИНГ│ ОЧКИ │ %    │
├──┼────────────────┼──────────┼─────┼────────┼──────┼──────┤
│1 │ Максим Б.      │ ЛЦ 81    │ 12  │ 52 🥇  │ 0.9  │ ---- │
│2 │ Гнат Музика    │ ДІМ      │ 10  │ 52 🥇  │ 0.9  │ ---- │
│..│ ...            │ ...      │ ... │ ...    │ ...  │ ...  │
└──┴────────────────┴──────────┴─────┴────────┴──────┴──────┘
Легенда: # = місце, ОЧКИ = обрана категорія, % = FG% або обраний %
```

**На МОБІЛЦІ (карточки):**
```
┌─────────────────────────────────────┐
│ Максим Бережинський      #1         │
│ ДП Ліцей № 81                      │
│ ─────────────────────────────────── │
│  ІГРИ    РЕЙТИНГ    ОЧКИ (обрано)   │
│   12      52 🥇        0.9          │
└─────────────────────────────────────┘
```

**Шостий блок — Випадок відсутності даних:**
```
┌─────────────────────────────────────┐
│         🏀                          │
│  Статистика ще не доступна         │
│  Лідери з'являться після перших ігор│
└─────────────────────────────────────┘
```

---

## 3. НЕОБХІДНІ КОМПОНЕНТИ

### 3.1 Архітектурна схема (бажана)

```
LeadersPage (SSR)
├── getLeadersData(ag, seasonId)  ← Отримати boxScores
│   └── prisma.boxScore.findMany()
├── filterAndAggregate()           ← Розрахувати PPG, RPG і т.д.
│   └── calculateLeaderStats()
└── LeadersSection (Client)
    ├── <LeaderFilters />          ← НОВИЙ: фільтри (команда, позиція, період)
    │   ├── <AgeGroupSelector />   ← НОВИЙ: U-14 / U-16
    │   ├── <TeamFilter />         ← НОВИЙ: список команд
    │   └── <PositionFilter />     ← НОВИЙ: PG/SG/SF/PF/C
    ├── <LeaderTabs />             ← СУЩЕСТВУЮЩИЙ: очки, подборы і т.д.
    ├── <HeroCard />               ← СУЩЕСТВУЮЩИЙ: герой-карточка
    │   └── <PlayerCard />         ← НОВЫЙ: переиспользуемая карточка
    ├── <LeaderTable />            ← DESKTOP: таблиця (розширена)
    │   └── rows: PlayerTableRow
    ├── <LeaderCards />            ← MOBILE: карточки
    │   └── PlayerCard[]
    └── <EmptyState />             ← СУЩЕСТВУЮЩИЙ: сообщение об отсутствии
```

### 3.2 Нові компоненти для розширення

| Компонент | Назва файлу | Тип | Призначення |
|-----------|-------------|------|-----------|
| `<LeaderFilters />` | `LeadersFilter.tsx` | Client | Фільтри по команді, позиції, періоду |
| `<TeamSelector />` | `TeamSelector.tsx` | Client | Dropdown / кнопки команд |
| `<PositionSelector />` | `PositionSelector.tsx` | Client | PG/SG/SF/PF/C (або зображення) |
| `<StatCategoryTabs />` | `StatCategoryTabs.tsx` | Client | Табы дефолтних + розширених категорій |
| `<HeroCard />` | `HeroCard.tsx` | Client | Герой-карточка (переизпользуемый) |
| `<LeaderTable />` | `LeaderTable.tsx` | Client | Таблиця з сортуванням |
| `<PlayerTableRow />` | `PlayerTableRow.tsx` | Client | 1 рядок таблиці |
| `<PlayerCard />` | `PlayerCard.tsx` | Client | Карточка гравця (для мобілки) |
| `<LeadersPagination />` | `LeadersPagination.tsx` | Client | Пагінація (ТОП-10 / ТОП-20 / Всі) |

---

## 4. СТРУКТУРА ДАНИХ

### 4.1 LeaderStats (поточна типізація)

```typescript
export type LeaderStats = {
  playerId: number;
  firstName: string;
  lastName: string;
  teamName: string;
  teamShortName: string;
  photoUrl: string | null;
  ppg: number;        // очки на гру
  rpg: number;        // підбори на гру
  apg: number;        // передачі на гру
  spg: number;        // перехоплення на гру
  bpg: number;        // блоки на гру
  val: number;        //Value = PTS + REB + AST + STL + BLK - FOULS
  gamesPlayed: number;
  rating: number;     // 0-99
  tier: "gold" | "silver" | "bronze";
};
```

### 4.2 ExtendedLeaderStats (бажаний розширений формат)

```typescript
export type ExtendedLeaderStats = LeaderStats & {
  // Нові поля
  position?: "PG" | "SG" | "SF" | "PF" | "C"; // з таблиці Player.position
  
  // Проценти
  fgPercent: number;     // FG% = fgMade / fgAttempted * 100
  fg2Percent: number;    // 2P% = fg2Made / fg2Attempted * 100
  fg3Percent: number;    // 3P% = fg3Made / fg3Attempted * 100
  ftPercent: number;     // FT% = ftMade / ftAttempted * 100
  
  // Хвилини
  mpg: number;           // Хвилини на гру (totalMinutes / gamesPlayed)
  totalMinutes: number;  // Усього хвилин на сезон
  
  // Розроблені статистики
  per: number;           // Player Efficiency Rating
  ts_percent: number;    // True Shooting %
  
  // Дополнительно
  strikeData?: {
    lastGame?: {
      ppg: number;
      date: string;
    };
    streak: number;      // Кількість ігор підряд з очками
  };
  
  // Фільтри
  teamId: number;
  seasonId: number;
};
```

### 4.3 JSON з бекенду (рекомендована структура)

**GET /api/leaders?ag=younger&sort=ppg&team=undefined&position=undefined**

```json
{
  "success": true,
  "data": {
    "season": {
      "id": 1,
      "name": "2025-2026",
      "ageGroup": "younger"
    },
    "filters": {
      "ageGroup": "younger",
      "team": null,
      "position": null,
      "sortBy": "ppg"
    },
    "leaders": [
      {
        "playerId": 1,
        "firstName": "Максим",
        "lastName": "Бережинський",
        "position": "PG",
        "teamId": 5,
        "teamName": "ДП Ліцей № 81",
        "teamShortName": "ЛЦ",
        "photoUrl": "https://...",
        "stats": {
          "ppg": 0.9,
          "rpg": 2.1,
          "apg": 3.2,
          "spg": 1.5,
          "bpg": 0.8,
          "fgPercent": 45.5,
          "fg2Percent": 48.0,
          "fg3Percent": 33.3,
          "ftPercent": 75.0,
          "mpg": 24.5,
          "totalMinutes": 294,
          "rating": 52,
          "tier": "gold"
        },
        "gamesPlayed": 12
      },
      ...
    ],
    "totalPlayers": 32,
    "pagination": {
      "limit": 10,
      "offset": 0,
      "hasMore": true
    }
  }
}
```

### 4.4 Структура запиту на бекенд (для оптимізації)

```typescript
// lib/api/leaders.ts
export async function getLeaders(params: {
  ag: "younger" | "older";
  sortBy?: "ppg" | "rpg" | "apg" | "spg" | "bpg" | "rating" | "mpg";
  teamId?: number;
  position?: "PG" | "SG" | "SF" | "PF" | "C";
  limit?: number;  // default 10
  offset?: number; // default 0
}): Promise<ExtendedLeaderStats[]>
```

---

## 5. РЕКОМЕНДАЦІЇ ПО ВОССТАНОВЛЕНИЮ / РОЗШИРЕНИЮ

### 5.1 КРИТИЧНІ ПРОБЛЕМИ (MUST FIX)

#### 🔴 Проблема 1: `scale-125` на батьківському контейнері
**Файл:** `app/(public)/leaders/page.tsx:30`
**Статус:** КРИТИЧНО
**Рішення:**
```typescript
// НЕПРАВИЛЬНО (поточно):
<div className="scale-125">
  <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
  
// ПРАВИЛЬНО:
<div className="w-full">
  <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
```
**Вплив:** Вся сторінка масштабується, що спричиняє overflow на мобільних і невірну інтерпретацію `max-w-5xl`

#### 🟠 Проблема 2: Неповна типізація LeaderStats
**Файл:** `lib/stats-calculator.ts:4-20`
**Статус:** HIGH
**Розв'язання:** Розширити `LeaderStats` типом, додати: `fgPercent`, `fg3Percent`, `ftPercent`, `mpg`, `position`

```typescript
export type LeaderStats = {
  // ... existing
  fgPercent: number;
  fg3Percent: number;
  ftPercent: number;
  mpg: number;
  position?: string;
};
```

#### 🟡 Проблема 3: Жорсткі 5 табів
**Файл:** `components/public/LeadersSection.tsx:9-15`
**Статус:** MEDIUM (архітектурне обмеження)
**Розв'язання:** Зробити табы динамічні з конфіга

```typescript
type StatTab = {
  key: StatKey;
  label: string;
  unit: string;
  enabled: boolean;
};

const DEFAULT_TABS: StatTab[] = [
  { key: "ppg", label: "Очки", unit: "оч/гру", enabled: true },
  { key: "rpg", label: "Підбори", unit: "пд/гру", enabled: true },
  // ...
  { key: "mpg", label: "Хвилини", unit: "хв/гру", enabled: false }, // can be toggled
];
```

---

### 5.2 РОЗШИРЕННЯ (NICE TO HAVE)

#### 🟢 Фіча 1: Фільтри по команді та позиції
**Кроки:**
1. Додати `<LeaderFilters />` компонент
2. Передати `teamId`, `position` як search параметри в URL
3. Оновити `calculateLeaderStats()` щоб приймати фільтри
4. Відрендерити відповідний підмножество гравців

**Файли для створення:**
- `components/public/LeaderFilters.tsx` (Client)
- `lib/api/leaders-filter.ts` (логіка фільтрування)

#### 🟢 Фіча 2: Розширена статистика (%, хвилини)
**Кроки:**
1. Розширити `calculateLeaderStats()` щоб обраховувати FG%, 3P%, FT%
2. Додати нові таби в UI
3. Оновити таблицю / карточки щоб показувати нові метрики

**Файли для зміни:**
- `lib/stats-calculator.ts` (нова функція)
- `components/public/LeadersSection.tsx` (табы)
- `components/public/LeaderTable.tsx` (нові колонки)

#### 🟢 Фіча 3: Пагінація (ТОП-10 / ТОП-20 / Всі)
**Кроки:**
1. Додати `<LeadersPagination />` компонент
2. Дозволити користувачеві вибирати limit
3. Оновити таблицю/карточки

#### 🟢 Фіча 4: Тижневі / місячні лідери
**Використати:** `app/api/leaders/weekly/route.ts` як шаблон
**Додати:** Фільтр періоду (Весь сезон | Останні 7 днів | Останні 30 днів)

#### 🟢 Фіча 5: Ссилка на профіль гравця
**Кроки:**
1. Обгорнути карточку гравця в `<Link href={`/players/${playerId}`}>`
2. Переконатись що сторінка `/players/[id]` існує
3. Завантажити детальну статистику там

---

### 5.3 ПЛАН ВОССТАНОВЛЕННЯ / РЕАЛІЗАЦІЇ

**ФАЗА 1: КРИТИЧНІ ВИПРАВЛЕННЯ (1-2 дні)**
- [ ] Видалити `scale-125` з батьківського контейнера
- [ ] Розширити типи `LeaderStats`
- [ ] Обновити `calculateLeaderStats()` з FG%, 3P%, FT%, MPG

**ФАЗА 2: БАЗОВІ ФІЛЬТРИ (2-3 дні)**
- [ ] Створити компонент `<LeaderFilters />`
- [ ] Додати фільтр по командам
- [ ] Додати фільтр по позиціям
- [ ] Оновити URL-параметри

**ФАЗА 3: РОЗШИРЕНІ СТАТИСТИКИ (2-3 дні)**
- [ ] Додати табы для %, хвилин
- [ ] Оновити таблицю на десктопі
- [ ] Оновити карточки на мобілці
- [ ] Додати сортування по новим полям

**ФАЗА 4: ПОЛІРУВАННЯ (1-2 дні)**
- [ ] Пагінація
- [ ] Ссилки на профілі гравців
- [ ] Тести
- [ ] Оптимізація production

---

## 6. ТЕСТОВІ ВХІДНІ ДАНІ

Для тестування функціональності потрібні boxScores для сезону `2025-2026`, вікова група `younger` (U-14), з мінімум 2-3 закінченими іграми.

**Приклад тестового набору:**
```sql
-- Гра 1
INSERT INTO Game (id, homeTeamId, awayTeamId, seasonId, status, scheduledAt)
VALUES (1, 5, 2, 1, 'FINAL', '2026-05-01T10:00:00Z');

-- BoxScores для гравців
INSERT INTO BoxScore (gameId, playerId, teamId, points, rebounds, assists, steals, blocks, fouls)
VALUES 
  (1, 1, 5, 10, 3, 2, 1, 1, 2),  -- 10 очок = 10 PPG для 1 гру
  (1, 2, 2, 8, 4, 3, 0, 0, 1),   -- 8 очок
  ...
```

---

## 7. РЕЗЮМЕ

### Поточний стан
✅ Основна функціональність працює  
✅ UI дружелюбний  
✅ Мобільна оптимізація присутня  
⚠️ Масштабування `scale-125` — потребує видалення  
❌ Розширена статистика відсутня  
❌ Фільтри по командам/позиціям відсутні  

### Пріоритет задач
1. **КРИТИЧНО:** Видалити `scale-125`
2. **HIGH:** Розширити статистику (%, хвилини)
3. **MEDIUM:** Додати фільтри
4. **LOW:** Пагінація, тижневі лідери

### Час реалізації (1 розробник)
- ФАЗА 1: ~4-6 годин (критичні виправлення)
- ФАЗА 2: ~16-24 години (фільтри)
- ФАЗА 3: ~16-24 години (розширена статистика)
- ФАЗА 4: ~8-12 годин (полірування)
- **Усього:** ~2-3 тижні

---

## 8. ФАЙЛИ ОЧЕТЕВОЇ РЕАЛІЗАЦІЇ

```
app/(public)/leaders/
├── page.tsx                      ← Видалити scale-125
└── error.tsx                     ← OK

components/public/
├── LeadersSection.tsx            ← Розширити типи
├── LeaderFilters.tsx             ← НОВИЙ
├── LeaderTable.tsx               ← Розширити колонки
├── PlayerCard.tsx                ← НОВИЙ / переїжджання
└── HeroCard.tsx                  ← Переизпользование

lib/
├── stats-calculator.ts           ← Додати %, MPG
├── api/
│   ├── leaders.ts                ← НОВИЙ API client
│   └── leaders-types.ts          ← НОВИЙ типи
└── achievements.ts               ← OK (рейтинг тірів)

app/api/leaders/
├── route.ts                      ← НОВИЙ основний API
└── weekly/route.ts               ← OK
```

---

## Додаток A: Формули для розрахування

### PPG (Points Per Game)
```
PPG = Σ(points в усіх іграх) / Кількість ігор
```

### FG% (Field Goal Percentage)
```
FG% = (FG Made / FG Attempted) × 100
    = ((fg2Made + fg3Made) / (fg2Attempted + fg3Attempted)) × 100
```

### 3P% (Three-Point Percentage)
```
3P% = (fg3Made / fg3Attempted) × 100
```

### FT% (Free Throw Percentage)
```
FT% = (ftMade / ftAttempted) × 100
```

### MPG (Minutes Per Game)
```
MPG = Σ(timeOnCourtSeconds в усіх іграх) / 60 / Кількість ігор
```

### Rating (Спеціальна формула)
```
Rating = min(99, round(50 + PPG×1.8 + RPG×1.2 + APG×1.5 + SPG×2.0 + BPG×1.8))
```

### VAL (Value Per Game)
```
VAL = (PTS + REB + AST + STL + BLK - FOULS) / Кількість ігор
```

### PER (Player Efficiency Rating) — розширена
```
Достатньо складна, для production version
```

---

**Розроблено:** Senior Full-Stack Developer  
**Для:** basketball.lviv.ua (ЛІГА ЕСУЛАБ)  
**Версія бази даних:** PostgreSQL + Prisma ORM  
**Версія UI:** Next.js 14, React 19, Tailwind CSS v4  
