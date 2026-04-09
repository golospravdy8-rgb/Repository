# 🧪 Supabase Integration Testing Guide

## Current Status: ⚠️ Configuration Needed

**Diagnostic Results:** 6/8 checks passed (75%)

✅ All files created correctly  
✅ Code structure is valid  
❌ Supabase credentials missing from `.env.local`

---

## Step 1: Add Supabase Credentials to `.env.local`

Open `D:\n8n\basket-lviv\.env.local` and add these lines:

```env
# === Supabase Configuration ===
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### Where to get credentials:

1. Go to https://app.supabase.com
2. Select your project
3. Go to **Settings** → **API**
4. Copy:
   - **Project URL** → paste in `NEXT_PUBLIC_SUPABASE_URL`
   - **Anon Key** (public) → paste in `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Example `.env.local` (DO NOT COPY - GET YOUR OWN):

```env
# Auth
NEXTAUTH_SECRET="ldbl-dev-secret-32-chars-ok-2025!"
NEXTAUTH_URL="http://localhost:3006"

# Supabase (GET FROM YOUR SUPABASE PROJECT)
NEXT_PUBLIC_SUPABASE_URL=https://abc123xyz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ... other existing variables
```

---

## Step 2: Verify Supabase Table Exists

You need a `teams` table in Supabase with this structure:

```sql
CREATE TABLE IF NOT EXISTS teams (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  photo_url VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS teams_name_idx ON teams(name);
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read" ON teams FOR SELECT USING (true);
```

**In Supabase Dashboard:**
1. Go to **SQL Editor**
2. Create new query
3. Paste the SQL above
4. Click "Run"

---

## Step 3: Run Diagnostic Again

```bash
cd basket-lviv
node scripts/diagnose-supabase.js
```

**Expected output:** All 8 checks passed ✅

---

## Step 4: Test API Endpoint

### Method 1: Using curl (Recommended)

```bash
# In terminal, run:
npm run dev:safe

# In another terminal:
curl -X POST http://localhost:3006/api/teams/add \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Team"}'
```

**Expected response (201 Created):**
```json
{
  "success": true,
  "message": "Team added successfully",
  "data": {
    "id": 1,
    "name": "Test Team",
    "description": null,
    "photo_url": null,
    "created_at": "2024-04-09T12:00:00Z"
  }
}
```

**If you get 500 error:**
- Check Supabase URL and Key are correct
- Verify `teams` table exists in Supabase
- Check Supabase RLS policies are set
- See **Troubleshooting** section below

### Method 2: Using Postman/Thunder Client

1. Create **POST** request to `http://localhost:3006/api/teams/add`
2. Set Header: `Content-Type: application/json`
3. Body (raw JSON):
```json
{
  "name": "Basketball Team",
  "description": "Our awesome team",
  "photoUrl": "https://example.com/team.jpg"
}
```
4. Click "Send"
5. Check response

### Method 3: Using the React Component

1. Create a test page: `app/(public)/test/page.tsx`:

```tsx
import AddTeam from '@/components/AddTeam';

export default function TestPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <h1 className="text-3xl font-bold mb-8">Test Supabase Integration</h1>
      <AddTeam />
    </div>
  );
}
```

2. Start dev server: `npm run dev:safe`
3. Go to http://localhost:3006/test
4. Fill the form and submit
5. Check success message

---

## Step 5: Test Import Script

### Create teams.json

```bash
cp teams.example.json teams.json
```

Edit `teams.json` with your team data:

```json
[
  {
    "name": "Батьки",
    "description": "Veteran team for parents",
    "photoUrl": null
  },
  {
    "name": "U-14",
    "description": "Youth team under 14",
    "photoUrl": null
  },
  {
    "name": "U-16",
    "description": "Youth team under 16",
    "photoUrl": null
  }
]
```

### Run import (with dev server running)

```bash
# Terminal 1: Keep dev server running
npm run dev:safe

# Terminal 2: Run import script
node scripts/import-teams.js
```

**Expected output:**
```
🏀 Starting team import...

📄 Found 3 teams in teams.json

✅ Valid teams: 3

✅ Батьки (ID: 1)
✅ U-14 (ID: 2)
✅ U-16 (ID: 3)

📊 Import Summary:
   ✅ Successful: 3
   ❌ Failed: 0
   📈 Total: 3

🎉 All teams imported successfully!
```

---

## Verification Checklist

After completing all steps, verify:

- [ ] `.env.local` has `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `.env.local` has `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] Supabase `teams` table exists
- [ ] Diagnostic script shows 8/8 checks ✅
- [ ] API test with curl returns 201 with team data
- [ ] React component form adds team successfully
- [ ] Supabase Dashboard shows new teams in table
- [ ] Import script successfully added teams from JSON
- [ ] No TypeScript errors in dev server

---

## Testing Flow Summary

1. **Setup** (5 min)
   - Add Supabase credentials to `.env.local`
   - Create `teams` table in Supabase
   - Run diagnostic: `node scripts/diagnose-supabase.js`

