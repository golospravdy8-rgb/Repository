# Vercel Blob Setup — КРИТИЧНО для production

## ПРОблема
На production (basketball.lviv.ua) зображення не завантажуються, тому що BLOB_READ_WRITE_TOKEN не налаштований.

## Рішення

### **КРОК 1: Додай BLOB_READ_WRITE_TOKEN на Vercel (ОБОВ'ЯЗКОВО)**

1. Перейди: https://vercel.com/dashboard/golospravdy8-9774/repository/settings/environment-variables

2. Клікни **+ Add New**:
   ```
   Name: BLOB_READ_WRITE_TOKEN
   Value: [генеруватиметься автоматично на першому upload]
   Environments: ☑ Production ☑ Preview
   ```

3. **ІЛИ** — якщо Vercel Storage уже налаштований:
   - Перейди: https://vercel.com/dashboard/golospravdy8-9774/stores/blob
   - Копіюй **BLOB_READ_WRITE_TOKEN** з консолі
   - Додай його як env var вище

4. **ЙДИ** клікни **Save**

### **КРОК 2: Redeploy production**

```
Vercel Dashboard → Deployments → Latest Production 
→ 3-dots menu → Redeploy
```

### **КРОК 3: Запусти міграцію (опціонально, для старих файлів)**

Локально:
```bash
npm run db:migrate-images
```

Це завантажить всі старі фото з /public/images та /public/uploads у Vercel Blob.

---

## Як це працює

1. Admin завантажує зображення через Site Editor
2. /api/upload отримує файл
3. **Якщо BLOB_READ_WRITE_TOKEN встановлено:**
   - Файл завантажується на Vercel Blob
   - URL збереження у БД
   - ✅ Зображення персистентне на production

4. **Якщо BLOB_READ_WRITE_TOKEN НЕМАЄ:**
   - ❌ Upload падає з помилкою
   - Зображення не з'являється на production

---

## Результат

Після додавання токена та редеплою:
- ✅ Hero background завантажується
- ✅ Team logos видимі
- ✅ Player photos видимі
- ✅ News images завантажуються
- ✅ Адмін-панель: Upload image → виводиться Blob URL
