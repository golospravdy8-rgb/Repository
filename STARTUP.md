# Запуск basket-lviv на localhost:3006

## ✅ Рабочая команда
```bash
npm run dev
```

Это автоматически запустит:
- Next.js на `http://localhost:3006`
- Prisma инициализируется
- Все зависимости загружаются

## 🌐 Проверка
```bash
# Базовый URL
curl http://localhost:3006

# С параметром возрастной группы
curl http://localhost:3006/?ag=younger
curl http://localhost:3006/?ag=older
```

## 📊 Порты
- **3006** — основной сайт (Next.js dev)
- 3007-3011 — микросервисы (если запустить `npm run portal`)

## 🔧 Диагностика
Если порт занят:
```bash
# Найти процесс на 3006
netstat -ano | grep 3006

# Убить процесс (на Windows PowerShell)
Stop-Process -Id <PID> -Force
```

## ✨ Первый запуск
1. `npm install` — установить зависимости
2. `.env` должен быть настроен (DATABASE_URL, Firebase keys и т.д.)
3. `npm run db:push` — синхронизировать БД (если нужно)
4. `npm run dev` — запустить сервер

Сервер готов когда видишь:
```
✓ Ready in X.Xs
- Local: http://localhost:3006
```

---
**Обновлено:** 2026-05-08
