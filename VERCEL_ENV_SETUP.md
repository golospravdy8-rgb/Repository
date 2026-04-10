# Vercel Environment Variables Setup

## 🔴 Критичні переменные для basketball.lviv.ua

### Database (Neon PostgreSQL)
```
DATABASE_URL = "postgresql://neondb_owner:npg_...@ep-...-pooler.c-6.us-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require"
PRISMA_DATABASE_URL = "postgresql://neondb_owner:npg_...@ep-....c-6.us-east-1.aws.neon.tech/neondb?sslmode=require"
```

**Де взяти?**
- Logінься в Vercel Dashboard
- Проєкт basket-lviv
- Settings → Environment Variables
- Шукай DATABASE_URL у development environment
- Скопіюй іх та додай до production (якщо ще немаэ)

### Vercel Blob Storage
```
LOGOS_READ_WRITE_TOKEN = "vercel_blob_rw_..."
```

### NextAuth (Auth)
```
NEXTAUTH_SECRET = "ldbl-dev-secret-32-chars-ok-2025!"
NEXTAUTH_URL = "https://basketball.lviv.ua"
```

## ⚠️ Проблеми, які були виявлені та виправлені

### 1. Форма реєстрації батьків: "Помилка з'єднання" (ВИПРАВЛЕНО)
- **Причина**: DATABASE_URL не встановлена на Vercel + немає error handling в API
- **Виправлено**: Додав try-catch в `/api/parents/register`, покращив error logging
- **Дія**: Переконайся, що DATABASE_URL встановлена в Vercel!

### 2. Сторінка матчу /game/[id]: "Матч не знайдено" (ВИПРАВЛЕНО)
- **Причина**: ISR кешування (revalidate = 10) закешовував "не знайдено" на 10 сек
- **Виправлено**: Додав `force-dynamic`, встановив `revalidate = 0`, додав try-catch
- **Результат**: Сторінка тепер завантажує свіжі дані при кожному запиті

### 3. Logo upload не працює (ПОТРЕБУЄ ACTION)
- **Причина**: LOGOS_READ_WRITE_TOKEN відсутній
- **Рішення**: Додай токен з Vercel → Storage → Blob

### 4. Дані матчів не відображаються на Vercel (ПОТРЕБУЄ ACTION)
- **Причина**: На production БД не були завантажені дані (seed не запускається автоматично)
- **Рішення**: Вручну завантажи дані через admin панель, або запусти seed з ALLOW_SEED=1

## ✅ Перевіння на Vercel після setup

### 1. Перевір Database
- Vercel Dashboard → basket-lviv → Settings → Environment Variables
- Переконайся, що DATABASE_URL та PRISMA_DATABASE_URL встановлені для production

### 2. Перевір сторінки
- https://basketball.lviv.ua/chat → форма реєстрації (повинна працювати)
- https://basketball.lviv.ua/game/1 → сторінка матчу (повинна завантажуватись)
- https://basketball.lviv.ua/schedule → розклад (повинен завантажуватись)

### 3. Перевір браузер
- F12 → Console → перевір на помилки
- Network → перевір статус-коди API запитів

### 4. Redeploy (якщо змінив env vars)
- Vercel Dashboard → Deployments → Redeploy

## 🔍 Дебагінг

**Якщо форма реєстрації показує помилку:**
```bash
# Перевір Vercel logs
vercel logs --tail

# Перевір, чи є дані в БД
psql <DATABASE_URL> -c "SELECT COUNT(*) FROM guest_contact;"
```

**Якщо сторінка матчу показує "не знайдено":**
- Сторінка тепер має `force-dynamic`, тому НЕ кешує результат
- Якщо матч все ще не відображається — проблема в тому, що матч не існує в БД
- Перевір: `SELECT COUNT(*) FROM game WHERE id = 16;`

## 📝 Notes

- `.env.local` не відправляється на Vercel (в .gitignore)
- Для локальної розробки: `vercel env pull` завантажує env vars з Vercel
- Для production: env vars встановлюються в Vercel Dashboard → Settings → Environment Variables
- Кожна змінена env variable потребує новий Vercel деплой!
