# Quick Commands - Admin VIP Setup

## One-Liner Setup (Recommended)

```bash
cd basket-lviv && node scripts/setup-real-admin.mjs
```

This single command will:
1. Show all admin accounts
2. Show all parent users
3. Ask for your real admin phone
4. Create/upgrade to admin
5. Activate VIP for 1 year
6. Ask if you want to delete test admin

---

## Check Current Status

```bash
# View all admin accounts in database
node scripts/check-admins.mjs

# Output:
# Admin: 2
# VIP: 1
# Parent: 3
# Guest: 3
```

---

## Activate Admin VIP via API

### Using Query Parameter (Easiest)
```bash
curl "http://localhost:3006/api/admin/setup-admin-vip?phone=%2B380681234567"
```

Replace `380681234567` with your real phone number (keep the `%2B` for the `+` sign).

### Using POST Request
```bash
curl -X POST "http://localhost:3006/api/admin/setup-admin-vip" \
  -H "Content-Type: application/json" \
  -d '{"phone": "+380681234567"}'
```

### Using Environment Variable
```bash
# 1. Edit .env.local
ADMIN_PHONE_NUMBER="+380681234567"

# 2. Call API
curl "http://localhost:3006/api/admin/setup-admin-vip"
```

---

## Set Cookie in Browser

### DevTools (Manual)
```
F12 → Application → Cookies → localhost:3006
Click "+" button
Name: user_phone
Value: +380681234567
Domain: localhost
Path: /
```

### Command Line (curl)
```bash
curl -b "user_phone=+380681234567" "http://localhost:3006/vip"
```

### JavaScript Console
```javascript
document.cookie = "user_phone=+380681234567; path=/";
```

---

## View VIP Cabinet

Once cookie is set, open:
```
http://localhost:3006/vip
```

You should see:
- ✅ 📊 Статистика (Statistics)
- ✅ 📈 Прогрес (Progress)  
- ✅ 📷 Фото (Photos)
- ✅ 🎬 Відео (Videos)
- ✅ 📄 Завантажити сертифікат (Download Certificate)

---

## Delete Test Admin

### Using Setup Script
```bash
node scripts/setup-real-admin.mjs
# At the end, press 'y' when asked to delete test admin
```

### Using Prisma Studio
```bash
npx prisma studio
# Find: GuestContact with phone = +380999999999
# Click delete icon
```

---

## Verify Admin Access

```bash
# Check if admin is in database
curl "http://localhost:3006/api/admin/list-all-users" | grep "admin"

# Check user authentication
curl -b "user_phone=+380681234567" "http://localhost:3006/api/user"

# Expected response:
# {"phone":"+380681234567","name":"Адміністратор","role":"admin"}
```

---

## Database Direct Access

```bash
# Open Prisma Studio
npx prisma studio

# Then in UI:
# 1. Select GuestContact table
# 2. Filter by role = "admin"
# 3. View or edit VIP status and expiration date
```

---

## Build & Deploy

```bash
# Build Next.js app
npm run build

# Check for errors
echo "✅ Build successful" || echo "❌ Build failed"

# Start server
npm run dev:safe

# Test API
curl "http://localhost:3006/api/admin/setup-admin-vip?phone=%2B380681234567"
```

---

## Troubleshooting Commands

```bash
# Check if server is running
curl -I "http://localhost:3006"

# Check env variables
cat .env.local | grep ADMIN

# Check admin accounts
node scripts/check-admins.mjs

# View database
npx prisma studio

# Clear Next.js cache
rm -rf .next/

# Clear Prisma cache
rm -rf node_modules/.prisma/

# Full reinstall
rm -rf node_modules package-lock.json
npm install
```

---

## Phone Number Format

All phone numbers must include country code:
- ✅ Correct: `+380681234567` (14 chars including +)
- ❌ Wrong: `0681234567` (no country code)
- ❌ Wrong: `380681234567` (no + sign)

For URL encoding in curl:
- `+` → `%2B`
- Example: `+380681234567` → `%2B380681234567`

---

## API Examples by Use Case

### Use Case 1: First Time Setup
```bash
# Interactive setup (shows UI)
node scripts/setup-real-admin.mjs
```

### Use Case 2: Quick Activation
```bash
# One API call with phone
curl "http://localhost:3006/api/admin/setup-admin-vip?phone=%2B380681234567"
```

### Use Case 3: Multiple Admins
```bash
# Activate admin 1
curl "http://localhost:3006/api/admin/setup-admin-vip?phone=%2B380681111111"

# Activate admin 2
curl "http://localhost:3006/api/admin/setup-admin-vip?phone=%2B380682222222"

# Check both
node scripts/check-admins.mjs
```

### Use Case 4: Automated Deployment
```bash
# Set env var and call (in CI/CD)
export ADMIN_PHONE_NUMBER="+380681234567"
curl "http://localhost:3006/api/admin/setup-admin-vip"
```

---

## Documentation Files

- **Setup Guide:** `ADMIN_VIP_SETUP_GUIDE.md`
- **Fix Report:** `ADMIN_VIP_FIX_REPORT_2026_04_07.md`
- **Complete Solution:** `REAL_ADMIN_VIP_ACTIVATION_COMPLETE.md`
- **This Quick Reference:** `QUICK_COMMANDS.md`

---

## Summary: 3-Step Setup

```bash
# Step 1: Run interactive setup
node scripts/setup-real-admin.mjs

# Step 2: Set cookie in browser (DevTools)
# user_phone = +380681234567

# Step 3: Visit page
# http://localhost:3006/vip
```

Done! ✅

---

**Version:** 1.0  
**Date:** 2026-04-07  
**Status:** Ready to use
