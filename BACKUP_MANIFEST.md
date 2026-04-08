# SUPER_FULL_BACKUP.json — Полный Backup basket-lviv

**Дата создания:** 2026-04-06  
**Версия:** 1.0.0  
**Тип:** SUPER_FULL_BACKUP (Structure + Data + Secrets)  
**Размер:** 696.2 KB (0.680 MB)

---

## 📦 Содержимое Backup

### 1. STRUCTURE (Исходный код, 96 файлов)

#### Pages (26)
- `app/layout.tsx`
- `app/(public)/page.tsx` (главная страница)
- `app/(public)/game/[id]/page.tsx`
- `app/(public)/players/page.tsx`
- `app/(public)/standings/page.tsx`
- `app/(public)/schedule/page.tsx`
- `app/(public)/news/[slug]/page.tsx`
- `app/(public)/teams/page.tsx`
- `app/(public)/leaders/page.tsx`
- `app/(public)/gallery/page.tsx`
- `app/(public)/highlights/page.tsx`
- И еще 15 других страниц

#### Components (12)
- `components/public/HomePageNeon.tsx` (главный компонент с hero, таблицей)
- `components/layout/Header.tsx`
- `components/layout/Footer.tsx`
- `components/public/StandingsTable.tsx`
- `components/public/NewsCard.tsx`
- `components/public/GameCard.tsx`
- И еще 6 компонентов

#### API Routes (3)
- `app/api/upload/route.ts` (загрузка файлов)
- `app/api/site-settings/route.ts` (управление настройками)
- `app/api/debug/hero-bg/route.ts` (отладка фона)

#### Libraries (4)
- `lib/prisma.ts` (Prisma ORM)
- `lib/auth.ts` (NextAuth.js)
- `lib/site-settings.ts` (управление сайтом)
- `lib/require-auth.ts` (защита маршрутов)

#### Actions (3)
- `actions/admin-data.ts`
- `actions/game.ts`
- `actions/site-settings.ts`

#### Config (4)
- `next.config.mjs`
- `tsconfig.json`
- `middleware.ts`
- `app/globals.css`

### 2. DATA (База данных, 226 записей)

#### Teams (11)
- 5 команд U-14 (younger)
- 6 команд U-16 (older)
- Примеры: "Mighty Ducks", "Коали", "Бізони", "Крокодили", и т.д.

#### Players (92)
- Распределены по командам
- Поля: number, firstName, lastName, position, team
- Позиции: PG, SG, SF, PF, C

#### Games (7)
- Матчи с домашними и выездными командами
- Статусы: SCHEDULED, FINAL
- Включает: homeScore, awayScore, scheduledAt

#### Seasons (2)
- U-14 2025-2026
- U-16 2025-2026

#### SiteSettings (93)
- Конфигурация сайта
- Цвета, размеры, тексты
- Пути к изображениям (logo, heroBg, и т.д.)
- Настройки видимости секций

#### BoxScores (21)
- Статистика по игрокам в играх
- Поля: points, rebounds, assists, steals, blocks, fouls, minutes

### 3. SECRETS (Переменные окружения)

```
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=ldbl-dev-secret-32-chars-ok-2025!
NEXTAUTH_URL=http://localhost:3006
```

---

## 🔄 Восстановление проекта

### Быстрое восстановление

1. **Получить файл backup:**
   ```bash
   # SUPER_FULL_BACKUP.json должен быть в корне проекта
   ```

2. **Восстановить структуру и БД:**
   ```bash
   # Вручную распаковать из JSON или создать скрипт
   node restore-super-backup.js SUPER_FULL_BACKUP.json
   ```

3. **Установить зависимости:**
   ```bash
   npm install
   ```

4. **Настроить БД:**
   ```bash
   npx prisma migrate deploy
   npm run db:seed
   ```

5. **Запустить:**
   ```bash
   npm run dev
   ```

### Детальное восстановление

Все файлы содержатся в `backup.structure`, все данные в `backup.data`, все секреты в `backup.secrets`.

---

## ✅ Гарантии и особенности

- ✅ **Полнота:** ВСЕ файлы сохранены полностью, не описания
- ✅ **Свежесть:** Актуальные данные на 2026-04-06
- ✅ **Чистота:** Удален мусор от старых проектов (apps/marketplace, apps/courses)
- ✅ **Безопасность:** Содержит все реальные секреты (личный backup)
- ✅ **Компактность:** 696 KB для полного проекта
- ✅ **Точность:** Структурированный JSON с четким разделением на 3 части

---

## 📋 Статистика

| Метрика | Значение |
|---------|----------|
| Структурных файлов | 96 |
| Pages | 26 |
| Components | 12 |
| API Routes | 3 |
| Libraries | 4 |
| Actions | 3 |
| Config files | 4 |
| **Всего записей БД** | **226** |
| Teams | 11 |
| Players | 92 |
| Games | 7 |
| Seasons | 2 |
| Settings | 93 |
| BoxScores | 21 |
| Secrets | 3 |
| **Размер файла** | **696.2 KB** |
| Дата создания | 2026-04-06 |
| Версия | 1.0.0 |

---

## 🔐 Содержание Secrets

Этот backup содержит реальные значения для:
- `DATABASE_URL` — PostgreSQL connection string
- `NEXTAUTH_SECRET` — NextAuth.js secret
- `NEXTAUTH_URL` — Authentication URL

**⚠️ Держите этот файл в безопасности и никогда не делитесь им публично!**

---

## 📝 Примечания

- Backup создан с использованием Prisma ORM
- Все данные выгружены из текущей базы данных
- Старые данные от других проектов удалены
- Файл готов к архивированию и долгосрочному хранению
- Может быть развернут на другом сервере/машине

---

**Создано:** 2026-04-06 09:05:40 UTC  
**Проект:** basket-lviv  
**Тип:** Production Backup v1.0
