# GitHub Actions Setup для Fly.io Deployment

## Шаг 1: Добавьте FLY_API_TOKEN secret

1. Откройте https://github.com/golospravdy8-rgb/Repository/settings/secrets/actions
2. Нажмите "New repository secret"
3. Заполните:
   - **Name**: `FLY_API_TOKEN`
   - **Value**: (используйте Fly.io token из D:\n8n\.secrets\apis.md, строка с "fly TOKEN")

4. Нажмите "Add secret"

## Шаг 2: Trigger deployment

После добавления secret, workflow будет запущен автоматически при:
- Изменении файлов на main ветке:
  - server.ts
  - lib/colyseus/**
  - Dockerfile
  - fly.toml
  - package.json

Или можно создать пустой коммит:
```bash
git commit --allow-empty -m "trigger fly.io deployment"
git push
```

## Шаг 3: Проверить деплой

Перейдите на https://github.com/golospravdy8-rgb/Repository/actions

Там вы увидите workflow "Deploy to Fly.io" в процессе выполнения.

После успеха URL будет: https://basket-colyseus.fly.dev

## Шаг 4: Добавьте URL в Vercel

После успешного деплоя на Fly.io:

1. Откройте https://vercel.com/dashboard/basket-lviv/settings/environment-variables
2. Добавьте переменную (Production):
   - Name: `NEXT_PUBLIC_COLYSEUS_URL`
   - Value: `wss://basket-colyseus.fly.dev`
3. Нажмите "Save"
4. Редеплоите на Vercel через Dashboard или:
   ```bash
   vercel --prod --token YOUR_VERCEL_TOKEN
   ```

---

Это всё! GitHub Actions автоматически будет деплоить на Fly.io при каждом push.
