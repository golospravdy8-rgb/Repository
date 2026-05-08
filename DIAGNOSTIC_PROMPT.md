# 🔍 ДИАГНОСТИЧЕСКИЙ PROMPT ДЛЯ CLAUDE CODE
## Playoff Generation System — Full Technical Diagnosis

**Версия:** 1.0  
**Дата:** 2026-05-08  
**Цель:** Глубокая техническая диагностика (БЕЗ ИСПРАВЛЕНИЙ)  
**Статус:** Анализ только  

---

## 📋 КОНТЕКСТ ПРОЕКТА

**Проект:** basket-lviv (Next.js 14 Full-Stack Basketball Championship System)

**Окружение:**
- Frontend: Next.js 14 + React 19 + TypeScript
- Backend: API Routes + Server Actions
- Database: PostgreSQL + Prisma ORM
- Deploy: Vercel (production: https://basketball.lviv.ua)
- Local dev: http://localhost:3006

**Структура данных:**
- Сезоны (isActive, ageGroup: younger/older)
- Команды (Team, seasonId, ageGroup)
- Группы (Group: A/B, ageGroup)
- Игры (Game, homeTeamId, awayTeamId, stage, seasonId, tourId)
- Playoff (структура: TBD, нужно найти)

---

## 🚨 ПРОБЛЕМА

### Наблюдаемое поведение

**Где:** http://localhost:3006/admin/site-editor (вкладка с кнопкой)  
**Кнопка:** "⚡ Згенерувати плей-офф"  
**Ожидание:** Автоматическое создание playoff данных  
**Реальность:** Ничего не происходит  

**Результат на странице:** http://localhost:3006/schedule?ag=older

```
🏆 Плей-офф
Дані плей-офф ще не додані  ← Должно быть расписание матчей
```

**Возможные проблемы:**
- Playoff не создаётся в БД
- Playoff создаётся, но fetch возвращает пусто
- Frontend не обновляется после клика
- API ошибка скрывается try/catch
- Race condition между созданием и fetch
- State/cache mismatch

### Масштаб

- Должна работать для U-14 (younger)
- Должна работать для U-16 (older)
- Оба ageGroup должны иметь независимые playoff

---

## 🎯 ОБЯЗАТЕЛЬНАЯ ДИАГНОСТИКА

### 1️⃣ FRONTEND FLOW (кнопка → отображение)

**Нужно найти и проследить:**

1. **Кнопка в UI**
   - Где находится в коде
   - Какой компонент её содержит
   - Какой handler на клик
   - Какой onClick/onSubmit вызывается

2. **Handler функция**
   - Что она вызывает
   - Какой endpoint
   - Какие payload отправляются
   - Есть ли validation перед отправкой
   - Есть ли try/catch
   - Что происходит при success
   - Что происходит при error

3. **API Request**
   - Какой HTTP метод (GET/POST)
   - Какой URL endpoint
   - Какие headers
   - Какой body (если POST)
   - Timeout settings
   - Retry logic

4. **Response handling**
   - Как парсится ответ
   - Есть ли проверка статуса
   - Как обновляется UI
   - Вызывается ли revalidatePath
   - Есть ли router.refresh()
   - Есть ли state update

5. **Rendering playoff на schedule page**
   - Где компонент playoff
   - Как он fetch данные
   - Какой endpoint используется
   - Когда именно fetch вызывается (SSR? client?)
   - Как данные попадают в компонент
   - Есть ли Suspense/loading state
   - Как отображается пустое состояние

**Показать:**
```
Нажатие кнопки
    ↓
onClick/onSubmit handler
    ↓
API call к /api/generate-playoff
    ↓
POST /api/generate-playoff { ageGroup: "older" }
    ↓
Response { success: true, playoff: {...} }
    ↓
setState / router.refresh()
    ↓
Schedule page fetch playoff data
    ↓
PlayoffBracket component renders
```

**Остановка в цепи:**
- На каком шаге отрывается?
- Какой ошибкой?
- Какой код её скрывает?

---

### 2️⃣ NETWORK & API ДИАГНОСТИКА

**Нужно проверить:**

1. **Существование endpoint'а**
   - Файл: `/app/api/*/route.ts`
   - Ищет файлы: `*playoff*`, `*generate*`
   - Проверить метод: GET или POST
   - Проверить path: `/api/generate-playoff` или другой
   - Проверить export: `export async function POST()`

2. **Реальный вызов**
   - Открыть DevTools → Network
   - Нажать кнопку
   - Есть ли request в Network?
   - Какой статус (200? 404? 500)?
   - Какой response body?
   - Какие headers?

3. **Ошибки в запросе**
   - Status 404 → endpoint не существует
   - Status 500 → backend error
   - Status 403 → auth issue
   - Status timeout → слишком долго
   - Нет request вообще → frontend не отправляет

4. **Response analysis**
   - Успешный response имеет какую структуру
   - Есть ли ошибка в response body
   - Есть ли "success": false
   - Есть ли error message
   - Есть ли пустые данные: `playoff: {}` или `playoff: null`

5. **Network tab в DevTools**
   - Перехватить запрос
   - Показать Request headers
   - Показать Request body
   - Показать Response status
   - Показать Response body
   - Показать timing

**Инструменты:**
```bash
# В браузере DevTools
1. Network tab
2. Нажать кнопку
3. Смотреть request/response
4. Проверить status code
5. Проверить CORS headers если cross-origin

# В консоли
1. Открыть Console
2. Нажать кнопку
3. Есть ли console.log/console.error
4. Есть ли fetch() promise rejection
5. Есть ли 404 error
```

---

### 3️⃣ DATABASE & PRISMA ДИАГНОСТИКА

**Нужно проверить:**

1. **Prisma schema**
   - Ищет модели связанные с playoff
   - Какие модели существуют:
     - `Playoff`?
     - `PlayoffBracket`?
     - `PlayoffMatch`?
     - Или данные хранятся в `Game` с `stage: "semifinal"` и т.д.?
   - Какие поля в модели
   - Какие relations
   - Какие constraints

2. **Таблицы в БД**
   - Какие таблицы связаны с playoff
   - Ищет в schema.prisma:
     - `model Playoff { ... }`
     - `model PlayoffRound { ... }`
     - `model PlayoffMatch { ... }`
     - Или структура другая?

3. **Создание playoff в БД**
   - Находит функцию генерации playoff
   - Где она находится:
     - `/app/api/*/route.ts`?
     - `/actions/*`?
     - `/lib/*`?
   - Какие Prisma calls она делает:
     - `prisma.playoff.create()`?
     - `prisma.game.updateMany({ stage: "semifinal" })`?
     - `prisma.groupTables.update()`?
   - Есть ли транзакция?
   - Есть ли rollback на ошибку?
   - Создаются ли записи для обоих ageGroup?

4. **Проверка БД состояния**
   - Запустить query:
     ```sql
     SELECT * FROM "Playoff" LIMIT 10;
     ```
   - Запустить query:
     ```sql
     SELECT * FROM "PlayoffMatch" LIMIT 10;
     ```
   - Или какой точный запрос нужен зависит от схемы
   - Есть ли записи?
   - Какие значения?
   - Какие NULL/пустые поля?

5. **Prisma validation errors**
   - Есть ли ошибки при создании
   - Есть ли schema mismatch
   - Есть ли required field missing
   - Есть ли nullable field conflict
   - Есть ли relation constraint violation

**Команды для проверки:**
```bash
# Посмотреть schema
cat prisma/schema.prisma | grep -A 20 "model Playoff"

# Проверить Prisma generate status
npx prisma generate

# Запустить Prisma Studio (UI для БД)
npx prisma studio

# Проверить миграции
npx prisma migrate status
```

---

### 4️⃣ ЛОГИКА PLAYOFF ГЕНЕРАЦИИ

**Нужно понять:**

1. **Алгоритм генерации**
   - Откуда берутся команды (из Groups? из Standings?)
   - Как определяется bracket (8 teams? 4 teams?)
   - Как определяются matchups
   - Какой порядок раундов (semifinal → final → third_place?)
   - Есть ли зависимость от group standings

2. **Данные входа**
   - Функция принимает какие параметры:
     - `ageGroup: "younger"` / `"older"`?
     - `seasonId`?
     - Другие?
   - Откуда берёт group данные
   - Откуда берёт team standings
   - Есть ли фильтрация по ageGroup

3. **Данные выхода**
   - Что создаётся в БД
   - Структура playoff match
   - Содержит ли: `homeTeamId`, `awayTeamId`, `stage`, `scheduledAt`?
   - Как связывается с `Game` модель
   - Если playoff = игры, то как отличить от group games?

4. **Проверка типов данных**
   - `ageGroup: "younger"` vs `"u14"` vs `"U-14"`?
   - `stage: "semifinal"` vs `"SEMIFINAL"`?
   - Есть ли mismatch между frontend/backend enum?
   - Есть ли case sensitivity issues?

5. **Зависимости**
   - Нужны ли группы созданы?
   - Нужны ли игры сыграны для standings?
   - Нужны ли команды в группах?
   - Есть ли validation что группы готовы к playoff?

**Инструменты для проверки:**
```bash
# Найти функцию генерации
grep -r "generate.*playoff" --include="*.ts" --include="*.tsx"
grep -r "Генерувати.*плей" --include="*.ts" --include="*.tsx"
grep -r "Створити.*плей" --include="*.ts" --include="*.tsx"

# Найти playoff модель
grep -r "Playoff" prisma/schema.prisma
```

---

### 5️⃣ RENDERING SCHEDULE PAGE

**Нужно понять:**

1. **Компонент playoff**
   - Файл: `/app/(public)/schedule/page.tsx` или другой
   - Компонент: `PlayoffBracket`?
   - Где он импортируется
   - Какие props принимает
   - Как обновляется при клике на кнопку

2. **Fetch playoff данных**
   - Где fetch вызывается (Server Component? Client Component?)
   - Какой URL fetch использует
   - Пример: `fetch('/api/playoff?ageGroup=older')`
   - Когда вызывается:
     - При SSR на сервере?
     - При клиенте в useEffect?
     - При router.refresh()?

3. **Data flow на странице**
   ```
   Schedule Page SSR
       ↓
   Fetch playoff data from /api/playoff
       ↓
   Pass as props to PlayoffBracket component
       ↓
   Render bracket or "Дані не додані"
   
   При клике на кнопку:
       ↓
   POST /api/generate-playoff
       ↓
   router.refresh() или revalidatePath()
       ↓
   Schedule page re-fetches playoff
       ↓
   PlayoffBracket re-renders
   ```

4. **Условие для empty state**
   - Какое условие показывает "Дані не додані"
   - Пример: `if (!playoff || playoff.length === 0)`
   - Какой тип данных ожидается:
     - Array?
     - Object?
     - null?
     - undefined?

5. **SSR vs CSR**
   - Данные приходят с сервера или client fetch?
   - Есть ли Suspense?
   - Есть ли hydration mismatch?
   - Server component или Client component?

**Проверка в коде:**
```bash
# Найти schedule page
cat app/'(public)'/schedule/page.tsx | head -50

# Найти playoff компонент
grep -r "PlayoffBracket" --include="*.tsx"

# Найти fetch playoff
grep -r "api/playoff" --include="*.ts" --include="*.tsx"
```

---

### 6️⃣ RUNTIME ДИАГНОСТИКА

**Локально запустить и проверить:**

1. **Запустить dev сервер**
   ```bash
   npm run dev
   # или
   npm start
   # Проверить: http://localhost:3006
   ```

2. **Открыть браузер DevTools**
   - F12 или Ctrl+Shift+I
   - Network tab
   - Console tab
   - Application tab

3. **Кнопка генерации**
   - Открыть http://localhost:3006/admin/site-editor
   - Переключиться на табы где находится кнопка
   - Нажать "⚡ Згенерувати плей-офф"
   - Смотреть Network tab:
     - Появляется ли request?
     - Какой статус?
     - Какой response?

4. **Console errors**
   - Нет ли красных ошибок
   - Нет ли предупреждений
   - Нет ли "Failed to fetch"
   - Нет ли 404/500 errors

5. **Server console**
   - Смотреть terminal где запущен dev сервер
   - Есть ли логи при нажатии кнопки
   - Есть ли ошибки
   - Есть ли "generated playoff successfully"
   - Есть ли Prisma errors

6. **Prisma logs**
   - Активировать: `prisma.setLogLevel('debug')`
   - Или в .env: `DATABASE_URL` + `DEBUG=prisma:*`
   - Смотреть: какие query выполняются
   - Есть ли INSERT в playoff таблицу
   - Есть ли UPDATE в game таблицу

7. **Network requests последовательность**
   - POST /api/generate-playoff
   - Ответ success или error
   - Потом: GET /api/playoff или refresh()
   - Ответ с новыми данными или старые

**Команды для запуска:**
```bash
# Запустить dev сервер с логами
DEBUG=prisma:* npm run dev

# Или в отдельном terminal запустить Prisma Studio
npx prisma studio

# Проверить статус БД
npx prisma db execute --stdin < query.sql
```

---

### 7️⃣ ARCHITECTURE CONSISTENCY

**Нужно проверить:**

1. **Нет ли дублирующей логики**
   - Есть ли несколько функций генерации playoff
   - Есть ли старый legacy код
   - Есть ли конфликты между разными реализациями
   - Какая версия активна

2. **Sources of truth**
   - Где хранятся playoff данные (БД? localStorage? state?)
   - Есть ли несоответствие между sources
   - Кеш ли они где-то

3. **Type consistency**
   - Frontend types матчат backend types
   - Prisma model матчат API response
   - TypeScript нет ошибок типов
   - Enum values консистентные

4. **Import paths**
   - Все импорты работают
   - Нет broken imports
   - Нет circular dependencies
   - Все функции экспортируются

5. **Environment & Features**
   - Является ли playoff feature включённым
   - Есть ли feature flags
   - Есть ли environment-specific code
   - Разное ли поведение на localhost vs production

**Проверка:**
```bash
# Найти все references на playoff
grep -r "playoff" --include="*.ts" --include="*.tsx" | wc -l

# Найти все функции с playoff в имени
grep -r "function.*playoff\|const.*playoff.*=" --include="*.ts" --include="*.tsx"

# Проверить TypeScript errors
npx tsc --noEmit

# Проверить imports
grep -r "from.*playoff\|import.*playoff" --include="*.ts" --include="*.tsx"
```

---

## 📊 ОЖИДАЕМЫЙ РЕЗУЛЬТАТ ДИАГНОСТИКИ

### ROOT CAUSE ANALYSIS

Четкое описание:
- Какая именно проблема
- На каком слое (frontend/backend/database/network)
- Первопричина
- Secondary issues

### FULL EXECUTION FLOW

Пошаговое описание с отметками:

```
✅ / ❌ Шаг 1: Нажатие кнопки
✅ / ❌ Шаг 2: Handler вызывается
✅ / ❌ Шаг 3: API request отправляется
✅ / ❌ Шаг 4: Backend обрабатывает
✅ / ❌ Шаг 5: Данные пишутся в БД
✅ / ❌ Шаг 6: Response приходит
✅ / ❌ Шаг 7: Frontend обновляется
✅ / ❌ Шаг 8: Schedule page refreshает
✅ / ❌ Шаг 9: Playoff данные fetch
✅ / ❌ Шаг 10: Playoff рендерится
```

### FILES INVOLVED

Полный список файлов:
```
Frontend:
- app/admin/site-editor/page.tsx (кнопка)
- app/admin/components/SomeButton.tsx (компонент кнопки)
- app/(public)/schedule/page.tsx (страница расписания)
- components/public/PlayoffBracket.tsx (компонент playoff)
- lib/playoff-service.ts (если есть)

Backend:
- app/api/generate-playoff/route.ts (API для генерации)
- app/api/playoff/route.ts (API для fetch)
- actions/playoff-actions.ts (Server Actions если есть)
- lib/playoff-generator.ts (бизнес логика если есть)

Database:
- prisma/schema.prisma (модели)
- prisma/migrations/* (миграции для playoff)

Config:
- .env.local (DATABASE_URL)
- next.config.ts (settings)
```

### ERROR LOGS

Все найденные ошибки:
- Console errors
- Network errors (4xx/5xx)
- Prisma validation errors
- TypeScript compilation errors
- Stack traces
- Failed requests

### SAFE FIX STRATEGY (БЕЗ ИСПРАВЛЕНИЯ)

Описание как исправлять (без кода):

```
Проблема: [описание]

Исправление потребует:
1. Изменить файл: [путь] в функции [название]
   - Почему: [причина]
   - Риск: [риск]

2. Добавить логику: [описание]
   - Зависимости: [что затронется]
   - Потребует миграцию: ДА/НЕТ

3. Обновить: [что обновлять]
   - Frontend: [что менять]
   - Backend: [что менять]
   - Database: [миграция нужна?]

Порядок исправления:
- Сначала: [1]
- Потом: [2]
- Потом: [3]
```

---

## ⚠️ КРИТИЧЕСКИ ВАЖНО

**Claude Code НЕ ДОЛЖЕН:**
- ❌ Исправлять код
- ❌ Менять файлы
- ❌ Делать refactor
- ❌ Создавать patch
- ❌ Делать commit/push
- ❌ Изменять БД

**Claude Code ДОЛЖЕН:**
- ✅ Анализировать flow
- ✅ Проверять код (не изменять)
- ✅ Запускать runtime (для диагностики)
- ✅ Смотреть Network requests
- ✅ Смотреть БД состояние
- ✅ Смотреть console errors
- ✅ Показывать logs
- ✅ Описывать проблему
- ✅ Описывать решение (без кода)

---

## 🚀 ИНСТРУКЦИИ ДЛЯ CLAUDE CODE

```
1. Прочитайте этот prompt полностью

2. Запустите проект локально:
   npm run dev
   # Ждите: "Ready in X.Xs"

3. Проведите диагностику по всем 7 секциям
   - 1️⃣ Frontend flow
   - 2️⃣ Network API
   - 3️⃣ Database Prisma
   - 4️⃣ Playoff logic
   - 5️⃣ Schedule rendering
   - 6️⃣ Runtime checks
   - 7️⃣ Architecture

4. Выполните runtime проверки:
   - Откройте DevTools
   - Нажмите кнопку генерации
   - Смотрите Network/Console
   - Смотрите server logs

5. Напишите подробный диагностический отчёт:
   - Root cause analysis
   - Full execution flow
   - Files involved
   - Error logs
   - Safe fix strategy

6. НЕ ТРОГАЙТЕ КОД

7. Отправьте отчёт полностью
```

---

## 📝 ФИНАЛЬНЫЙ ФОРМАТ ОТВЕТА

```markdown
# 🔍 DIAGNOSTIC REPORT: Playoff Generation System

## ROOT CAUSE ANALYSIS
[Точное описание проблемы]

## EXECUTION FLOW ANALYSIS
[Пошаговый анализ с ✅/❌]

## FILES INVOLVED
[Список всех файлов]

## RUNTIME ERRORS & LOGS
[Все найденные ошибки]

## SAFE FIX STRATEGY
[Описание решения без кода]

## CONCLUSION
[Финальный вывод]
```

---

**Конец diagnostic prompt'а**

Этот prompt готов к передаче Claude Code для запуска диагностики.
