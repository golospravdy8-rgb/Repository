# 🕐 Public Game Page — Court Time Synchronization

## Проблема, яка була вирішена

На публічній сторінці `/game/[id]` у таблиці складу команди в колонці **ХВ** (Хвилини в грі) відображались невірні значення або прочерки, хоча в адмінці (`/admin/games/[id]`) час гравців правильно накопичувався.

### Причина
- В адмінці час накопичується в React-стані `playerTimeTrackers`
- На публічній сторінці час обчислювався з историчних подій заміни, а не з актуальних даних
- Обновлення часу в базі ніколи не зберігалось

---

## Рішення (4 компоненти)

### 1️⃣ **Новий Server Action: `updatePlayerCourtTimes()`**
**Файл:** `actions/game.ts`

```typescript
export async function updatePlayerCourtTimes(
  gameId: number,
  playerCourtTimes: Record<number, number>  // playerId -> seconds
)
```

**Що робить:**
- Приймає словник часів (playerId → секунди)
- Конвертує кожне значення в формат MM:SS
- Оновлює `BoxScore.minutesPlayed` для кожного гравця
- Інvalidate кеші для `/game/{id}` і `/admin/games/{id}`

**Формула формування:**
```
minutesPlayed = "MM:SS" (e.g., "5:30" для 330 секунд)
```

---

### 2️⃣ **Синхронізація з адмін-панелі**
**Файл:** `components/live-tracker/LiveScoreTracker.tsx`

#### Нова функція:
```typescript
const syncCourtTimesToServer = useCallback(async (
  trackers: Record<number, PlayerTimeTracker>
) => {
  const playerCourtTimes: Record<number, number> = {};
  Object.entries(trackers).forEach(([playerIdStr, tracker]) => {
    playerCourtTimes[parseInt(playerIdStr, 10)] = tracker.timeOnCourtSeconds;
  });
  await updatePlayerCourtTimes(game.id, playerCourtTimes);
}, [game.id]);
```

#### Де викликається синхронізація:

**a) При ЗАМЕНІ гравця:**
```typescript
const handleSubstitution = (playerOutId, playerInId) => {
  // ... обробка логіки часу ...
  syncCourtTimesToServer(updated);  // Синхронізація!
}
```

**б) ПЕРИОДИЧНО кожні 5 секунд (під час таймера):**
```typescript
useEffect(() => {
  if (!timerRunning) return;
  const syncInterval = setInterval(() => {
    setPlayerTimeTrackers(current => {
      syncCourtTimesToServer(current);  // Синхронізація!
      return current;
    });
  }, 5000);
  return () => clearInterval(syncInterval);
}, [timerRunning, syncCourtTimesToServer]);
```

---

### 3️⃣ **Публічна сторінка вживає синхронізовані дані**
**Файл:** `app/(public)/game/[id]/page.tsx`

#### Нова helper функція:
```typescript
function formatCourtTime(seconds: number): string {
  if (seconds === 0) return "0:00";
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}
```

#### Оновлена логіка для отримання часу:
**Було (неправильно):**
```typescript
const minutes = calcPlayerMinutes(bs.playerId, teamId, g.substitutions, bs.isStarter);
// Обчислювалось з подій, не з актуальних даних
```

**Стало (правильно):**
```typescript
// Використовує збережений час з адмінки, или fallback до розрахунку
const minutes = bs.minutesPlayed || 
  calcPlayerMinutes(bs.playerId, teamId, g.substitutions, bs.isStarter);
```

---

## Потік даних (Flow)

```
┌─────────────────┐
│   ADMIN PANEL   │
│ /admin/games/id │
└────────┬────────┘
         │
         │ 1. Player gravi on-court
         │    timeOnCourtSeconds += 1 (кожну секунду)
         │
         ├─→ 2. Sync every 5 sec + at substitutions
         │      → Server Action: updatePlayerCourtTimes()
         │
         ├─→ 3. BoxScore.minutesPlayed updated
         │      in database
         │
         ├─→ 4. revalidatePath('/game/{id}')
         │
┌────────▼────────┐
│ PUBLIC PAGE     │
│ /game/id        │
└────────┬────────┘
         │
         │ 5. Fetch game with boxScores
         │    including minutesPlayed
         │
         ├─→ 6. Use formatCourtTime()
         │      convert MM:SS to display
         │
         └─→ 7. Column ХВ shows real time!
              (e.g., "5:30")
```

