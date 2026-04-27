# Railway Deployment Guide для Colyseus

## Шаг 1: Авторизация
```bash
railway login
# Откроется браузер для авторизации
```

## Шаг 2: Инициализация проекта
```bash
railway init
# Укажи: basket-colyseus
# Выбери: Node.js (или автоматическое определение)
```

## Шаг 3: Настройка переменных (опционально)
```bash
railway variable set NODE_ENV production
railway variable set PORT 3000
```

## Шаг 4: Деплой
```bash
railway up
```

## Шаг 5: Получить URL
```bash
railway domain
# Скопируй https://basket-colyseus-production.up.railway.app (или подобный)
```

## Если используешь GitHub:
1. Создай новый Railway проект через https://railway.app/dashboard
2. Выбери "Deploy from GitHub"
3. Подключи репозиторий basket-lviv
4. Railway автоматически найдёт:
   - Procfile (для startCommand)
   - package.json (для зависимостей)
   - server.ts (как entry point)

## После деплоя на Railway:
- URL вида: `https://basket-colyseus-XXXX.up.railway.app`
- Используй этот URL в NEXT_PUBLIC_COLYSEUS_URL на Vercel
