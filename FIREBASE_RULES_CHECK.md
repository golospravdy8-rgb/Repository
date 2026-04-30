# 🔒 Firebase Rules Verification

## ⚠️ КРИТИЧНО: Проверьте Firebase Rules

Firebase по умолчанию БЛОКИРУЕТ все записи! Если Rules закрыты, синхронизация не будет работать.

## ✅ Как проверить и исправить

### Шаг 1: Откройте Firebase Console

```
https://console.firebase.google.com/project/basket-lviv/database
```

### Шаг 2: Перейдите на вкладку "Rules"

Left menu → Realtime Database → Rules

### Шаг 3: Проверьте текущие Rules

Должны быть:
```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

**ЕСЛИ ВИД ДРУГОЙ:**
```json
{
  "rules": {
    ".read": "auth != null",
    ".write": "auth != null"
  }
}
```

Это БЛОКИРУЕТ запись! Нужно разблокировать!

### Шаг 4: Исправьте Rules (для разработки)

1. Нажмите кнопку "Edit rules" (справа вверху)
2. Удалите весь текст
3. Вставьте:
```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```
4. Нажмите "Publish"

⚠️ **ВНИМАНИЕ:** Это правила ТОЛЬКО для разработки! 
На продакшене установите правильные Rules для безопасности.

### Шаг 5: Проверьте данные

После исправления Rules откройте Firebase Console → Data

Должна быть структура:
```
games/
  general/
    players/
      player_TIMESTAMP_ID/
        id: "player_TIMESTAMP_ID"
        nickname: "Player1"
        x: 480
        y: 400
        score: 0
        status: "alive"
        lastUpdate: 1704067200000
    ball/
      x: 300
      y: 100
      vx: 0
      vy: 0
      state: 0
```

Если данных нет → Rules были закрыты, правила открыты, но новые данные будут добавлены при следующем добавлении игрока.

## 🔑 Правильные Rules для Production

```json
{
  "rules": {
    "games": {
      "$gameId": {
        "players": {
          ".read": true,
          "$playerId": {
            ".write": "!data.exists() || root.child('games').child($gameId).child('players').child($playerId).child('id').val() === $playerId"
          }
        },
        "ball": {
          ".read": true,
          ".write": true
        }
      }
    }
  }
}
```

Это разрешает:
- ✅ Читать всем (игроки видят друг друга)
- ✅ Писать только свои данные
- ✅ Мяч может обновляться

## 📋 Checklist

- [ ] Firebase Console открыта
- [ ] Rules вкладка найдена
- [ ] Rules изменены на `{"rules":{".read":true,".write":true}}`
- [ ] Rules опубликованы
- [ ] Данные видны в Data вкладке
- [ ] Синхронизация работает между браузерами

Если все сделано — синхронизация должна работать! 🚀
