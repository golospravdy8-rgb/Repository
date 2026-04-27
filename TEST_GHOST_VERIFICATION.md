# 🧪 GHOST PLAYER BUG VERIFICATION PLAN

## Етап 1: Тестування на localhost:3006

### Процедура:
1. Відкрий 2 браузерні вкладки (Safari + Chrome, або 2 Chrome incognito)
2. На першій вкладці заходь на http://localhost:3006/chat?gameRoom=test_ghost
3. На другій вкладці заходь на той же URL
4. Введи різні імена: "Player1" та "Player2"
5. Відкрий DevTools на обох вкладках (F12 → Console)

### Що спостерігати:

```javascript
// На першій вкладці дослуши логування playerIdRef:
[GHOST DEBUG] playerIdRef initialized: player_1740234156789_abc123def456
[GHOST DEBUG] player-joined event: playerId=player_1740234156789_xyz789def123, basePlayerId=...
```

### Очікуваний результат:
- ✅ На canvas Player2 НЕ з'являється як дублікат
- ✅ remotePlayersRef містить тільки Player2 один раз
- ✅ Немає "призраків" після F5 перезавантаження

---

## Етап 2: Тестування на Vercel (production)

### Процедура:
1. Відкрий 2 браузерні вкладки (навіть 2 Safari)
2. На першій: https://basket-lviv.vercel.app/chat?gameRoom=vercel_ghost_test
3. На другій: той же URL
4. Введи імена "PlayerA" та "PlayerB"
5. Дослуши DevTools Console для [GHOST DEBUG] повідомлень

### Критичні спостереження:
- Чи Pusher відправляє playerIdRef з суфіксами (_sub_1, _session_Y)?
- Чи normalizePlayerId() коректно видаляє суфікси?
- Чи ghost більше не з'являється на canvas?

### Очікуваний результат (після патча):
- ✅ PlayerB НЕ з'являється як дублікат (призрак)
- ✅ Нормалізація працює на обох localhost та Vercel
- ✅ Нічого не змінилося на localhost
- ✅ Ghost ПОВНІСТЮ видалено на Vercel

---

## Етап 3: Детальна перевірка normalizePlayerId()

### Тестові кейси для функції:

```typescript
// Vercel з Pusher суфіксами:
normalizePlayerId("player_1740234156789_abc123_sub_1") 
→ "player_1740234156789_abc123" ✅

normalizePlayerId("player_1740234156789_abc123_session_xyz")
→ "player_1740234156789_abc123" ✅

// localhost без суфіксів:
normalizePlayerId("player_1740234156789_abc123")
→ "player_1740234156789_abc123" ✅ (no change)

// Edge case з 4+ частинами:
normalizePlayerId("player_1740234156789_abc123_extra_stuff")
→ "player_1740234156789_abc123" ✅
```

---

## Етап 4: Автоматична перевірка на деплої

Після деплою на Vercel запустити:

```bash
# Перевірити чи коміт задеплоївся:
git log --oneline | head -1
# Очікується: 🧪 GHOST FIX: 4-та лінія захисту...

# Перевірити чи файл має нормалізацію:
grep -n "function normalizePlayerId" components/public/RucheekGameCanvas.tsx
# Очікується: (visible line number, function defined)
```

---

## Етап 5: Результат

### Якщо тест ПРОЙШОВ ✅
- Ghost більше не з'являється на Vercel
- localStorage та Pusher синхронізуються правильно
- playerIdRef нормалізується перед будь-яким порівнянням
- Три рівні захисту + нормалізація = 100% захист від ghost

### Якщо тест НЕ ПРОЙШОВ ❌
- Ghost ще виглядає на Vercel (rare, дай знати)
- Більш глибокий аналіз потрібен (можливо, інший источник проблеми)

---

## Критичні точки для debug:

1. **localStorage key**: `pusher_player_id_${gameRoomId}`
   - На Vercel це може бути інше, ніж на localhost
   
2. **Pusher Event payloads**:
   - Перевір DevTools → Network → Pusher події
   - Чи вони містять _sub_X в playerId?

3. **Timing Race Condition**:
   - Чи playerIdRef встановлюється ДО першої player-joined подій?
   - Чи normalizePlayerId() викликається ДО порівняння?

4. **basePlayerId updates**:
   - У remotePlayersRef об'єкт має basePlayerId = normalizedIncomingClean?
   - Це важливо для render-level перевірки (хоча тепер вже обмежено нормалізацією)

---

## Next Steps після успішного тесту:

1. ✅ Commit + push: Ghost fix 4-та лінія (DONE)
2. ✅ Deploy to Vercel production (IN PROGRESS)
3. ⏳ Verify both environments work (PENDING)
4. 📝 Update memory with findings
5. 🎉 Close ghost issue permanently
