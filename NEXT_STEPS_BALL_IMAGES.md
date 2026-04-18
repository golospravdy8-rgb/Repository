# 🎯 Следующие шаги: Загрузка реальных изображений мячей

## ✅ Что сделано (2026-04-18)

Восстановлены данные **11 товаров-мячей** в PostgreSQL:
- ✅ Названия, описания, цены (950-2400 грн)
- ✅ Размеры (5, 6, 7)
- ✅ Категория "М'ячі" 
- ✅ Placeholder SVG изображения (400×400px)
- ✅ API `/api/shop/products` работает
- ✅ Сайт https://basketball.lviv.ua/shop готов к показу мячей

**Статус на сайте:** ✅ **РАБОТАЕТ**. Мячи видны с placeholder фото.

---

## 📥 Необходимо: Загрузить реальные изображения

### Где брать изображения:

Файл со всеми источниками: **`BALL_IMAGES_SOURCES.md`** в корне проекта.

Источник товаров: **https://sportmaydan.com.ua/**

---

## 🖥️ Как загрузить реальные фото

### Способ 1: Ручная загрузка (10-15 минут)

1. **Скачайте изображения:**
   - Откройте браузер
   - Перейдите по URL из `BALL_IMAGES_SOURCES.md`
   - Щелкните правой кнопкой на изображение товара
   - "Сохранить изображение как..."
   - Сохраните в: `D:\n8n\basket-lviv\public\images\balls\`
   - Используйте **ровно то имя файла**, которое указано в таблице

2. **Проверьте загрузку:**
   ```bash
   cd D:\n8n\basket-lviv
   ls -lh public/images/balls/
   ```

3. **Пересчитайте сайт:**
   ```bash
   npm run build
   npm run dev
   ```

4. **Откройте https://basketball.lviv.ua/shop**
   - Раздел "М'ячи"
   - Фото должны обновиться автоматически

---

### Способ 2: Автоматическая загрузка через скрипт (требует зависимостей)

```bash
cd D:\n8n\basket-lviv
node scripts/download-ball-images.js
```

> ⚠️ Требует установки `sharp` и доступ к sportmaydan.com.ua (возможны ограничения bot-защиты)

---

## 📋 Список товаров и файлов

| Товар | Файл | Источник |
|-------|------|----------|
| М'яч баскетбольний Meteor Cellular | `meteor-cellular.jpg` | [URL](https://sportmaydan.com.ua/m-yach-basketbolnyj-meteor-cellular-7-korychnevyj-kremovyj) |
| Nike EVERYDAY PLAYGROUND 8P GRAPHIC | `nike-playground-8p-graphic.jpg` | [URL](https://sportmaydan.com.ua/index.php?route=product/product&product_id=20483) |
| Nike Everyday Playground 8P | `nike-playground-8p.jpg` | [URL](https://sportmaydan.com.ua/m-yach-basketbolnyj-nike-everyday-playground-8p-bvv-n-100-4498-085) |
| Nike Jordan BB Ultimate 8P | `nike-jordan-bb-ultimate-8p.jpg` | [URL](https://sportmaydan.com.ua/m-yach-basketbolniy-nike-jordan-bb-ultimate-8p-white-university-blue-university-red) |
| Nike Jordan Legacy 2.0 | `nike-jordan-legacy-2.0.jpg` | [URL](https://sportmaydan.com.ua/index.php?route=product/product&product_id=20430) |
| Nike Everyday Playground Next Nature | `nike-playground-next-nature.jpg` | [URL](https://sportmaydan.com.ua/m-yach-basketbolnyj-nike-everyday-playground-next-nature-8p-n-100-7037-973) |
| Wilson FIBA 3x3 MINI | `wilson-fiba-3x3-mini.jpg` | [URL](https://sportmaydan.com.ua/m-yach-basketbolnyj-wilson-fiba-3x3-mini-wtb1733) |
| Wilson NBA DRV PRO | `wilson-nba-drv-pro.jpg` | [URL](https://sportmaydan.com.ua/m-yach-basketbolnyj-wilson-nba-drv-pro) |
| Wilson NCAA ELEVATE VTX | `wilson-ncaa-elevate-vtx.jpg` | [URL](https://sportmaydan.com.ua/m-yach-basketbolnyj-wilson-ncaa-elevate-vtx-bskt-orange-blue) |
| Wilson NCAA ELEVATE BSKT | `wilson-ncaa-elevate-bskt.jpg` | [URL](https://sportmaydan.com.ua/m-yach-basketbolnyj-wilson-ncaa-ncaa-elevate-bskt-wz3007001) |
| Wilson REACTION Pro 295 | `wilson-reaction-pro-295.jpg` | [URL](https://sportmaydan.com.ua/m-yach-basketbolnyj-wilson-reaction-pro-295) |

---

## 🎬 Быстрая инструкция (5 минут)

1. Откройте `BALL_IMAGES_SOURCES.md` → скопируйте первый URL
2. Откройте в браузере → найдите товар
3. Щелкните на большое фото правой кнопкой
4. **"Сохранить изображение как..."**
5. В диалоге:
   - Переходите в: `public/images/balls/`
   - Имя файла: скопируйте из таблицы
   - ✅ Сохранить
6. Повторите для остальных 10 товаров
7. Проверьте: `ls public/images/balls/ | wc -l` (должно быть 11)
8. На сайте фото обновятся автоматически

---

## 🔗 Полезные команды

```bash
# Проверить, что все файлы на месте
ls -lh public/images/balls/

