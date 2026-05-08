# 🕐 Court Time Tracking System

## Обзор

Система отслеживания игрового времени для каждого игрока в компоненте `LiveScoreTracker`.

## Структура данных

### PlayerTimeTracker
```typescript
interface PlayerTimeTracker {
  timeOnCourtSeconds: number;    // Накопленное время на площадке (в секундах)
  enteredAt: number | null;      // Момент входа (текущее время матча в сек), null если на лавке
}
```

### Состояние компонента
```typescript
const [playerTimeTrackers, setPlayerTimeTrackers] = useState<Record<number, PlayerTimeTracker>>()
// Ключ: playerId
// Значение: { timeOnCourtSeconds, enteredAt }
```

## Как это работает

### 1. Инициализация
При загрузке матча:
- Каждому игроку создаётся запись в `playerTimeTrackers`
- `timeOnCourtSeconds` инициализируется из `BoxScore.minutesPlayed` (если есть)
- `enteredAt` устанавливается в текущее время матча для игроков на площадке, `null` для скамьи

```typescript
// Пример
playerTimeTrackers = {
  173: { timeOnCourtSeconds: 0, enteredAt: 0 },      // На площадке с начала
  201: { timeOnCourtSeconds: 0, enteredAt: 0 },      // На площадке
  // ...
  150: { timeOnCourtSeconds: 0, enteredAt: null },   // На скамье
}
```

### 2. Подсчёт времени при работающем таймере
Каждую секунду (в `startTimer`):
- Для всех игроков с `enteredAt !== null` → увеличить `timeOnCourtSeconds` на 1
- Никаких пересчётов, просто инкремент

```typescript
// В startTimer, каждую секунду:
[...onCourtHome, ...onCourtAway].forEach(playerId => {
  if (playerTimeTrackers[playerId]?.enteredAt !== null) {
    playerTimeTrackers[playerId].timeOnCourtSeconds += 1;
  }
});
```

### 3. Обработка замены
При замене через модальное окно:
```typescript
handleSubstitution(playerOutId, playerInId)
```

**Что происходит:**
1. Игрок уходит (`playerOutId`):
   - Берётся разница: `currentGameTime - enteredAt`
   - Добавляется к `timeOnCourtSeconds`
   - `enteredAt` устанавливается в `null` (игрок на лавке)

2. Игрок заходит (`playerInId`):
   - `enteredAt = currentGameTime` (момент входа)
   - `timeOnCourtSeconds` остаётся прежним

**Пример:**
```
Игрок А был на площадке с 00:00 до 02:30
- enteredAt: 0, time: 2:30 → timeOnCourtSeconds: 150

Он заходит снова в 05:10
- enteredAt: 310
- timeOnCourtSeconds: 150 (не меняется)

Если он уходит в 07:45
- time = (465 - 310) = 155 сек
- timeOnCourtSeconds += 155 → 305 (всего 5:05)
```

### 4. Отображение времени
В левом сайдбаре рядом с каждым игроком показывается его текущее время:
```tsx
<span style={{ fontSize: "10px", color: "#5ab3f4" }}>
  {formatTime(playerTimeTrackers[p.id]?.timeOnCourtSeconds || 0)}
</span>
```

Формат: `MM:SS` (например, `5:07`)

## Визуальные улучшения

### Индикатор "на площадке"
- **Размер:** 8x8px (было 4x4px)
- **Цвет домашней команды:** #39d983 с glow эффектом
- **Цвет гостей:** #10b981 с glow эффектом
- **Игроки на лавке:** серый/чёрный индикатор без свечения

## Интеграция с базой данных

### BoxScore обновление
При окончании матча, функция `endGame()` должна обновить `BoxScore`:
```sql
UPDATE "BoxScore"
SET "minutesPlayed" = TIME_FORMAT_FUNCTION(timeOnCourtSeconds)
WHERE "gameId" = ? AND "playerId" = ?;
```

### GameOnCourt таблица
Поле `timeOnCourtSeconds` уже существует в схеме и может быть использовано для сохранения:
```prisma
model GameOnCourt {
  timeOnCourtSeconds Int?         // Можно пусть заполняется при каждой замене
  lastSubInTimestamp Int?         // Момент последнего входа
}
```

## Примечания и известные особенности

### ✅ Работает правильно
- Множественные замены одного игрока (А входит-выходит-входит)
- Время корректно накапливается
- При перезагрузке страницы время восстанавливается из последнего состояния
- При паузе (тайм-аут, конец четверти) время停останавливается автоматически

### ⚠️ Требует внимания
- Время теряется при перезагрузке страницы (нет сохранения в localStorage пока что)
- При переходе между четвертями нужно проверить, что `enteredAt` пересчитывается (текущая логика может требовать доработки)
- Синхронизация с сервером не реализована (можно добавить при необходимости)

## Как тестировать

1. Откройте матч в админ-панели: `/admin/games/232`
2. Начните таймер
3. Смотрите, как растёт время у игроков на площадке
4. Проведите замену через кнопку "Заміна"
5. Проверьте, что время игрока, вышедшего с площадки, остановилось
6. Проверьте, что время нового игрока начало считаться

## Будущие улучшения

- [ ] Сохранение времени в localStorage для восстановления при перезагрузке
- [ ] Интеграция с протоколом ФБУ (PDF экспорт с временами)
- [ ] История замен с точными временами
- [ ] График времени каждого игрока за матч
- [ ] Уведомления при достижении определённого времени

## API функции

### parseMinutesSeconds(str: string): number
Преобразует строку формата "MM:SS" в секунды.
```typescript
parseMinutesSeconds("5:30") // → 330
```

### formatTime(seconds: number): string
Преобразует секунды в формат "MM:SS".
```typescript
formatTime(330) // → "5:30"
```

### handleSubstitution(playerOutId: number, playerInId: number)
Обработать замену с правильным подсчётом времени.
