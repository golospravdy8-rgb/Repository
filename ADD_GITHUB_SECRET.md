# Добавление FLY_API_TOKEN Secret в GitHub

## Шаг за шагом (через веб-интерфейс)

### 1. Откройте GitHub Settings
- Перейдите в репозиторий: https://github.com/golospravdy8-rgb/Repository
- Нажмите на вкладку **Settings** (⚙️)

### 2. Найдите Secrets and variables
- На левой панели выберите **Secrets and variables** → **Actions**
- Нажмите зелёную кнопку **New repository secret**

### 3. Добавьте FLY_API_TOKEN
Заполните форму:
```
Name: FLY_API_TOKEN

Value: (скопируйте Fly.io token из D:\n8n\.secrets\apis.md строка 186)
       FlyV1 fm2_lJPECAAAAAAAE7Y2xBCKi0XQkU6MH3D0SfcVyV2tw...
```

### 4. Нажмите "Add secret"

---

## Результат

После добавления secret:
1. GitHub Actions workflow автоматически получит доступ к токену
2. При следующем push на main → workflow "Deploy to Fly.io" запустится
3. Деплой на Fly.io произойдёт автоматически
4. URL: `https://basket-colyseus.fly.dev`

---

## Проверить статус деплоя

1. Откройте: https://github.com/golospravdy8-rgb/Repository/actions
2. Выберите последний workflow "Deploy to Fly.io"
3. Посмотрите логи деплоя

---

## Если что-то не работает

- GitHub Actions требует **одного** secret: FLY_API_TOKEN
- Значение должно быть ровно та же, что в apis.md (включая "FlyV1 " префикс)
- После добавления secret может потребоваться 1-2 минуты на синхронизацию

---

## Следующие шаги после успешного деплоя

1. ✅ GitHub secret добавлен
2. ⏳ GitHub Actions запустится и задеплоит на Fly.io
3. ⏳ Получить URL: `https://basket-colyseus.fly.dev`
4. ⏳ Добавить в Vercel: `NEXT_PUBLIC_COLYSEUS_URL=wss://basket-colyseus.fly.dev`
5. ⏳ Редеплой на Vercel

---

Всё готово! Осталось только добавить secret в GitHub через веб-интерфейс.
