# VIP Telegram Integration — Quick Reference

## Для Адміна

### Як користуватися

**Спосіб 1: Через Telegram посилання**
1. Батько подає заявку на VIP
2. Вам прийде Telegram повідомлення:
   ```
   🏆 НОВА VIP ЗАЯВКА!
   👤 Батько: Іван П.
   📱 Телефон: +380999999999
   📦 Тариф: Місячна підписка
   💰 Сума: 99₴
   [✅ АКТИВУВАТИ VIP]  ← натисніть цю кнопку
   ```
3. Система автоматично активує VIP

**Спосіб 2: Через адмін-панель**
1. Перейдіть на: `http://localhost:3006/admin/vip-requests`
2. Знайдіть заявку в таблиці
3. Натисніть кнопку **[✅ Активувати]**
4. Система активує VIP на 30 днів

### Посилання

```
Адмін-панель VIP Заявок:
http://localhost:3006/admin/vip-requests

Список всіх заявок (API):
GET http://localhost:3006/api/admin/vip-requests
```

### Активація через API (для скриптів)

```bash
# Активувати VIP для користувача ID 126 на 1 місяць
curl -X POST "http://localhost:3006/api/admin/vip-activate-manual" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 126,
    "plan": "month"
  }'

# Деактивувати VIP
curl -X POST "http://localhost:3006/api/admin/vip-deactivate" \
  -H "Content-Type: application/json" \
  -d '{ "userId": 126 }'
```

---

## Для Розробника

### Структура коду

```
app/
├── api/
│   ├── vip/
│   │   └── purchase-request/route.ts          ← Telegram повідомлення
│   └── admin/
│       ├── vip-requests/route.ts              ← Отримати список заявок
│       ├── vip-activate-manual/route.ts       ← Активувати VIP
│       ├── vip-deactivate/route.ts            ← Деактивувати VIP
│       └── vip-activate-from-telegram/route.ts ← Активація з Telegram (защищена)
└── admin/
    ├── layout.tsx                              ← Навігація адміна
    └── vip-requests/
        └── page.tsx                            ← Сторінка управління VIP
```

### Конфігурація

```bash
# .env.local
ADMIN_ACTIVATION_SECRET="vip_activate_2026_secure_token_basket"
TELEGRAM_BOT_TOKEN="7685937167:AAFfSNWb98RIshlHtOn9sId6M5DvH0FoV54"
```

### Database схема

```sql
GuestContact таблиця:
- id: INT (Primary Key)
- phone: VARCHAR (Unique)
- firstName, lastName: VARCHAR
- role: VARCHAR ('guest' | 'parent' | 'vip' | 'admin')
- vipStatus: BOOLEAN (default: false)
- vipExpiresAt: DATETIME (nullable)
```

### Тестування

```bash
# 1. Отримати список заявок
curl "http://localhost:3006/api/admin/vip-requests"

# 2. Подати заявку на VIP
curl -X POST "http://localhost:3006/api/vip/purchase-request" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+380665555555",
    "firstName": "Тест",
    "lastName": "Батько",
    "plan": "month",
    "amount": 99
  }'

# 3. Активувати VIP
curl -X POST "http://localhost:3006/api/admin/vip-activate-manual" \
  -H "Content-Type: application/json" \
  -d '{ "userId": 126, "plan": "month" }'

# 4. Перевірити безпеку (неправильний secret)
curl "http://localhost:3006/api/admin/vip-activate-from-telegram?userId=126&plan=month&secret=wrong"
# Очікуваний результат: 401 Unauthorized

# 5. Активувати через Telegram (правильний secret)
curl "http://localhost:3006/api/admin/vip-activate-from-telegram?userId=126&plan=month&secret=vip_activate_2026_secure_token_basket"
```

---

## Тарифи

| Назва | Код | Дні | Ціна |
|-------|-----|-----|------|
| Місячна підписка | `month` | 30 | 99₴ |
| Сезонна підписка (3 міс) | `season` | 90 | 249₴ |
| Річна підписка | `year` | 365 | 799₴ |

---

## Telegram Повідомлення

### Адміну (на дію):
```
🏆 НОВА VIP ЗАЯВКА!
👤 Батько: Іван П.
📱 Телефон: +380999999999
📦 Тариф: Місячна підписка
💰 Сума: 99₴
📅 Дата: 07.04.2026 о 12:53
🆔 User ID: 126
──────────────────

[✅ АКТИВУВАТИ VIP]
```

### Батькові (після активації):
```
✅ ВІД АДМІНІСТРАЦІЇ!

Ваша заявка на VIP була затверджена адміністратором!

📦 Активований тариф: Місячна підписка
📅 Дійсна до: 07.05.2026

Тепер у вас є повний доступ до:
📊 Детальної статистики дитини
📈 Прогресу по матчах
📷 Ексклюзивних фото
🎬 Видео моментів

Радимо з вами! 🎉

👉 Перейти до VIP-кабінету: https://basket-lviv.com/vip
```

---

## Обслуговування

### Видалити VIP користувача
```bash
# Via admin panel:
1. Go to /admin/vip-requests
2. Find user
3. Click [❌ Деактивувати]

# Via API:
curl -X POST "http://localhost:3006/api/admin/vip-deactivate" \
  -H "Content-Type: application/json" \
  -d '{ "userId": 126 }'
```

### Продовжити VIP для користувача
```bash
# Активація вже існуючого користувача на новий період
curl -X POST "http://localhost:3006/api/admin/vip-activate-manual" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 126,
    "plan": "year"  # Додаємо 1 рік до VIP
  }'
```

### Таблиця статусів
```
⏳ Очікує   = User має роль 'parent', vipStatus = false
✅ Активний = User має роль 'vip', vipStatus = true
```

---

## Типові проблеми

| Проблема | Рішення |
|----------|---------|
| Telegram кнопка не працює | Перевірте `ADMIN_ACTIVATION_SECRET` в .env.local |
| Посилання не активує VIP | Перевірте secret токен в URL |
| VIP не活動問題 | Перевірте що користувач існує в БД |
| Нема сповіщення батькові | Перевірте що `TELEGRAM_BOT_TOKEN` правильний |

---

## Версія

- **Version:** 1.0
- **Date:** 2026-04-07
- **Status:** ✅ Production Ready
- **Tested:** ✅ YES

Для повної документації див. `VIP_TELEGRAM_INTEGRATION_COMPLETE.md`