# Проверить размер каждого файла (должны быть реальные картинки, не placeholder)
file public/images/balls/*.jpg

# Проверить что БД синхронизирована
node test-balls.js

# Пересчитать сайт (если фото не обновляются)
rm -rf .next
npm run build

# Локальный тест
npm run dev
# Откройте http://localhost:3007/shop → М'ячи
```

---

## ⚠️ Проверка перед production deploy

Перед push на production:

```bash
# 1. Проверьте все 11 фото на месте
ls public/images/balls/ | wc -l  # должно быть 11

# 2. Убедитесь что это не placeholder (размер > 1KB)
ls -lhS public/images/balls/ | awk '{print $5, $9}' | sort -rn | head -3

# 3. Локальный тест
npm run build
npm run dev
# Откройте http://localhost:3007/shop и проверьте м'ячи

# 4. Push в GitHub
git add public/images/balls/
git commit -m "Add real ball product images"
git push origin main
```

---

## 🚀 После загрузки фото

1. **Commit & Push:**
   ```bash
   git add public/images/balls/
   git commit -m "Add real ball images from sportmaydan.com.ua"
   git push origin main
   ```

2. **Vercel будет автоматически перестроен**
   - Deploy произойдёт в течение 2-3 минут
   - Проверьте: https://basketball.lviv.ua/shop → М'ячи
   - Фото должны быть реальными

3. **Проверьте на мобильной версии**
   - DevTools → iPhone 12 Pro
   - Раздел "М'ячи" 
   - Кнопки размеров (5, 6, 7)
   - Кнопка "Купити"

---

## 💾 Файлы восстановления

Все необходимые скрипты и отчеты в проекте:

- ✅ `scripts/restore-balls.js` — восстановление данных (уже выполнено)
- ✅ `scripts/create-placeholder-images.js` — создание placeholder (уже выполнено)
- ✅ `BALL_IMAGES_SOURCES.md` — список всех источников
- ✅ `BALL_RESTORE_REPORT.md` — полный отчет о восстановлении
- ✅ `test-balls.js` — скрипт для проверки БД
- 📁 `public/images/balls/` — папка для изображений (placeholder готовы)

---

## 📞 Если что-то пошло не так

1. **Фото не загружаются на сайте?**
   - Проверьте: `file public/images/balls/*.jpg` (должны быть JPEG, не SVG)
   - Очистите браузер: Ctrl+Shift+Delete
   - Пересчитайте: `npm run build && npm run dev`

2. **Сайт не перестраивается?**
   - Удалите кэш: `rm -rf .next node_modules/.cache`
   - Перестройте: `npm run build`

3. **БД сбросилась?**
   - Используйте `node test-balls.js` для проверки
   - Если товаров нет: `node scripts/restore-balls.js`

---

**Время на выполнение:** ⏱️ 10-15 минут (ручная загрузка)  
**Сложность:** 🟢 Легко  
**Результат:** ✅ 11 товаров-мячей с реальными фото на сайте
