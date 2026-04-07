# VIP-кабінет для батьків — Документація

## Огляд

Сторінка `/vip` — це VIP-кабінет для батьків юнаків, який надає доступ до:
- 📊 Детальної статистики дитини-гравця
- 📈 Графіків прогресу
- 📷 Ексклюзивних фото з матчів
- 🎬 Відео моментів
- 💬 Повідомлень від тренера

## Архітектура

### Компонент: `app/(public)/vip/page.tsx`

**Тип:** Client Component (`"use client"`)

**Стан користувача:**
- Система перевіряє `user.role` для визначення VIP статусу
- Два варіанти рендерингу:
  - **VIP користувач** (`role === "vip" | "admin"`) → Повний доступ до всіх функцій
  - **Non-VIP користувач** → Лендинг з пропозицією оплати

### Плани підписки

```
┌──────────────────────────────────────┐
│ Місяць      │ 99₴    │ 30 днів    │
│ Сезон (3м)  │ 249₴   │ ВИГІДНО    │
│ Рік         │ 799₴   │ 365 днів   │
└──────────────────────────────────────┘
```

### Інтеграція Monobank

**Посилання формату:**
```
https://send.monobank.ua/jar/{JAR_ID}?amount={СУМА_КОПІЙОК}
```

**Приклади:**
- 99₴ = 9900 копійок → `https://send.monobank.ua/jar/6Wm6ypKDNBz7vZ8E3kPq4m?amount=9900`
- 249₴ = 24900 копійок → `https://send.monobank.ua/jar/6Wm6ypKDNBz7vZ8E3kPq4m?amount=24900`

**JAR ID в конфігурації:**
```
.env.local:
NEXT_PUBLIC_MONOBANK_JAR_ID="6Wm6ypKDNBz7vZ8E3kPq4m"
```

## Дизайн

**Особливості:**
- ✅ Компактний layout на одному екрані (без скролу)
- ✅ Градієнтний фон (`from-slate-950 to-slate-900`)
- ✅ Grid 2x2 для карток функцій
- ✅ Responsive (mobile-first)
- ✅ Іконки 24px для ясності

**Відступи:**
- Картки: `p-3` (12px)
- Заголовок: `mb-6`
- Gap між картками: `gap-3`

## API Точки

### 1. GET `/api/user`

Отримання статусу поточного користувача

```bash
curl -X GET "http://localhost:3006/api/user" \
  -H "Cookie: user_phone=+380123456789"
```

**Відповідь:**
```json
{
  "phone": "+380123456789",
  "name": "Іван Іванов",
  "email": "+380123456789",
  "role": "vip" // або "guest", "admin"
}
```

### 2. POST `/api/admin/vip-activate`

Активація VIP для користувача (адмін операція)

```bash
curl -X POST "http://localhost:3006/api/admin/vip-activate" \
  -H "Content-Type: application/json" \
  -H "X-Admin-Secret: YOUR_SECRET" \
  -d '{
    "phone": "+380123456789",
    "durationDays": 30
  }'
```

**Відповідь:**
```json
{
  "success": true,
  "phone": "+380123456789",
  "role": "vip",
  "message": "VIP активовано на 30 днів"
}
```

⚠️ **Важливо:** На даний момент не має перевірки адмін доступу. Потрібно додати:
```typescript
const adminSecret = req.headers.get("X-Admin-Secret");
if (adminSecret !== process.env.ADMIN_API_SECRET) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
}
```

## База Даних

**Таблиця:** `GuestContact`

```prisma
model GuestContact {
  phone    String   @unique
  role     String   @default("guest")  // "guest" | "vip" | "admin"
  // ... інші поля
}
```

**VIP статус зберігається в полі `role`:**
- `"guest"` → Не має VIP
- `"vip"` → Активний VIP
- `"admin"` → Адміністратор (також має VIP)

## Як активувати VIP для користувача

### Варіант 1: Через API (адмін)

```bash
curl -X POST "http://localhost:3006/api/admin/vip-activate" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+380123456789",
    "durationDays": 90
  }'
```

### Варіант 2: Через адмін панель

1. Відкрий `/admin/dashboard`
2. Знайди користувача по номеру телефону
3. Встав роль `"vip"`
4. Збережи

### Варіант 3: Через БД напряму (для розробки)

```sql
UPDATE "GuestContact" 
SET "role" = 'vip' 
WHERE phone = '+380123456789';
```

## Як перевірити

1. **Для non-VIP:** `http://localhost:3006/vip`
   - Показуються плани підписки
   - Картки 📷 і 🎬 мають замок 🔒

2. **Для VIP:**
   - Активуй VIP для користувача (див. вище)
   - Відкрий `http://localhost:3006/vip`
   - Показується повний кабінет з 4 картками функцій

## Майбутні доповнення

- [ ] Додати webhook від Monobank для автоматичної активації VIP
- [ ] Додати таблицю `VipSubscription` з датами експірації
- [ ] Додати email сповіщення про активацію VIP
- [ ] Додати сторінку історії платежів в адмін панелі
- [ ] Додати автоматичне деактивування VIP після експіра

## Безпека

⚠️ **Поточні проблеми:**

1. API `/api/admin/vip-activate` не має перевірки адмін доступу
2. Не має захисту від подвійної активації
3. Не відстежуються платежі і дати експіра

**Потрібні виправлення перед продакшеном:**

```typescript
// 1. Додай ADMIN_API_SECRET в .env
ADMIN_API_SECRET="your-secret-key"

// 2. Перевір дозволи в API
const adminSecret = req.headers.get("X-Admin-Secret");
if (!adminSecret || adminSecret !== process.env.ADMIN_API_SECRET) {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

// 3. Додай таблицю для відстеження платежів
model VipSubscription {
  id        Int      @id @default(autoincrement())
  phone     String
  startDate DateTime @default(now())
  endDate   DateTime
  planType  String   // "month", "season", "year"
  amount    Int      // сума в копійках
  status    String   @default("active") // "active", "expired"
}
```

## Моделі інформації

### Для VIP (Активні користувачі)

Sторінка показує:
- Заголовок: "⭐ VIP-кабінет для батьків"
- Статус: "✅ Активний"
- Grid 2x2:
  - 📊 Статистика (можна клікнути для розширення)
  - 📈 Прогрес (графіки)
  - 📷 Фото (галерея)
  - 🎬 Відео (плеєр)
- Кнопка: "📄 Завантажити сертифікат"

### Для Non-VIP (Без доступу)

Sторінка показує:
- Заголовок: "⭐ VIP-кабінет для батьків"
- Описання функцій
- Grid 2x2:
  - 📊 Статистика (вкл.)
  - 📈 Прогрес (вкл.)
  - 📷 Фото (🔒 заблоковано)
  - 🎬 Відео (🔒 заблоковано)
- Три варіанти подписки з кнопками Monobank

---

**Дата створення:** 2026-04-07  
**Версія:** 1.0  
**Автор:** Claude Code Assistant
