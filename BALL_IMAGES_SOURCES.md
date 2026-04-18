# Источники изображений для мячей

## Инструкция по загрузке

1. Для каждого товара ниже откройте URL в браузере
2. Найдите главное изображение товара
3. Нажмите правой кнопкой мыши → "Сохранить изображение как..."
4. Сохраните в папку: `public/images/balls/`
5. Используйте ровно указанное имя файла

---

## Мячи (11 товаров)

### 1. Meteor Cellular
- **Файл:** `meteor-cellular.jpg`
- **Источник:** https://sportmaydan.com.ua/m-yach-basketbolnyj-meteor-cellular-7-korychnevyj-kremovyj
- **Цена:** 1260 грн
- **Размеры:** 5, 6, 7

### 2. Nike EVERYDAY PLAYGROUND 8P GRAPHIC
- **Файл:** `nike-playground-8p-graphic.jpg`
- **Источник:** https://sportmaydan.com.ua/index.php?route=product/product&product_id=20483
- **Цена:** 1350 грн
- **Размеры:** 7

### 3. Nike Everyday Playground 8P
- **Файл:** `nike-playground-8p.jpg`
- **Источник:** https://sportmaydan.com.ua/m-yach-basketbolnyj-nike-everyday-playground-8p-bvv-n-100-4498-085
- **Цена:** 1200 грн
- **Размеры:** 7

### 4. Nike Jordan BB Ultimate 8P
- **Файл:** `nike-jordan-bb-ultimate-8p.jpg`
- **Источник:** https://sportmaydan.com.ua/m-yach-basketbolniy-nike-jordan-bb-ultimate-8p-white-university-blue-university-red
- **Цена:** 1950 грн
- **Размеры:** 7

### 5. Nike Jordan Legacy 2.0
- **Файл:** `nike-jordan-legacy-2.0.jpg`
- **Источник:** https://sportmaydan.com.ua/index.php?route=product/product&product_id=20430
- **Цена:** 1800 грн
- **Размеры:** 7

### 6. Nike Everyday Playground Next Nature
- **Файл:** `nike-playground-next-nature.jpg`
- **Источник:** https://sportmaydan.com.ua/m-yach-basketbolnyj-nike-everyday-playground-next-nature-8p-n-100-7037-973
- **Цена:** 1400 грн
- **Размеры:** 7

### 7. Wilson FIBA 3x3 MINI
- **Файл:** `wilson-fiba-3x3-mini.jpg`
- **Источник:** https://sportmaydan.com.ua/m-yach-basketbolnyj-wilson-fiba-3x3-mini-wtb1733
- **Цена:** 950 грн
- **Размеры:** 5, 6

### 8. Wilson NBA DRV PRO
- **Файл:** `wilson-nba-drv-pro.jpg`
- **Источник:** https://sportmaydan.com.ua/m-yach-basketbolnyj-wilson-nba-drv-pro
- **Цена:** 2400 грн
- **Размеры:** 7

### 9. Wilson NCAA ELEVATE VTX
- **Файл:** `wilson-ncaa-elevate-vtx.jpg`
- **Источник:** https://sportmaydan.com.ua/m-yach-basketbolnyj-wilson-ncaa-elevate-vtx-bskt-orange-blue
- **Цена:** 1850 грн
- **Размеры:** 7

### 10. Wilson NCAA ELEVATE BSKT
- **Файл:** `wilson-ncaa-elevate-bskt.jpg`
- **Источник:** https://sportmaydan.com.ua/m-yach-basketbolnyj-wilson-ncaa-ncaa-elevate-bskt-wz3007001
- **Цена:** 1700 грн
- **Размеры:** 7

### 11. Wilson REACTION Pro 295
- **Файл:** `wilson-reaction-pro-295.jpg`
- **Источник:** https://sportmaydan.com.ua/m-yach-basketbolnyj-wilson-reaction-pro-295
- **Цена:** 1550 грн
- **Размеры:** 7

---

## Статус

✅ **БД обновлена:** 11 товаров добавлены в таблицу `ShopProduct`
⏳ **Изображения:** Требуют ручного скачивания с указанных источников

---

## Команда для проверки

```bash
curl -s https://basketball.lviv.ua/api/shop/products | jq '.products[] | select(.category == "М'\''ячі") | {name, price, sizes}'
```
