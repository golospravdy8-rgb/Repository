# Production Testing Steps

## Деплой Completed ✅
- **Production URL**: https://basketball.lviv.ua (алиас)
- **Direct URL**: https://basket-lviv-gie3mvlcl-golospravdy8-9774s-projects.vercel.app

## Текущее состояние
- ✅ Next.js фронтенд на Vercel
- ⏳ Colyseus сервер: локальный режим (попытается подключиться к текущему хосту)
- ⏳ Railway: нужна интерактивная настройка

## Шаги для полного production deployment:

### 1. Авторизоваться на Railway (интерактивно)
```bash
npm install -g @railway/cli
railway login
# Откроется браузер для авторизации
```

### 2. После авторизации - задеплоить Colyseus на Railway
```bash
cd /path/to/basket-lviv
railway init
# Выбери: basket-colyseus
# Railway автоматически найдёт:
#   - Procfile (web: npx tsx server.ts)
#   - package.json (зависимости)
#   - server.ts (entry point)

railway up
# Получи URL вида: https://basket-colyseus-XXXX.up.railway.app
```

### 3. Добавить Railway URL в Vercel
```bash
vercel env add NEXT_PUBLIC_COLYSEUS_URL
# Введи: wss://basket-colyseus-XXXX.up.railway.app
# Выбери: Production environment

vercel --prod --token YOUR_VERCEL_TOKEN
# Редеплой на Vercel с новой переменной
```

### 4. Протестировать на production
1. Открыть: https://basketball.lviv.ua
2. Открыть DevTools (F12)
3. Console должна показать:
   ```
   [🔴 DEBUG] Connecting to Colyseus (PRODUCTION): wss://basket-colyseus-XXXX.up.railway.app
   [🔴 DEBUG] Colyseus room joined: XXXXXXXX
   ```
4. Открыть в другом браузере тот же URL
5. Добавить игрока в каждом браузере
6. Оба должны видеть друг друга на канвасе

## Текущий локальный сервер
Если нужно быстро протестировать локально:
```bash
npm run dev:safe
# Запусти тест: node test_two_players.js
```

## Important
- Railway требует интерактивной авторизации (cannot be automated)
- После Railway URL добавь в Vercel env vars
- NEXT_PUBLIC_ переменные видны в браузере (security note)
