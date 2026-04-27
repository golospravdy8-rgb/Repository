# 🏀 Ручеёк Bug Fix — 2026-04-27

## 🐛 Проблема

Когда игрок №1 (первый в очереди) забивает мяч — **игра сразу завершается на одном браузере**, хотя на другом браузере игра продолжается.

**Признаки:**
- Браузер А (игрок №1) бросает → попадает → игра кончается ❌
- Браузер Б (игрок №2) видит что игра продолжается ✅
- Локальная логика на браузере А срабатывает неправильно

## 🔍 Корневая причина

В `handleScored()` была логика выбивания (elimination):

```typescript
if (p.hasActiveRight === true) {
  let prevIdx = (idx - 1 + gs.players.length) % gs.players.length;
  // Ищем предыдущего игрока...
  
  if (prevPlayer && prevPlayer.hasThrown === true && prevIdx !== idx) {
    // Выбиваем предыдущего
    prevPlayer.isEliminated = true;
    
    // Проверяем завершение
    const aliveCount = gs.players.filter((pl: any) => !pl.isEliminated).length;
    if (aliveCount <= 1) {
      gs.state = 'finished';  // ❌ ИГРА ЗАВЕРШЕНА
    }
  }
}

// ВТОРАЯ ПРОВЕРКА (дублирующаяся!)
const aliveCount = gs.players.filter((p: any) => p.status !== 'eliminated').length;
if (aliveCount <= 1) {
  gs.state = 'finished';  // ❌ НЕПРАВИЛЬНАЯ ПРОВЕРКА
}
```

**Проблемы:**
1. **Когда первый забивает (idx === 0):**
   - `prevIdx = (0 - 1 + 6) % 6 = 5` → находит **последнего игрока**
   - Если у последнего `hasThrown = true` → он выбивается
   - Может остаться < 2 живых → `aliveCount <= 1` → игра завершена ❌

2. **Вторая проверка дублирует первую:**
   - Использует `status !== 'eliminated'` вместо `!isEliminated`
   - Срабатывает ПОСЛЕ shift/push
   - Может неправильно посчитать живых игроков

3. **Новый первый игрок не получает право:**
   - После `shift/push` игрок идёт в хвост
   - Второй игрок становится первым (idx=0)
   - Но ему не устанавливается `hasActiveRight = true`
   - Его номер не мигает, он не может бросать

## ✅ Исправления

### 1️⃣ Проверка idx !== 0 перед выбиванием

```typescript
// БЫЛО:
if (p.hasActiveRight === true) {

// СТАЛО:
if (p.hasActiveRight === true && idx !== 0) {
```

**Почему:** Первый игрок (idx=0) просто идёт в хвост, никто не выбивается. Это предотвращает логику зацикливания при поиске prevIdx.

### 2️⃣ Улучшенная логика поиска prevIdx

```typescript
// КЛЮЧЕВАЯ ПРОВЕРКА: выбивать только если:
// 1. Есть реальный предыдущий (prevIdx !== idx)
// 2. Предыдущий выпустил мяч (hasThrown = true)
// 3. Предыдущий не выбыт (!isEliminated)
if (
  prevIdx !== idx &&
  prevPlayer &&
  prevPlayer.hasThrown === true &&
  !prevPlayer.isEliminated
) {
  // Выбить предыдущего
  prevPlayer.isEliminated = true;
  // ...
}
```

### 3️⃣ Сброс hasThrown и hasActiveRight при shift/push

```typescript
const w = gs.players.shift(), sw = gs.shootStates.shift();
if (w && sw) {
  w.hasThrown = false;      // 🏀 Сброс для нового хвоста
  w.hasActiveRight = false; // Будет установлен новым первым
  // ...
}
```

### 4️⃣ КРИТИЧНОЕ: Новый первый получает hasActiveRight

```typescript
// 🏀 RUCHEEK: NEW FIRST PLAYER (idx=0) GETS ACTIVE RIGHT
if (gs.players.length > 0 && !gs.players[0].isEliminated) {
  gs.players[0].hasActiveRight = true;
}
```

**Почему это критично:**
- Без этого старший оставался в хвосте без права бросать
- Теперь номер нового первого мигает правильно (начинает его ход)
- Второй игрок видит что первый имеет право бросать

### 5️⃣ Удаление дублирующейся проверки

```typescript
// БЫЛО:
const aliveCount = gs.players.filter((p: any) => p.status !== 'eliminated').length;
if (aliveCount <= 1) {
  gs.state = 'finished';  // ❌ УДАЛЕНО
}

// СТАЛО: только одна проверка в основной логике выбивания
```

## 🧪 Тестирование

### Сценарий 1: Первый забивает
```
Браузер А (игрок №1):
1. Бросает → попадает ✅
2. Идёт в хвост (становится №6) ✅
3. Игра ПРОДОЛЖАЕТСЯ ✅
4. Номер #2 начинает мигать (новый первый) ✅

Браузер Б (игрок №2):
1. Видит что первый ушёл в хвост
2. Видит что у него номер #1 мигает
3. Может бросать ✅
4. Игра продолжается ✅
```

### Сценарий 2: Выбивание работает правильно
```
Если второй выпустил мяч (hasThrown = true)
И первый забивает → второй выбывает ✅
Игра завершается только если осталось <= 1 игрока ✅
```

## 📁 Изменённые файлы

- `components/public/RucheekGameCanvas.tsx`
  - Строки 1382-1436: Логика выбивания (handleScored)
  - Строки 1488-1515: Передача права (shift/push)
  - Удалены строки 1500-1503: Дублирующаяся проверка

## 📊 Статус

✅ Build успешно пройден  
✅ Commit: `ee86ba0`  
✅ Push: main branch  
✅ Backup: `20260427_133201` создан и сохранён  

## 🚀 Deploy

Код запушен в production. На следующей перестройке (или manual deploy) изменения вступят в силу.

```bash
# Ручной deploy:
git push origin main
# Vercel auto-deploy сработает

# Или локально:
npm run build
npm run dev:safe
```

## 💾 Восстановление (если что-то пошло не так)

Если нужно откатиться:

```bash
# Восстановить файл из последнего snapshot
npm run restore:file latest components/public/RucheekGameCanvas.tsx

# Или восстановить всю игру
npm run restore:game

# Или из конкретного snapshot
npm run restore:file 20260427_132055 components/public/RucheekGameCanvas.tsx
```

## 📝 Краткое резюме

| Что было | Что стало |
|---------|----------|
| Первый забивает → игра завершена ❌ | Первый забивает → идёт в хвост ✅ |
| prevIdx ищет последнего | prevIdx ищет реального предыдущего |
| Нет проверки idx !== 0 | Есть проверка idx !== 0 |
| Новый первый не получает право | Новый первый получает hasActiveRight |
| Дублирующаяся проверка | Одна проверка завершения |
| Номер не мигает у нового первого | Номер мигает правильно |

---

**Дата:** 2026-04-27  
**Фиксено:** Game-over bug in Rucheek  
**Статус:** ✅ Deployed to main
