# Vercel Environment Variables Setup

## 🔴 Критичні переменные для basketball.lviv.ua

### Database (Neon PostgreSQL) — КРИТИЧНО!

⚠️ **Холодний старт (cold start) на Vercel** → Neon goes idle → connection timeout.  
**Рішення:** Використовувати POOLED connection з timeout параметрами.

```
DATABASE_URL="postgresql://neondb_owner:npg_XXXXX@ep-example-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require&connect_timeout=15&pool_timeout=15"

PRISMA_DATABASE_URL="postgresql://neondb_owner:npg_XXXXX@ep-example.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require"
```

**Ключові параметри:**
- DATABASE_URL: POOLED endpoint (ep-...-**pooler**) + `&connect_timeout=15&pool_timeout=15`
- PRISMA_DATABASE_URL: DIRECT endpoint (ep-... без pooler) — для migration

**Де взяти? (Neon Dashboard)**
1. Перейди в Project → Connection string
2. Copy "Pooled connection string" (default)
3. Додай параметри: `&connect_timeout=15&pool_timeout=15` в кінець
4. Це буде DATABASE_URL
5. Для PRISMA_DATABASE_URL копіюй "Direct connection string"

**⚠️ Без цих параметрів:** 
- Форма реєстрації батьків → помилка "Помилка при реєстрації. Спробуйте пізніше."
- Всі API запити до БД → timeout

### Vercel Blob Storage
```
LOGOS_READ_WRITE_TOKEN = "vercel_blob_rw_..."
```

### Supabase (опціонально)
```
NEXT_PUBLIC_SUPABASE_URL = "https://dzsvgyetmdgykmujmxuu.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY = "sb_publishable_086iusJsMoX5QOr6FxqKFA_WBM1LMdB"
```
**Де взяти:** Supabase Dashboard → Settings → API

### NextAuth (Auth)
```
NEXTAUTH_SECRET = "ldbl-dev-secret-32-chars-ok-2025!"
NEXTAUTH_URL = "https://basketball.lviv.ua"
```

## ⚠️ Проблеми, які були виявлені та виправлені

### 1. Форма реєстрації батьків: "Помилка при реєстрації" (КРИТИЧНИЙ FIX)
- **Причина**: Neon cold start timeout на Vercel (Neon goes idle → 30+ sec timeout)
- **Виправлено**: 
  - Додав детальніше error logging в `/api/parents/register`
  - Оновив .env.example і VERCEL_ENV_SETUP.md з правильними Neon параметрами
- **ДІЯ ОБОВ'ЯЗКОВО**: Встанови DATABASE_URL в Vercel з параметрами:
  ```
  DATABASE_URL="postgresql://...@ep-...-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require&connect_timeout=15&pool_timeout=15"
  ```
  Без `&connect_timeout=15&pool_timeout=15` → форма не працює!

### 2. Сторінка матчу /game/[id]: "Матч не знайдено" (КРИТИЧНИЙ FIX)
- **Причина 1**: ISR кешування (revalidate = 10) закешовував "не знайдено" на 10 сек
- **Причина 2**: Next.js 14.2+ requires `await params` for dynamic routes (params is now a Promise)
- **Виправлено**: 
  - Додав `force-dynamic`, встановив `revalidate = 0`
  - Додав `const resolvedParams = await Promise.resolve(params);` для Next.js 15+ compatibility
  - Додав детальніше error logging
- **Результат**: Сторінка тепер завантажує свіжі дані при кожному запиті, без кешування помилок

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
