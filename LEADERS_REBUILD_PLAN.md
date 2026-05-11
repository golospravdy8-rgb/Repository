# 🚀 ПЛАН ВОССТАНОВЛЕНИЯ И РАСШИРЕНИЯ СТРАНИЦЫ "ЛІДЕРИ СЕЗОНУ"

## АРХИТЕКТУРА КОМПОНЕНТОВ (обновленная)

```
app/(public)/leaders/
├── page.tsx                    ← SSR, удалить scale-125, передать данные
└── error.tsx                   ← OK

components/public/leaders/     ← НОВАЯ ПАПКА (структурировано)
├── index.ts                    ← экспорт всех компонентов
├── LeadersPage.tsx             ← главный контейнер (Client)
├── LeaderTabs.tsx              ← табы (Очки, Подборы, ...)
├── LeaderFilters.tsx           ← фильтры (команда, позиция, поиск, лимит)
├── LeaderHero.tsx              ← героическая карточка №1
├── LeaderTable.tsx             ← настольная таблица (Desktop)
├── LeaderCards.tsx             ← мобильные карточки
├── PlayerRow.tsx               ← одна строка таблицы
└── EmptyState.tsx              ← пустое состояние

lib/
├── stats-calculator.ts         ← ⚡ РАСШИРИТЬ (добавить %, MPG, формулы)
├── leaders/                    ← НОВАЯ ПАПКА
│   ├── types.ts                ← ExtendedLeaderStats, фильтры
│   ├── utils.ts                ← функции фильтрации, сортировки
│   └── calculations.ts         ← FG%, 3P%, FT%, Rating, VAL
└── achievements.ts             ← OK (getRatingTier)

app/api/leaders/
├── route.ts                    ← НОВЫЙ основной endpoint (GET /api/leaders)
└── weekly/route.ts             ← OK (неиспользуется)
```

## ЭТАПЫ РЕАЛИЗАЦИИ

### ЭТАП 1: КРИТИЧЕСКИЕ ИСПРАВЛЕНИЯ (30 мин)
- [x] Удалить `scale-125` из page.tsx
- [x] Исправить типы LeaderStats
- [x] Обновить calculateLeaderStats с процентами

**Результат:** Page загружается без масштабирования, табы работают

### ЭТАП 2: РАСШИРЕННАЯ СТАТИСТИКА (1-1.5 ч)
- [x] Добавить FG%, 3P%, FT%, 2P% в типы
- [x] Добавить MPG (минуты на игру)
- [x] Расширить UI табов (показать новые категории)
- [x] Обновить таблицу и карточки

**Результат:** 10+ категорий для сортировки (вместо 5)

### ЭТАП 3: ФИЛЬТРЫ И ПОИСК (2-2.5 ч)
- [x] Фильтр по команде (dropdown или radiogroup)
- [x] Фильтр по позиции (PG/SG/SF/PF/C)
- [x] Поиск по имени игрока
- [x] Переключение Топ-10 / Топ-20 / Все

**Результат:** Полноценные фильтры в UI, state management в LeadersPage

### ЭТАП 4: СОРТИРОВКА И ОПТИМИЗАЦИЯ (1-1.5 ч)
- [x] Сортировка таблицы по клику на заголовок
- [x] Ссылки на профиль игрока (/players/[id])
- [x] Loading state
- [x] Оптимизация re-renders (React.memo)

**Результат:** Полная функциональность UI, быстрые re-renders

### ЭТАП 5: ПОЛИРОВАНИЕ И СТИЛЬ (1-1.5 ч)
- [x] Медали (🥇🥈🥉) на всех местах
- [x] Красивые пустые состояния
- [x] Адаптив (мобилка / планшет / десктоп)
- [x] Туман загрузки (skeleton)

**Результат:** Production-ready страница

---

## ТИПЫ ДАННЫХ

### LeaderStats (текущая)
```typescript
export type LeaderStats = {
  playerId: number;
  firstName: string;
  lastName: string;
  teamName: string;
  teamShortName: string;
  photoUrl: string | null;
  ppg: number;
  rpg: number;
  apg: number;
  spg: number;
  bpg: number;
  val: number;
  gamesPlayed: number;
  rating: number;
  tier: "gold" | "silver" | "bronze";
};
```

