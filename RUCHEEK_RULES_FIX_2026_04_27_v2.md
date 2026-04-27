---
name: Rucheek Game Rules Fixed — playerNumber Permanent + Elimination Removal
date: 2026-04-27
version: 2
---

# 🏀 Ручеёк — Исправление Двух Критических Ошибок (v2)

## ПРАВИЛО 1: playerNumber — ПОСТОЯННОЕ И НИКОГДА НЕ МЕНЯЕТСЯ ✅

**Проблема была:**
```
Начало игры:
- Игрок №1 (playerNumber=1, x=480)
- Игрок №2 (playerNumber=2, x=560)

Игрок №1 бросает и идёт в хвост (shift/push)

После shift/push:
- Игрок №2 становится первым (idx=0)
- forEach пересчитывает: playerNumber = 0 + 1 = 1  ❌ НЕПРАВИЛЬНО!
- Теперь ДВА игрока имеют playerNumber=1 (дублирование)
```

**Решение:**
```typescript
// БЫЛО (строка 1515):
gs.players.forEach((p2: any, i: number) => {
  p2.playerNumber = i + 1;  // ❌ ПЕРЕСЧИТЫВАЕТ КАЖДЫЙ РАЗ
});

// СТАЛО:
gs.players.forEach((p2: any, i: number) => {
  // 🏀 playerNumber НИКОГДА не меняется! Установлен только при спавне
});
```

**Почему это важно:**
- Цифра над головой = уникальный идентификатор игрока на ВСЮ игру
- playerNumber устанавливается ОДИН РАЗ в handleAddPlayer (строка 2727)
- После этого playerNumber **никогда** не должен меняться
- Даже если игрок переходит в другую позицию в очереди

**Результат:**
✅ Игрок №2 остаётся №2, даже если становится первым в очереди  
✅ Игрок №1 остаётся №1, даже если идёт в хвост  
✅ Цифра над головой всегда соответствует реальному playerNumber

---

## ПРАВИЛО 2: Выбитый Игрок ИСЧЕЗАЕТ ИЗ МАССИВА ✅

**Проблема была:**
```
Выбивание игрока:
prevPlayer.isEliminated = true;  // Только флаг, игрок остаётся в массиве!

Результат:
- Игрок всё ещё в gs.players
- Но с isEliminated = true
- В цикле рендера: if (!p.isEliminated) → не отображаем
- Но во всех логиках нужно проверять isEliminated
- Сложно, грязно, баги легко проникают
```

**Решение:**
```typescript
// БЫЛО (строка 1408):
prevPlayer.isEliminated = true;
addFlash('...');
// ... и дальше нужно везде проверять isEliminated

// СТАЛО:
addFlash('💥 ВИБУВ: ${prevPlayer.name}!', ...);
eliminationOrderRef.current.push(prevPlayer.name);

// 🏀 УДАЛИТЬ ИГРОКА ИЗ МАССИВА
const elimIdx = gs.players.indexOf(prevPlayer);
if (elimIdx !== -1) {
  gs.players.splice(elimIdx, 1);      // Удалить из игроков
  gs.shootStates.splice(elimIdx, 1);  // Удалить его состояние
}
```

**Почему это важно:**
- Если игрок ВЫБЫТ → его НЕЛЬЗЯ может быть в списке
- Упрощает логику передачи права (не нужно пропускать isEliminated)
- Упрощает проверку завершения: `if (gs.players.length <= 1)`
- Всё честно и прозрачно

**Результат:**
✅ Выбитый игрок исчезает с экрана (💥 вспышка)  
✅ Исчезает из массива gs.players  
✅ Следующий игрок получает право  
✅ Логика проста и чистая

---

## Как это работает теперь

### Сценарий: 2 игрока, выбивание

**Начало:**
```
gs.players = [
  { name: "Alice", playerNumber: 1, x: 480, hasActiveRight: true, hasThrown: false },
  { name: "Bob",   playerNumber: 2, x: 560, hasActiveRight: false, hasThrown: false }
]
```

**Шаг 1: Алиса бросает**
```
launchBall() →
  p.hasThrown = true
  → передать право Бобу
  gs.players[1].hasActiveRight = true
```

**Шаг 2: Боб забивает (ПОПАДАЕТ)**
```
handleScored(idx=1) →
  prevIdx = (1-1) = 0 → Alice
  prevPlayer.hasThrown = true ✅
  
  💥 Выбить Alice:
  gs.players.splice(0, 1)  // Удалить Alice
  
gs.players = [
  { name: "Bob", playerNumber: 2, x: 560, hasActiveRight: true }
]
```

**Результат:**
✅ Alice исчезла (💥 вспышка на её месте)  
✅ Bob остаётся с playerNumber: 2 (не меняется!)  
✅ Bob получает право бросать  
✅ Только один игрок → ПОБЕДА! +10 HP для Bob

---

## Все изменения в коде

### 1. Выбивание с удалением (строки 1407-1446)

```typescript
// 🎯 ВЫБИТЬ ПРЕДЫДУЩЕГО (УДАЛИТЬ ИЗ ИГРЫ)
p.goalCount = (p.goalCount || 0) + 1;

addFlash(`💥 ВИБУВ: ${prevPlayer.name}!`, prevPlayer.x, prevPlayer.y - 50*scaleY, '#ff4444');
eliminationOrderRef.current.push(prevPlayer.name);

// 🏀 RUCHEEK: ВАЖНО — удалить выбитого игрока из массива
const elimIdx = gs.players.indexOf(prevPlayer);
if (elimIdx !== -1) {
  gs.players.splice(elimIdx, 1);      // Удалить
  gs.shootStates.splice(elimIdx, 1);  // Удалить состояние
}

// Скорректировать текущий idx
const newCurrentIdx = idx > gs.players.length - 1 ? 0 : idx;

// Передать право СЛЕДУЮЩЕМУ
if (gs.players.length > 0) {
  gs.players[newCurrentIdx].hasActiveRight = false;
  let nextIdx = (newCurrentIdx + 1) % gs.players.length;
  gs.players[nextIdx].hasActiveRight = true;
}

// Проверить завершение (теперь просто проверка длины массива)
if (gs.players.length <= 1) {
  const winner = gs.players[0];
  // ... +10 HP
}
```

### 2. Сохранение playerNumber (строка 1510-1516)

```typescript
// 🏀 RUCHEEK: Update ONLY positions, NOT playerNumber (playerNumber is permanent!)
gs.players.forEach((p2: any, i: number) => {
  const pos = QUEUE_POSITIONS[i];
  p2.x = pos.x;
  p2.y = GY;
  // 🏀 ВАЖНО: playerNumber НИКОГДА не меняется!
});
```

---

## Commit

```
0379727 - 🏀 fix: permanent playerNumber, eliminated player disappears from game
```

---

## Testing Checklist

- [ ] 2 браузера, 2 игрока
- [ ] Игрок #1 бросает → не попадает (hasThrown=true)
- [ ] Игрок #2 забивает
- [ ] **Игрок #1 исчезает (💥 вспышка)**
- [ ] **Игрок #2 остаётся с числом #2 (не меняется на #1!)**
- [ ] Игрок #2 может продолжать бросать
- [ ] После 1-го игрока осталось 1 → Победа для #2
- [ ] Получает +10 HP (проверить в /admin/dashboard)

---

## Status

✅ FIXED — 2026-04-27  
✅ DEPLOYED — Vercel production  
✅ READY — For testing on basketball.lviv.ua/chat