---

## Технічні деталі

### Database Schema
**BoxScore model** уже має необхідне поле:
```prisma
minutesPlayed    String?  // Format: "MM:SS"
```

### Синхронізаційна частота
- **При таймері:** кожні 5 секунд
- **При заміні:** відразу (без затримки)
- **На конец матчу:** час зберігається в DB

### Fallback логіка
Якщо `BoxScore.minutesPlayed` не доступний (старі дані), публічна сторінка fallback'ує до розрахунку з подій:
```typescript
const minutes = bs.minutesPlayed || calcPlayerMinutes(...);
```

---

## Тестування

### На адмін-панелі:
1. Відкрити матч: `/admin/games/232`
2. Почати таймер
3. Спостерігати час біля гравців (зростає)
4. Зробити замену
5. Перевірити, що час при заміні синхронізується

### На публічній сторінці:
1. Відкрити матч: `/game/232`
2. Перезагрузити сторінку (F5)
3. Перевірити колону ХВ у таблиці складу
4. Має показувати MM:SS формат (не прочерки!)

### Команди для перевірки:

**Адмін:**
```
# В консолі браузера DevTools
// Перевірити стан playerTimeTrackers
console.log(playerTimeTrackers);

// Перевірити, чи викликається sync
// (дивиться в console.log messages)
```

**Публічна сторінка:**
```
# Мережа
- Open DevTools → Network
- Refresh page
- Перевірити запит GET /game/232
- Перевірити, що boxScores містять minutesPlayed
```

---

## PDF Експорт

При натисканні **"Завантажити протокол PDF"** на сторінці `/game/[id]`:
1. Компонент `GamePdfButton` отримує дані гри з сервера
2. Дані містять актуальні `BoxScore.minutesPlayed`
3. PDF генерується з реальними часами

**Файл:** `components/public/GamePdfButton.tsx`
(не потребує змін — автоматично використовує актуальні дані)

---

## Архітектура синхронізації

### Адмінка (Real-time, локальна)
```
React State (playerTimeTrackers)
    ↓ (every 5s + at sub)
Server Action (updatePlayerCourtTimes)
    ↓
Database (BoxScore.minutesPlayed)
```

### Публічна сторінка (Server-rendered)
```
Database (BoxScore.minutesPlayed)
    ↓ (on fetch)
Server Component (/game/[id]/page.tsx)
    ↓
formatCourtTime() helper
    ↓
HTML Table (column ХВ)
```

---

## Можливі оптимізації (Future)

1. **Real-time public updates:** Додати WebSocket для live update на публічній сторінці без перезагрузки
2. **Micro-sync:** Синхронізувати не кожні 5 секунд, а кожну секунду (більш часто)
3. **Batch operations:** Синхронізувати тільки змінені гравців (не всіх)
4. **Cache control:** Настроїти ISR (Incremental Static Regeneration) для `/game/[id]`

---

## Commit & Deployment

**Commit:** `68398d7`
**Branch:** main
**Статус:** ✅ Deployed to Vercel production

---

## Контрольний список

- ✅ Server Action для оновлення часів
- ✅ Синхронізація з адмінки (5-sec + на замену)
- ✅ Публічна сторінка використовує BoxScore.minutesPlayed
- ✅ formatCourtTime() helper функція
- ✅ Build passing без помилок
- ✅ Git commit створений
- ✅ Vercel deployment завершений

---

## FAQ

**Q: Чому 5 секунд, а не кожну секунду?**
A: Баланс між точністю і нагрузкою на сервер. Зменшує кількість DB операцій.

**Q: Що якщо матч закритий неповністю?**
A: Час буде синхронізуватись останній раз, коли матч був активний. Публічна сторінка покаже це значення.

**Q: Працює на мобільних?**
A: Так. formatCourtTime() - звичайна функція, не має залежностей від платформи.

**Q: Як PDF експорт отримує дані?**
A: PDF компонент отримує дані гри з сервера в момент натискання. Дані містять актуальні BoxScore.minutesPlayed.

---

## Контакти для питань

Якщо виникли проблеми:
1. Перевірити консоль браузера DevTools для помилок
2. Перевірити Network tab для запитів до сервера
3. Перевірити адмін-панель, чи синхронізація працює
4. Дивись логи: `[syncCourtTimesToServer]` в консолі