### ExtendedLeaderStats (новая)
```typescript
export type ExtendedLeaderStats = LeaderStats & {
  position?: "PG" | "SG" | "SF" | "PF" | "C";
  
  // Проценты
  fgPercent: number;     // FG% = (fg2Made + fg3Made) / (fg2Attempted + fg3Attempted) * 100
  fg2Percent: number;    // 2P%
  fg3Percent: number;    // 3P%
  ftPercent: number;     // FT%
  
  // Минуты
  mpg: number;           // Минуты за игру
  totalMinutes: number;  // Всего минут в сезон
  
  // Расширено
  per?: number;          // Player Efficiency Rating (optional)
  ts_percent?: number;   // True Shooting % (optional)
  
  // Для фильтрации
  teamId: number;
  seasonId: number;
};
```

### LeaderFilters (новая)
```typescript
export type LeaderFilters = {
  sortBy: "ppg" | "rpg" | "apg" | "spg" | "bpg" | "rating" | "fgPercent" | "fg3Percent" | "ftPercent" | "mpg" | "val";
  team?: number;           // undefined = все команды
  position?: "PG" | "SG" | "SF" | "PF" | "C"; // undefined = все позиции
  search?: string;         // поиск по имени
  limit: 10 | 20 | 999;   // сколько показывать
  direction: "asc" | "desc";
};
```

---

## ФОРМУЛЫ РАСЧЕТА

### FG% (Field Goal Percentage)
```
FG% = ((fg2Made + fg3Made) / (fg2Attempted + fg3Attempted)) × 100
```

### 2P% (Two-Point Percentage)
```
2P% = (fg2Made / fg2Attempted) × 100
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
MPG = (totalMinutes / gamesPlayed)
```

### Rating (уже существует)
```
Rating = min(99, round(50 + PPG×1.8 + RPG×1.2 + APG×1.5 + SPG×2.0 + BPG×1.8))
```

### VAL (Value)
```
VAL = (PTS + REB + AST + STL + BLK - FOULS) / Кол-во игр
```

---

## ШАГИ РЕАЛИЗАЦИИ

### Шаг 1: Подготовка типов
1. Создать `lib/leaders/types.ts` с ExtendedLeaderStats
2. Обновить `lib/stats-calculator.ts` для вычисления новых метрик
3. Создать `lib/leaders/calculations.ts` для процентов и MPG

### Шаг 2: Обновить page.tsx
1. Удалить `scale-125`
2. Убедиться, что данные передаются корректно

### Шаг 3: Создать новые компоненты
1. LeaderTabs.tsx (динамические)
2. LeaderFilters.tsx (с фильтрами)
3. LeaderHero.tsx (№1)
4. LeaderTable.tsx (расширенная)
5. LeaderCards.tsx (мобильные)

### Шаг 4: Собрать LeadersPage.tsx
1. State для фильтров
2. Вычисление отфильтрованного списка
3. Рендер компонентов

### Шаг 5: Стилизация и адаптив
1. Tailwind классы
2. Responsive дизайн
3. Animations

---

## ТАБЫ / КАТЕГОРИИ (список)

| Ключ | Название | Единица | Порядок |
|------|----------|---------|---------|
| ppg | Очки | оч/гру | 1 |
| rpg | Підбори | пд/гру | 2 |
| apg | Передачі | пе/гру | 3 |
| bpg | Блокшоти | бл/гру | 4 |
| spg | Перехоплення | пр/гру | 5 |
| rating | Рейтинг | пункти | 6 |
| fgPercent | FG% | % | 7 |
| fg2Percent | 2P% | % | 8 |
| fg3Percent | 3P% | % | 9 |
| ftPercent | FT% | % | 10 |
| mpg | Хвилини | хв/гру | 11 |
| val | Вартість | VAL | 12 |

---

## ФАЙЛЫ КОТОРЫЕ БУДУ СОЗДАВАТЬ

1. ✅ `lib/leaders/types.ts`
2. ✅ `lib/leaders/calculations.ts`
3. ✅ Update `lib/stats-calculator.ts`
4. ✅ Update `app/(public)/leaders/page.tsx`
5. ✅ `components/public/leaders/LeaderTabs.tsx`
6. ✅ `components/public/leaders/LeaderFilters.tsx`
7. ✅ `components/public/leaders/LeaderHero.tsx`
8. ✅ `components/public/leaders/LeaderTable.tsx`
9. ✅ `components/public/leaders/LeaderCards.tsx`
10. ✅ `components/public/leaders/LeadersPage.tsx`
11. ✅ Update `components/public/LeadersSection.tsx` → delete (use LeadersPage instead)

---

## ТЕСТИРОВАНИЕ

После каждого этапа:
1. `npm run build` → проверить 0 TS ошибок
2. `http://localhost:3006/leaders?ag=younger` → проверить UI
3. Клик на табы → проверить фильтрацию
4. Фильтры → проверить состояние
5. Мобилка → проверить адаптив

---

**Начинаю реализацию. Буду отправлять код поэтапно.**
