# Fly.io Deployment Guide - basket-colyseus

## Автоматическая часть ✅ ГОТОВА:
- fly.toml создан и настроен
- Dockerfile создан
- Файлы запушены в GitHub
- server.ts использует process.env.PORT

## Пошаговый деплой на Fly.io (интерактивный)

### Шаг 1: Откройте https://fly.io и авторизуйтесь
- Email: ваш аккаунт Fly.io
- Используйте API token: `fm2_lJPECAAAAAE7Y2xBCKi0XQkU6MH3D0SfcVyV2tw...`

### Шаг 2: Используйте этот скрипт в терминале Windows PowerShell

```powershell
# Set token
$env:FLY_API_TOKEN = "fm2_lJPECAAAAAAAE7Y2xBCKi0XQkU6MH3D0SfcVyV2twrVodHRwczovL2FwaS5mbHkuaW8vdjGUAJLOABixTB8Lk7lodHRwczovL2FwaS5mbHkuaW8vYWFhL3YxxDx/YvLaeEKmX17cdVFhNBSEE1u3EoJ36vfWoXNexHu8LWkHb9dgRQQlUbi4s4sF6zih5IZppPKn+XOGXUvETrflMSFWKjJa3rm9Oft3728d6WPEyKAhQYGX1TNXXSEcPrNHpr7eCT6RJ3q7YlNB5djD9YL9jVV1AZ7hMGNRFpMttmWWN06YV6o9cvScw8QgCM1LjOpbhgRp9blarQ2QQ8CTig6MOiTG9OcJzOljvBg=,fm2_lJPETrflMSFWKjJa3rm9Oft3728d6WPEyKAhQYGX1TNXXSEcPrNHpr7eCT6RJ3q7YlNB5djD9YL9jVV1AZ7hMGNRFpMttmWWN06YV6o9cvScw8QQGyx5MNIkJ+D7wCb0uuRJ4MO5aHR0cHM6Ly9hcGkuZmx5LmlvL2FhYS92MZgEks5p79hOzwAAAAEl5/ZsF84AF6lyCpHOABepcgzEENg0p1qTWO460Bwrik/FnnfEIIn/rM78w6MX3ep7NZAA5Cw3c0NmMwkJn6NDRED6GYGu"

# Скачайте и установите flyctl для Windows:
# https://github.com/superfly/flyctl/releases/download/v0.2.54/flyctl_windows_amd64.zip
# Распакуйте и добавьте в PATH

# Проверьте установку
flyctl version

# Войдите через token
flyctl auth token $env:FLY_API_TOKEN

# Или если flyctl не работает, используйте docker + github
```

### Шаг 3: Если flyctl не установится - используйте GitHub Actions

В репозитории GitHub создайте workflow файл: `.github/workflows/fly-deploy.yml`

```yaml
name: Deploy to Fly.io

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: superfly/flyctl-actions@1.3
        with:
          args: "deploy"
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
```

Затем:
1. Откройте репозиторий на GitHub
2. Перейдите Settings → Secrets and variables → Actions
3. Добавьте secret: `FLY_API_TOKEN` = ваш токен
4. Push на main ветку автоматически запустит деплой

### Шаг 4: Если ничего не работает - деплой через Docker

```bash
# Вручную через Docker Hub
docker login
docker build -t yourusername/basket-colyseus:latest .
docker push yourusername/basket-colyseus:latest

# Затем в Fly.io dashboard добавьте custom Docker image
```

---

## Результат после деплоя

URL будет: `https://basket-colyseus.fly.dev` (или ваше custom имя)

Затем добавьте в Vercel environment variables:

```
NEXT_PUBLIC_COLYSEUS_URL=wss://basket-colyseus.fly.dev
```

И редеплоите на Vercel:
```bash
vercel --prod --token YOUR_TOKEN
```

---

## Файлы готовы:
- ✅ fly.toml
- ✅ Dockerfile
- ✅ server.ts (используст PORT env var)
- ✅ GitHub repository подготовлен

Выберите один из способов деплоя выше и следуйте инструкциям.
