# 🧪 Firebase Sync Test Plan — 2026-04-30

## ✅ Исправления выполнены:

1. **FIX #1:** В `handleAddPlayer()` добавлен вызов `joinGame()` для регистрации в Firebase
2. **FIX #2:** Добавлена диагностика на canvas (Firebase status, Remote players count, etc.)
3. **FIX #3:** Build пройден успешно
4. **FIX #4:** Dev сервер запущен на http://localhost:3006

## 🧪 Тестовый сценарий (ЭТАП 5)

### Шаг 1: Откроем 2 браузера

**Браузер 1:**
```
http://localhost:3006/chat
```

**Браузер 2:**
```
http://localhost:3006/chat
```

### Шаг 2: Добавим игроков

**В Браузере 1:**
- Введите ник: `Player1`
- Нажмите `+ Додати`

**Ожидаемый результат в Браузере 1:**
```
✅ Firebase: ON
👤 My ID: ...
🌐 Remote: 0        ← НОЛЬ потому что других нет
👥 Local: 1         ← МЫ
💾 Game: playing
```

**В Браузере 2:**
- Введите ник: `Player2`
- Нажмите `+ Додати`

### Шаг 3: Проверим синхронизацию

**В Браузере 1 должно появиться:**
```
✅ Firebase: ON
👤 My ID: ...
🌐 Remote: 1        ← ОДИН! Player2 появился!
👥 Local: 1         ← МЫ (Player1)
💾 Game: playing
```

**В Браузере 2 должно появиться:**
```
✅ Firebase: ON
👤 My ID: ...
🌐 Remote: 1        ← ОДИН! Player1 появился!
👥 Local: 1         ← МЫ (Player2)
💾 Game: playing
```

**На canvas должны быть видны ОБА гравца:**
- Ваш гравец (синий)
- Remote гравец (cyan)

## 🔍 Диагностика: Если не работает

### Проблема 1: "Remote: 0" когда Player2 добавлена

**Причины:**
1. joinGame() не сохраняет в Firebase
2. listenToPlayers() не подписывается

**Решение:**
- Откройте DevTools → Console
- Посмотрите логи:
  - `[🟢 Firebase] Player registered: Player2` — должно быть
  - `[🟢 FIREBASE] New player: ...` — должно быть
- Если логов нет → joinGame() не вызывается!

### Проблема 2: Firebase: OFF

**Причины:**
1. firebaseUnsubscribeRef.current пуст
2. initializeFirebaseGame() не выполнился

**Решение:**
- Откройте DevTools → Network
- Посмотрите HTTP запросы к Firebase
- Должны быть GET запросы к: `https://basket-lviv-default-rtdb.firebaseio.com/games/general/players`

### Проблема 3: Гравец видит себя дважды

**Причина:** playerIdRef не правильно фильтрует

**Решение:**
- В консоли посмотрите: `console.log(playerIdRef.current)`
- Должен быть уникальный ID вида: `player_TIMESTAMP_RANDOM`

## 🔧 Дополнительные логи для консоли

Добавьте в браузер консоли для полной диагностики:

```javascript
// Смотреть все Firebase запросы
firebase.database().ref('games/general').on('value', (snap) => {
  console.log('🔥 Firebase data:', snap.val());
});

// Смотреть playerIdRef
console.log('My ID:', playerIdRef.current);

// Смотреть remotePlayersRef
console.log('Remote players:', remotePlayersRef.current);
```

## ✅ Финальная проверка

Когда оба браузера показывают:
```
🌐 Remote: 1
👥 Local: 1
```

И вы видите ДВУХ гравцов на canvas — **СИНХРОНИЗАЦИЯ РАБОТАЕТ! ✅**

---

**Начинай тест сейчас! 🚀**
