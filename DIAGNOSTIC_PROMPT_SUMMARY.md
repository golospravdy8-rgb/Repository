# 📋 DIAGNOSTIC PROMPT — КРАТКАЯ СПРАВКА

**Назначение:** Передать Claude Code инструкции для глубокой диагностики playoff generation  
**Статус:** Только анализ, БЕЗ исправлений  
**Файл полного prompt'а:** `DIAGNOSTIC_PROMPT.md`

---

## 🎯 ОСНОВНАЯ ЗАДАЧА

Провести полную техническую диагностику почему кнопка:

**"⚡ Згенерувати плей-офф"** 

на странице http://localhost:3006/admin/site-editor

НЕ создаёт playoff данные, которые должны отображаться на:

http://localhost:3006/schedule?ag=older

в разделе:

**"🏆 Плей-офф"**

---

## 🔍 ЧТО CLAUDE CODE ДОЛЖЕН ПРОВЕРИТЬ

| # | Область | Что искать | Инструмент |
|---|---------|-----------|-----------|
| 1️⃣ | **Frontend Flow** | Handler → API → Rendering | DevTools Network tab |
| 2️⃣ | **Network API** | Endpoint существует, status code, response | Browser Console + Network |
| 3️⃣ | **Database** | Создаются ли записи в БД, Prisma errors | Prisma Studio / SQL |
| 4️⃣ | **Playoff Logic** | Алгоритм генерации, data validation | grep + code review |
| 5️⃣ | **Schedule Rendering** | Как отображаются данные, fetch logic | Schedule page code |
| 6️⃣ | **Runtime** | Console errors, server logs, requests | DevTools + terminal |
| 7️⃣ | **Architecture** | Дублирование, type consistency | Code search |

---

## 🚀 ПОШАГОВЫЙ ПРОЦЕСС

```
1. Запустить проект
   npm run dev
   
2. Открыть браузер
   http://localhost:3006/admin/site-editor
   
3. Открыть DevTools
   F12 → Network + Console tabs
   
4. Нажать кнопку
   "⚡ Згенерувати плей-офф"
   
5. Смотреть:
   - Появляется ли request в Network?
   - Какой status code?
   - Какой response?
   - Какие ошибки в Console?
   - Какие логи в terminal?
   
6. Проверить БД
   Создались ли новые записи?
   Какие таблицы затронуты?
   
7. Перейти на schedule страницу
   http://localhost:3006/schedule?ag=older
   
   Появился ли playoff?
   Или всё ещё "Дані не додані"?
   
8. Анализировать весь flow
   Где цепочка ломается?
```

---

## 📊 ОЖИДАЕМЫЙ РЕЗУЛЬТАТ

### Диагностический отчёт должен содержать:

```
✅ ROOT CAUSE ANALYSIS
   - Точное описание проблемы
   - На каком слое происходит
   - Первопричина

✅ EXECUTION FLOW
   - Пошагово с отметками ✅ / ❌
   - Где именно ломается
   - Какой ошибкой

✅ FILES INVOLVED
   - Все файлы которые участвуют
   - Frontend
   - Backend
   - Database
   - Config

✅ ERROR LOGS
   - Все найденные ошибки
   - Console errors
   - Network errors (4xx/5xx)
   - Prisma errors
   - Server logs

✅ SAFE FIX STRATEGY (БЕЗ КОДА)
   - Описание как исправлять
   - Какие файлы менять
   - Какие риски
   - Какие зависимости
```

---

## ❌ ЗАПРЕТЫ (КРИТИЧЕСКИ ВАЖНО)

**Claude Code НЕ ДОЛЖЕН:**
- Исправлять код
- Менять файлы
- Делать refactor
- Создавать patch
- Делать commit
- Трогать БД

**Это ТОЛЬКО диагностика и анализ.**

---

## 📖 КАК ИСПОЛЬЗОВАТЬ

### Шаг 1: Передать prompt Claude Code
Скопировать содержимое `DIAGNOSTIC_PROMPT.md` и отправить Claude Code:

```
Провести полную техническую диагностику системы генерации playoff.

[Вставить содержимое DIAGNOSTIC_PROMPT.md]

Помни: ТОЛЬКО АНАЛИЗ, НИЧЕГО НЕ ИСПРАВЛЯТЬ.
```

### Шаг 2: Дождаться диагностического отчёта
Claude Code проведёт анализ и выдаст подробный отчёт с:
- Root cause analysis
- Full execution flow
- Files involved
- Error logs
- Safe fix strategy

### Шаг 3: Передать отчёт ChatGPT (опционально)
Если нужна второе мнение перед исправлением.

### Шаг 4: Создать fix prompt (отдельно)
На основе диагностики создать `FIX_PROMPT.md` с инструкциями на исправление.

---

## 🔗 СВЯЗАННЫЕ ДОКУМЕНТЫ

| Документ | Назначение |
|----------|-----------|
| `DIAGNOSTIC_PROMPT.md` | Полный диагностический prompt |
| `DIAGNOSTIC_PROMPT_SUMMARY.md` | Эта справка |
| `FIX_PROMPT.md` | Будет создан после диагностики |

---

## ✉️ ШАБЛОНдля передачи Claude Code

```markdown
# DIAGNOSTIC TASK: Playoff Generation Bug

Проведи полную техническую диагностику почему playoff generation не работает.

**Проблема:**
- Кнопка: "⚡ Згенерувати плей-офф" на /admin/site-editor
- Ожидание: Автоматическое создание playoff
- Реальность: Ничего не происходит
- Результат на /schedule?ag=older: "Дані плей-офф ще не додані"

**Инструкции для диагностики см. в файле DIAGNOSTIC_PROMPT.md**

КРИТИЧНО: 
- Только анализ
- БЕЗ исправлений
- БЕЗ изменения кода
- Полный отчёт с root cause analysis
```

---

**Дата создания:** 2026-05-08  
**Версия:** 1.0  
**Статус:** Готов к использованию
