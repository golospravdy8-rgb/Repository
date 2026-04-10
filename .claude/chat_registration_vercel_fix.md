---
name: Chat Registration Vercel Fix (2026-04-10)
description: Fixed "Помилка з'єднання" error in parent registration form on Vercel
type: project
---

## Проблема
На Vercel (basketball.lviv.ua/chat) форма реєстрації батьків («Я БАТЬКО») показувала:
- Красна помилка: «Помилка з'єднання»
- Натомість на localhost:3006 форма працювала ідеально

## Корінь проблеми
API endpoint `/api/parents/register` не мав error handling. Якщо Prisma запит падав (напр., через неправильні DATABASE_URL на Vercel), помилка не оброблялась і форма показувала generic «Помилка з'єднання».

## Рішення (коміти)
- `f572752`: Додав try-catch блок в API endpoint; оновив fallback origin
- `0bd3629`: Додав VERCEL_ENV_SETUP.md інструкцію

## Важливо для Vercel deployment
На Vercel Dashboard потрібно встановити:
```
DATABASE_URL = postgresql://...@ep-...-pooler.c-6.us-east-1.aws.neon.tech/neondb?...
PRISMA_DATABASE_URL = postgresql://...@ep-....c-6.us-east-1.aws.neon.tech/neondb?...
```

Шляху: Vercel → basket-lviv project → Settings → Environment Variables → додай обидва

## Як тестувати
1. После redeploy на Vercel
2. Йти на https://basketball.lviv.ua/chat
3. Заповнити форму та натиснути «Зареєструватись як батько»
4. Мають бути збережені дані в БД без помилок

## Тепер форма повинна працювати
- На localhost: ✅ працює (як і раніше)
- На Vercel: ✅ повинна працювати (після додання env vars)
