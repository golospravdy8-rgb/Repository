# 🚀 Fly.io Deployment - READY TO GO

## ✅ ЧТО ГОТОВО:

1. **GitHub Actions Workflow** (.github/workflows/fly-deploy.yml)
   - Автоматический деплой на Fly.io при push
   - Запускается при изменении: server.ts, lib/colyseus/**, Dockerfile, fly.toml, package.json

2. **Fly.io Config** (fly.toml)
   - Region: fra (Франкфурт)
   - VM: shared-cpu-1x, 256mb
   - HTTP service с force_https

3. **Docker Image** (Dockerfile)
   - Node 20 Alpine
   - npm ci для зависимостей
   - Готов к контейнеризации

4. **Documentation**
   - ADD_GITHUB_SECRET.md: как добавить secret
   - FLY_DEPLOYMENT_GUIDE.md: способы деплоя
   - GITHUB_ACTIONS_SETUP.md: настройка workflow

---

## 🔧 ЧТО НУЖНО СДЕЛАТЬ (Manual):

### Шаг 1: Добавить FLY_API_TOKEN secret в GitHub

⚡ **ВАЖНО**: Требуется GitHub Personal Access Token с правами на "admin:repo_hook"

Откройте браузер:
1. https://github.com/golospravdy8-rgb/Repository/settings/secrets/actions
2. **New repository secret**
3. **Name**: `FLY_API_TOKEN`
4. **Value**: (скопируйте из D:\n8n\.secrets\apis.md строка 186)
   ```
   FlyV1 fm2_lJPECAAAAAAAE7Y2xBCKi0XQkU6MH3D0SfcVyV2tw...
   ```
5. **Add secret**

### Шаг 2: Запустить деплой

После добавления secret, workflow запустится автоматически при следующем push:

```bash
git commit --allow-empty -m "trigger fly.io deployment"
git push origin main
```

Или просто измените любой файл (server.ts, Dockerfile и т.д.) и push.

### Шаг 3: Проверить статус

1. Откройте: https://github.com/golospravdy8-rgb/Repository/actions
2. Выберите последний workflow "Deploy to Fly.io"
3. Посмотрите логи

### Шаг 4: После успешного деплоя

Когда Fly.io деплой завершится успешно:

1. **Получить URL**: `https://basket-colyseus.fly.dev`

2. **Добавить в Vercel** (через Dashboard или API):
   ```
   https://vercel.com/dashboard/basket-lviv/settings/environment-variables
   
   - Name: NEXT_PUBLIC_COLYSEUS_URL
   - Value: wss://basket-colyseus.fly.dev
   - Target: Production
   ```

3. **Редеплой Vercel**:
   ```bash
   vercel --prod --token YOUR_VERCEL_TOKEN
   ```

---

## 📊 ИТОГОВЫЙ СТАТУС:

| Компонент | Статус | URL |
|-----------|--------|-----|
| Vercel Frontend | ✅ LIVE | https://basketball.lviv.ua |
| Colyseus Backend | ⏳ READY | Fly.io (ждёт secret) |
| GitHub Workflow | ✅ READY | .github/workflows/fly-deploy.yml |
| Fly.io Config | ✅ READY | fly.toml + Dockerfile |

---

## 🎯 СЛЕДУЮЩЕЕ ДЕЙСТВИЕ:

**Добавить FLY_API_TOKEN secret в GitHub (через веб-интерфейс)**

После этого GitHub Actions автоматически запустит деплой на Fly.io! 🚀

---

## ❓ ЕСЛИ ЧТО-ТО НЕ РАБОТАЕТ:

1. **Workflow не запускается**
   - Проверьте что secret добавлен (Settings → Secrets and variables → Actions)
   - Может потребоваться 1-2 минуты на синхронизацию

2. **Workflow запустился, но деплой завалился**
   - Откройте логи workflow (Actions → Deploy to Fly.io)
   - Обычно проблемы: недостающие зависимости, неверный PORT, Docker ошибка

3. **Нет доступа к GitHub Actions secrets**
   - Убедитесь что вы owner репозитория
   - GitHub token должен иметь права на "admin:repo_hook"

---

Всё готово! Осталось добавить secret и деплой произойдёт автоматически. ✨
