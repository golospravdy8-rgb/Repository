# Admin VIP Setup - Fix Report (2026-04-07)

## Problem Statement

VIP preview access was activated for a **fake test account** (+380999999999, ID 117) instead of a **real admin account**. The `/api/admin/setup-admin-vip` endpoint was hardcoded to create or use this test account, making it impossible to activate VIP for the actual project administrator.

## Root Cause

In `/api/admin/setup-admin-vip/route.ts`:
```typescript
// HARDCODED - not flexible
let admin = await prisma.guestContact.findUnique({
  where: { phone: "+380999999999" },  // ← Test account, not real admin
});
```

## Solution Implemented

### 1. Updated Endpoint to Accept Configuration

The `/api/admin/setup-admin-vip` endpoint now supports:

**GET Request:**
- Query parameter: `?phone=+380XXXXXXXXX`
- Environment variable: `ADMIN_PHONE_NUMBER` (fallback)

**POST Request:**
- Body field: `{ "phone": "+380XXXXXXXXX" }`
- Supports optional: `firstName`, `lastName`, `displayName`

**Error Handling:**
- Returns 400 if no phone number is configured
- Provides clear instructions for fixing

### 2. Environment Configuration

Added `ADMIN_PHONE_NUMBER` to `.env.local`:
```bash
ADMIN_PHONE_NUMBER=""  # Set this to the real admin phone
```

### 3. Interactive Setup Script

Created `/scripts/setup-real-admin.mjs`:
```bash
node scripts/setup-real-admin.mjs
```

Features:
- ✅ Shows current admin accounts
- ✅ Shows parent users (can be promoted to admin)
- ✅ Prompts for real admin phone number
- ✅ Creates or upgrades account to admin
- ✅ Activates VIP for 1 year
- ✅ Optionally deletes test admin account

### 4. Documentation

Created comprehensive guide: `ADMIN_VIP_SETUP_GUIDE.md`

## Current Database State

**Admin Accounts:**
```
ID: 117
Phone: +380999999999
Name: Admin Test
Role: admin
VIP Status: true
VIP Expires: 2027-04-07 (1 year from now)
```

**Status:** ⚠️ Only test account exists. Real admin not yet configured.

## How to Activate Real Admin VIP

### Quick Setup (Interactive)

```bash
cd basket-lviv
node scripts/setup-real-admin.mjs
```

The script will:
1. Show current admin accounts
2. Show all parent users
3. Ask for real admin phone number
4. Create/promote the account
5. Activate VIP for 1 year
6. Ask if you want to delete the test admin

### Manual Setup

**Step 1:** Set environment variable in `.env.local`
```bash
ADMIN_PHONE_NUMBER="+380681234567"  # Your real admin phone
```

**Step 2:** Call the API
```bash
curl "http://localhost:3006/api/admin/setup-admin-vip"
```

**Step 3:** Set cookie in browser
- F12 → Application → Cookies
- Add: `user_phone = +380681234567`

**Step 4:** View VIP cabinet
- Navigate to: `http://localhost:3006/vip`
- Should see all 4 blocks unblocked

## Files Changed

1. **`/api/admin/setup-admin-vip/route.ts`**
   - ✅ Refactored to accept phone parameter
   - ✅ Added GET and POST methods
   - ✅ Added proper error handling
   - ✅ Improved documentation

2. **`.env.local`**
   - ✅ Added `ADMIN_PHONE_NUMBER` configuration

3. **New Files:**
   - ✅ `/scripts/setup-real-admin.mjs` - Interactive setup script
   - ✅ `/ADMIN_VIP_SETUP_GUIDE.md` - Complete documentation
   - ✅ `ADMIN_VIP_FIX_REPORT_2026_04_07.md` - This report

## Testing Checklist

- [ ] Run setup script: `node scripts/setup-real-admin.mjs`
- [ ] Verify in DB: `node scripts/check-admins.mjs`
- [ ] Set cookie: `user_phone = <real_admin_phone>`
- [ ] Open `/vip` page
- [ ] Verify all 4 blocks visible
- [ ] Check "Завантажити сертифікат" button
- [ ] Delete test admin account (optional)

## API Endpoint Usage Examples

### Example 1: Using Query Parameter
```bash
curl "http://localhost:3006/api/admin/setup-admin-vip?phone=%2B380681234567"
```

### Example 2: Using Environment Variable
```bash
# Set in .env.local
ADMIN_PHONE_NUMBER="+380681234567"

# Call API
curl "http://localhost:3006/api/admin/setup-admin-vip"
```

### Example 3: Using POST Request
```bash
curl -X POST "http://localhost:3006/api/admin/setup-admin-vip" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+380681234567",
    "firstName": "Василь",
    "lastName": "Петренко",
    "displayName": "Гавриїл Петренко"
  }'
```

## Response Example

**Success (200 OK):**
```json
{
  "success": true,
  "message": "✅ Admin VIP activated successfully",
  "admin": {
    "id": 123,
    "phone": "+380681234567",
    "role": "admin",
    "name": "Василь Петренко",
    "vipStatus": true,
    "vipExpiresAt": "2027-04-07T12:45:00.000Z"
  },
  "instructions": {
    "step1": "Add to cookie: user_phone = +380681234567",
    "step2": "Go to: http://localhost:3006/vip",
    "step3": "You should see all 4 VIP blocks: Статистика, Прогрес, Фото, Відео",
    "step4": "Also see: Завантажити сертифікат button"
  }
}
```

**Error (400 Bad Request):**
```json
{
  "error": "ADMIN_PHONE_NUMBER not configured",
  "message": "Set ADMIN_PHONE_NUMBER env variable or pass ?phone=+380... parameter",
  "example": "GET /api/admin/setup-admin-vip?phone=%2B380999999999"
}
```

## Next Steps

1. **Identify real admin phone number** - Ask project owner
2. **Run setup script** - `node scripts/setup-real-admin.mjs`
3. **Verify in browser** - Set cookie and view `/vip`
4. **Delete test account** - Use setup script or Prisma Studio
5. **Document admin phone** - Add to project notes

## VIP System Verification

The VIP system checks:
```typescript
// /app/(public)/vip/page.tsx
const isVip = user?.role === "vip" || user?.role === "admin";

if (isVip) {
  // Show VIP cabinet with all 4 blocks
} else {
  // Show Non-VIP landing page with payment form
}
```

**Admin always has VIP access** - No payment required.

## Database Cleanup

To remove test admin after setting up real one:

**Option 1: Interactive Script**
```bash
node scripts/setup-real-admin.mjs
# At the end, press 'y' when asked to delete test admin
```

**Option 2: Prisma Studio**
```bash
npx prisma studio
# Find GuestContact: phone = +380999999999
# Click delete button
```

**Option 3: SQL**
```sql
DELETE FROM "GuestContact" WHERE phone = '+380999999999';
```

## Summary

✅ **Problem fixed:** Endpoint now accepts configurable phone numbers  
✅ **Script created:** Easy interactive setup  
✅ **Documentation done:** Complete guide provided  
✅ **Error handling:** Clear error messages  
✅ **Backward compatible:** Old endpoint still works for testing  

⏳ **Pending:** Identify and activate real admin phone number

---

**Report Date:** 2026-04-07  
**Report Version:** 1.0  
**Author:** Claude Code Assistant
