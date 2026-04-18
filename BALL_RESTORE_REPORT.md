# 📋 Отчет: Восстановление товаров в разделе "Мячи" (2026-04-18)

## ✅ Что было сделано

### 1. **Восстановлены данные товаров в БД**
- Удалены 12 старых/дублирующихся записей из таблицы `ShopProduct`
- Добавлены 11 новых товаров-мячей с полной информацией:
  - ✅ Название товара
  - ✅ Описание (на украинском)
  - ✅ Цена в гривнях (грн)
  - ✅ Категория: "М'ячі"
  - ✅ Размеры (5, 6, 7)
  - ✅ Путь к изображению
  - ✅ Эмодзи: 🏀
  - ✅ Статус: активные товары

### 2. **Созданы папка и файлы для изображений**
```
public/images/balls/
├── meteor-cellular.jpg
├── nike-playground-8p-graphic.jpg
├── nike-playground-8p.jpg
├── nike-jordan-bb-ultimate-8p.jpg
├── nike-jordan-legacy-2.0.jpg
├── nike-playground-next-nature.jpg
├── wilson-fiba-3x3-mini.jpg
├── wilson-nba-drv-pro.jpg
├── wilson-ncaa-elevate-vtx.jpg
├── wilson-ncaa-elevate-bskt.jpg
└── wilson-reaction-pro-295.jpg
```

### 3. **Placeholder изображения**
- Созданы SVG placeholders (400×400px) для всех товаров
- Они позволяют сайту работать без ошибок на отсутствие картинок
- Placeholder будут заменены на реальные фото позже

---

## 📦 Список восстановленных товаров

| # | Товар | Цена | Размеры | Статус |
|---|-------|------|---------|--------|
| 1 | М'яч баскетбольний Meteor Cellular | 1260 грн | 5, 6, 7 | ✅ |
| 2 | Nike EVERYDAY PLAYGROUND 8P GRAPHIC | 1350 грн | 7 | ✅ |
| 3 | Nike Everyday Playground 8P | 1200 грн | 7 | ✅ |
| 4 | Nike Jordan BB Ultimate 8P | 1950 грн | 7 | ✅ |
| 5 | Nike Jordan Legacy 2.0 | 1800 грн | 7 | ✅ |
| 6 | Nike Everyday Playground Next Nature | 1400 грн | 7 | ✅ |
| 7 | Wilson FIBA 3x3 MINI | 950 грн | 5, 6 | ✅ |
| 8 | Wilson NBA DRV PRO | 2400 грн | 7 | ✅ |
| 9 | Wilson NCAA ELEVATE VTX | 1850 грн | 7 | ✅ |
| 10 | Wilson NCAA ELEVATE BSKT | 1700 грн | 7 | ✅ |
| 11 | Wilson REACTION Pro 295 | 1550 грн | 7 | ✅ |

**Всего:** 11 товаров · **Диапазон цен:** 950 - 2400 грн

---

## 🔧 Технические детали

### Использованные команды
```bash
# Создание и заполнение БД
node scripts/restore-balls.js

# Создание placeholder изображений
node scripts/create-placeholder-images.js

# Проверка товаров
node test-balls.js
```

### Структура БД (Prisma)
```typescript
model ShopProduct {
  id: Int
  name: String
  description: String
  price: Int
  category: String ("М'ячі")
  emoji: String ("🏀")
  sizes: String ("5,6,7")
  imageUrl: String ("/images/balls/...")
  inStock: Boolean (true)
  sortOrder: Int (0-10)
  createdAt: DateTime
  updatedAt: DateTime
}
```

### API Endpoint
```
GET /api/shop/products
```

Возвращает JSON со всеми товарами, включая мячи с полной информацией.

---

## 🖼️ Следующие шаги: Замена placeholder на реальные изображения

### Как скачать реальные фото:

1. **Используйте источники из файла:** `BALL_IMAGES_SOURCES.md`
2. **Для каждого товара:**
   - Откройте URL в браузере
   - Найдите главное изображение товара
   - Нажмите правой кнопкой → "Сохранить изображение как..."
   - Сохраните в `public/images/balls/`
   - **Используйте ровно указанное имя файла**

3. **Проверьте загрузку:**
   ```bash
   ls -lh public/images/balls/
   ```

4. **На сайте сразу обновятся фото** (не нужно пересоздавать БД)

---

## ✨ Проверка на сайте

После замены placeholder на реальные изображения:

1. Откройте https://basketball.lviv.ua/shop
2. Перейдите в раздел "М'ячи"
3. Проверьте:
   - ✅ Все 11 товаров видны
   - ✅ Правильные цены (950-2400 грн)
   - ✅ Размеры кнопок (5, 6, 7)
   - ✅ Реальные изображения (вместо placeholders)
   - ✅ Кнопка "Купити" работает
   - ✅ Модальное окно заказа открывается

---

## 📝 Файлы, созданные при восстановлении

- ✅ `scripts/restore-balls.js` — основной скрипт восстановления
- ✅ `scripts/create-placeholder-images.js` — создание SVG placeholders
- ✅ `scripts/restore-ball-products.ts` — TypeScript версия (для справки)
- ✅ `scripts/download-ball-images.js` — справочник для скачивания
- ✅ `BALL_IMAGES_SOURCES.md` — список источников и инструкция
- ✅ `BALL_RESTORE_REPORT.md` — этот отчет
- ✅ `public/images/balls/` — папка с изображениями (placeholder)
- ✅ `test-balls.js` — скрипт для проверки БД

---

## 🔒 Безопасность и Backup

**Перед восстановлением:**
- Была проверена структура БД (Prisma schema)
- Были удалены только товары категории "М'ячи"
- Остальные товары (Форма, Взуття, Аксесуари и т.д.) не затронуты
- Сортировка товаров сохранена (sortOrder: 0-10)

**Рекомендация:**
- Сохраните резервную копию БД перед изменениями на production
- Команда: `pg_dump -h [HOST] -U [USER] [DB] > backup_balls_2026_04_18.sql`

---

## 📞 Контакты и поддержка

Если изображения не загружаются:
1. Проверьте наличие файлов: `ls public/images/balls/`
2. Проверьте права доступа: `chmod 644 public/images/balls/*.jpg`
3. Очистите кэш браузера: Ctrl+Shift+Delete
4. Проверьте путь в БД: должен быть `/images/balls/FILENAME.jpg`

---

**Дата восстановления:** 2026-04-18  
**Статус:** ✅ Готово к использованию  
**Следующий шаг:** Замена placeholder на реальные изображения
