# 🔍 ДИАГНОСТИКА: Відсутність виключення першого гравця (2026-04-27)

## Проблема
После того, як гравець #2 зарахує, гравець #1 не виконується з масиву (не зникає з 💥 вспышкой).

## Добавлені діагностичні логи

### 1. У handleScored (лінія 1396-1403):
```javascript
console.log('[SCORED] Shooter:', p.name, 'idx:', idx, 'hasThrown:', p.hasThrown);
console.log('[SCORED] All players BEFORE elimination:', gs.players.map(...));
console.log('[SCORED] prevIdx:', prevIdx, 'prevPlayer:', prevPlayer?.name, 'prevThrown:', prevPlayer?.hasThrown);
console.log('[SCORED] Condition check: prevPlayer exists?', !!prevPlayer, 'hasThrown===true?', prevPlayer?.hasThrown === true);
```

### 2. При виключенні (лінія 1410-1417):
```javascript
console.log('[ELIMINATE] Before splice:', gs.players.length, 'players. Removing prevIdx:', prevIdx);
console.log('[ELIMINATE] After splice:', gs.players.length, 'players. All players:', gs.players.map(...));
console.log('[ELIMINATE] Shooter new index:', newShooterIdx, 'shooter:', p.name);
```

## Що перевіряти в Console (F12)

1. **Гравець #1 кидає (miss)**
   - Очікуємо: `p.hasThrown = true` встановлено в launchBall

2. **Гравець #2 отримує право**
   - Очікуємо: `hasActiveRight = true` встановлено в launchBall

3. **Гравець #2 кидає (score)**
   - Очікуємо: `[SCORED] Shooter: Bob, idx: 1`
   - Очікуємо: `[SCORED] prevIdx: 0, prevPlayer: Alice, prevThrown: true`
   - Очікуємо: `Condition check: prevPlayer exists? true, hasThrown===true? true`
   - Очікуємо: `[ELIMINATE] Before splice: 2 players`
   - Очікуємо: `[ELIMINATE] After splice: 1 players`
   - Очікуємо: 💥 ВИБУВ: Alice! (flash message)

## Сценарій тестування

1. Відкрити 2 браузери на http://localhost:3006/chat
2. Browser A: Add Player 1 "Alice"
3. Browser B: Add Player 2 "Bob"
4. F12 → Console в обох браузерах
5. Browser A: Alice кидає (aim ≠ perfect, щоб не вибути першим)
6. Browser B: Bob кидає (aim = perfect, щоб зарахувати)
7. Дивимось на консоль -見ємо [SCORED] і [ELIMINATE] логи?

## Якщо проблема не виявляється в логах

Це означає, що:
- `prevPlayer.hasThrown !== true` (гравець не встановив hasThrown=true при кидку)
- або `prevIdx === -1` (не знайдений попередній гравець)
- або `prevPlayer === null` (попередній гравець не існує)

**Наступний крок**: Добавити логи в launchBall щоб переконатися, що hasThrown встановлюється правильно.
