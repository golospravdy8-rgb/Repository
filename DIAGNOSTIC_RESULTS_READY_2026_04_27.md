# 🔍 診斯體: Готово до Тестування (2026-04-27)

## Status

✅ **Diagnostic build deployed to Vercel production**
- **URL**: https://basketball.lviv.ua/chat
- **Commit**: 8849530
- **Deploy time**: ~2 minutes (auto-deploy in progress)

---

## Що було змінено

### 1. Додані діагностичні логи в handleScored():
```typescript
[SCORED] Shooter: {name}, idx: {idx}, hasThrown: {boolean}
[SCORED] All players BEFORE elimination: [{name, hasThrown, hasActiveRight, playerNumber}]
[SCORED] prevIdx: {idx}, prevPlayer: {name}, prevThrown: {boolean}
[SCORED] Condition check: prevPlayer exists? {boolean}, hasThrown===true? {boolean}

[ELIMINATE] Before splice: {count} players. Removing prevIdx: {idx}
[ELIMINATE] After splice: {count} players. All players: [{names}]
[ELIMINATE] Shooter new index: {idx}, shooter: {name}
```

### 2. Виправлені перевірки isEliminated в launchBall():
- Видалена перевірка `gs.players[nextIdx].isEliminated` (тепер гравці просто видаляються)
- Видалена перевірка `!gs.players[nextIdx].isEliminated`
- Це упрощує логіку, бо видалені гравці вже не в масиві

### 3. Упрощена логіка перенесення права:
- Просто берем наступного гравця з масиву (gs.players[nextIdx])
- Ніяких перевірок на isEliminated

---

## Як Протестувати

### Попередня умова: 2 браузери, F12 Console в обох

**Браузер A** (вікно 1):
```
https://basketball.lviv.ua/chat
F12 → Console tab (покажи все логи)
```

**Браузер B** (вікно 2 або другий браузер):
```
https://basketball.lviv.ua/chat
F12 → Console tab (покажи все логи)
```

### Сценарій: 2 гравці, виключення

1. **Браузер A**: Додай гравця "Alice" → Enter
2. **Браузер B**: Додай гравця "Bob" → Enter
3. **Браузер A**: Alice кидає (мимо, не в центр green zone)
   - Очікуємо в Console A: [launchBall] логи з hasThrown=true
4. **Браузер B**: Bob бачить що він перший
5. **Браузер B**: Bob кидає (попадає, aim в центр green zone)
   - Очікуємо в Console B: [SCORED] і [ELIMINATE] логи
6. **Обидва браузери**: Alice повинна **ЗНИКНУТИ** з 💥 flash

### Що шукати в Console

✅ **Успіх**:
```
[SCORED] Shooter: Bob, idx: 0
[SCORED] prevIdx: 1, prevPlayer: Alice, prevThrown: true
[SCORED] Condition check: ... hasThrown===true? true
[ELIMINATE] Before splice: 2 players
[ELIMINATE] After splice: 1 players
```
Alice зникає, гра завершується.

❌ **Проблема — prevThrown is false/undefined**:
```
[SCORED] prevThrown: false
[SCORED] Condition check: ... hasThrown===true? false
```
Це означає Alice's hasThrown не був встановлен = не був кидок у неї.

---

## Яка Інформація Потрібна Далі

**Скопіюй з Console всі [SCORED] та [ELIMINATE] логи**, особливо:

```
[SCORED] Shooter: _____, idx: _____
[SCORED] prevPlayer: _____, prevThrown: _____
[SCORED] Condition check: hasThrown===true? _____
[ELIMINATE] Before splice: _____ players
[ELIMINATE] After splice: _____ players
```

**Та описи явище**:
- Чи Alice зникає? Коли саме?
- Чи є 💥 flash? Якої кольору?
- Чи з'являється перемога Bob?
- Чи premio +10 HP?

---

## Гіпотези

1. **Якщо prevThrown=false**: hasThrown не встановляється при кидку Alice
   - Тоді перевіримо launchBall на лінії 1237

2. **Якщо prevThrown=true але splice не видаляє**: 
   - Проблема в самому splice() або findIndex()
   - prevIdx неправильно розраховується

3. **Якщо Alice видаляється але спричиняє краш**:
   - Проблема в shift/push логіці (лінія 1515+)
   - Індекси збиваються після splice

---

## Commit History

```
8849530 - 🔍 add diagnostic logging
5c2decc - 🏀 fix: correct elimination
04ae6b0 - 📚 docs: detailed explanation
```

**Готово до тестування!** 🚀
