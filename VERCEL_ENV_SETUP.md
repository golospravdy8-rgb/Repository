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

## ⚠️ Проблеми, які могли виникнути раніше

1. **Форма реєстрації батьків показує помилку "Помилка з'єднання"**
   - Причина: DATABASE_URL або PRISMA_DATABASE_URL не встановлені на Vercel
   - Рішення: Додай обидві у Environment Variables

2. **Logo upload не працює**
   - Причина: LOGOS_READ_WRITE_TOKEN відсутній або невірний
   - Рішення: Оновити токен з Vercel → Storage → Blob

## ✅ Перевіння на Vercel

После додання env vars:
1. Redeploy сайту (Vercel Dashboard → Deployments → Redeploy)
2. Тестуй на https://basketball.lviv.ua/chat
3. Спробуй зареєструватися як батько
4. Перевір browser Console (F12) на помилки

## 📝 Notes

- `.env.local` не відправляється на Vercel (в .gitignore)
- Для локальної розробки: `vercel env pull` завантажує env vars з Vercel
- Для production: env vars встановлюються в Vercel Dashboard → Settings → Environment Variables