2. **API Testing** (5 min)
   - Start dev server: `npm run dev:safe`
   - Test endpoint with curl/Postman
   - Verify team appears in Supabase Dashboard

3. **Component Testing** (5 min)
   - Create test page or use AddTeam component
   - Add team through form
   - Check success message and Supabase data

4. **Import Testing** (3 min)
   - Create `teams.json`
   - Run import script
   - Verify teams appear in database

---

## Troubleshooting

### ❌ "Invalid token" or "401 Unauthorized"

**Problem:** Wrong `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**Solution:**
1. Go to Supabase Dashboard → Settings → API
2. Double-check "Anon Key" (public key, not service key)
3. Copy exact value (include full string)
4. Restart dev server

### ❌ "Relation 'teams' does not exist"

**Problem:** Table was not created

**Solution:**
1. Go to Supabase Dashboard → SQL Editor
2. Run the SQL to create `teams` table (see Step 2)
3. Wait for success message
4. Try API again

### ❌ "Failed to add team" with 500 error

**Problem:** Supabase connectivity or RLS policy issue

**Solutions:**
1. Verify URL format: `https://[project-id].supabase.co`
2. Check RLS policies exist (should allow SELECT and INSERT)
3. Check Supabase status: https://status.supabase.com
4. Look at Supabase Dashboard → Logs for errors

### ❌ "NEXT_PUBLIC_SUPABASE_URL is missing" warning

**Problem:** Environment variables not loaded

**Solution:**
1. Ensure `.env.local` exists in root directory
2. Verify file is NOT in `.gitignore`
3. Restart dev server: `npm run dev:safe`
4. Run diagnostic again

### ❌ Import script: "ECONNREFUSED"

**Problem:** Dev server not running on port 3006

**Solution:**
1. In Terminal 1, start: `npm run dev:safe`
2. Wait for "compiled successfully" message
3. In Terminal 2, run import script
4. Check port with: `lsof -i :3006` (or `netstat -ano | findstr :3006` on Windows)

### ❌ Component form doesn't submit

**Problem:** Client component not rendering or fetch failing

**Solutions:**
1. Check browser console (F12) for errors
2. Check network tab - is fetch reaching API?
3. Verify `.env.local` variables are set
4. Restart dev server

---

## Success Indicators

### ✅ API is working:
- curl returns 201 status
- Response has `"success": true`
- Response contains `data` object with team info

### ✅ Component is working:
- Form displays correctly
- Inputs accept text
- Submit button is clickable
- Success message appears after submit
- Form clears after success

### ✅ Database is working:
- New teams appear in Supabase Dashboard
- `created_at` timestamp is correct
- All fields (`name`, `description`, `photo_url`) stored correctly

### ✅ Import is working:
- Script shows progress with emojis
- Summary shows correct numbers
- All teams appear in database

---

## Testing with Different Scenarios

### Test Case 1: Add team with all fields

```bash
curl -X POST http://localhost:3006/api/teams/add \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Basketball Stars",
    "description": "Elite professional team",
    "photoUrl": "https://example.com/stars.jpg"
  }'
```

**Expected:** 201 with all fields populated

### Test Case 2: Add team with only name (required)

```bash
curl -X POST http://localhost:3006/api/teams/add \
  -H "Content-Type: application/json" \
  -d '{"name": "Minimal Team"}'
```

**Expected:** 201 with `description` and `photo_url` as `null`

### Test Case 3: Validation error (empty name)

```bash
curl -X POST http://localhost:3006/api/teams/add \
  -H "Content-Type: application/json" \
  -d '{"name": ""}'
```

**Expected:** 400 with error details about empty name

### Test Case 4: Long team name

```bash
curl -X POST http://localhost:3006/api/teams/add \
  -H "Content-Type: application/json" \
  -d '{"name": "'$(printf 'A%.0s' {1..101})'"}'
```

**Expected:** 400 validation error (name too long, max 100)

---

## Performance Baseline

After testing, baseline metrics:

- **API response time:** Should be < 500ms (usually 50-200ms)
- **Component form submission:** Should be < 1 second
- **Import script:** Should add ~5 teams/second

---

## Next Steps After Testing

1. ✅ Verify all integration tests pass
2. 📝 Document any issues found
3. 🚀 Deploy to Vercel (see deployment guide)
4. 🔒 Review security settings
5. 📊 Monitor API logs in production

---

## Quick Command Reference

```bash
# Diagnostic
node scripts/diagnose-supabase.js

# Start dev server
npm run dev:safe

# Test API
curl -X POST http://localhost:3006/api/teams/add \
  -H "Content-Type: application/json" \
  -d '{"name":"Test"}'

# Import teams
node scripts/import-teams.js

# Import with custom file
node scripts/import-teams.js /path/to/teams.json

# View logs
tail -f .next/logs  # or check browser console (F12)
```

---

**Status:** Ready to test once Supabase credentials are added to `.env.local`

---
