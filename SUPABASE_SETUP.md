# 🚀 Supabase Integration Guide for basket-lviv

Complete step-by-step guide to set up Supabase for managing teams.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Supabase Setup](#supabase-setup)
3. [Local Configuration](#local-configuration)
4. [API Endpoint](#api-endpoint)
5. [React Component](#react-component)
6. [Import Teams from JSON](#import-teams-from-json)
7. [Testing](#testing)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

- Node.js 18+ installed
- Supabase account (free at https://supabase.com)
- basket-lviv project running

**Already installed in this project:**
- ✅ `@supabase/supabase-js` (v2.103.0)
- ✅ TypeScript support
- ✅ Next.js 14.2+ (App Router)

---

## Supabase Setup

### Step 1: Create a Supabase Project

1. Go to https://app.supabase.com/projects
2. Click "New Project"
3. Fill in details:
   - **Name:** `basket-lviv` (or your choice)
   - **Database Password:** Generate strong password
   - **Region:** Choose closest to your users (e.g., EU-Frankfurt for Europe)
4. Click "Create new project" and wait for initialization (~1-2 min)

### Step 2: Create the `teams` Table

In Supabase Dashboard:

1. Go to **SQL Editor** (left sidebar)
2. Click "New Query"
3. Paste the following SQL:

```sql
-- Create teams table
CREATE TABLE IF NOT EXISTS teams (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  photo_url VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS teams_name_idx ON teams(name);

-- Enable Row Level Security (RLS)
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read teams (public)
CREATE POLICY "Allow public read" ON teams
  FOR SELECT USING (true);

-- Allow authenticated users to insert teams
CREATE POLICY "Allow authenticated insert" ON teams
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
```

4. Click "Run" button
5. Wait for confirmation: ✅ Success

### Step 3: Get API Credentials

1. Go to **Settings** → **API** (in Supabase Dashboard)
2. Copy the following from "Project API keys" section:
   - **Project URL** (e.g., `https://your-project-id.supabase.co`)
   - **`anon` public key** (starts with `eyJh...`)

**Keep these safe!** You'll need them in the next step.

---

## Local Configuration

### Step 1: Update `.env.local`

Open `.env.local` in the basket-lviv root directory and add:

```env
# === Supabase Configuration ===
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

**Example:**

```env
NEXT_PUBLIC_SUPABASE_URL=https://abc123xyz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Step 2: Verify Configuration

Run this command in terminal:

```bash
echo "NEXT_PUBLIC_SUPABASE_URL: $NEXT_PUBLIC_SUPABASE_URL"
echo "NEXT_PUBLIC_SUPABASE_ANON_KEY set: $([ -z "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ] && echo 'NO' || echo 'YES')"
```

You should see:
- ✅ Your Supabase URL
- ✅ Key is set to "YES"

---

## API Endpoint

### Endpoint Details

**Path:** `/api/teams/add`  
**Method:** `POST`  
**Authentication:** None required (public)

### Request Body

```json
{
  "name": "Team Name",
  "description": "Optional team description",
  "photoUrl": "https://example.com/team-photo.jpg"
}
```

**Fields:**
- `name` *(required)*: Team name (1-100 characters)
- `description` *(optional)*: Team description
- `photoUrl` *(optional)*: URL to team photo

### Success Response (201 Created)

```json
{
  "success": true,
  "message": "Team added successfully",
  "data": {
    "id": 1,
    "name": "Team Name",
    "description": "Optional description",
    "photo_url": "https://example.com/team-photo.jpg",
    "created_at": "2024-04-09T10:30:00Z"
  }
}
```

### Error Response (400 Bad Request)

```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "code": "too_small",
      "message": "Team name is required"
    }
  ]
}
```

---

## React Component

### Location

```
components/AddTeam.tsx
```

### Usage in a Page

```tsx
import AddTeam from '@/components/AddTeam';

export default function TeamPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Manage Teams</h1>
      <AddTeam />
    </div>
  );
}
```

### Features

- ✅ Form validation (required fields, URL format)
- ✅ Loading state with disabled button
- ✅ Success/error messages
- ✅ Dark mode support
- ✅ Accessible form inputs
- ✅ Auto-clear on success

---

## Import Teams from JSON

### Prepare Teams File

1. Create `teams.json` in the root directory:

```bash
cp teams.example.json teams.json
```

2. Edit `teams.json` with your team data:

```json
[
  {
    "name": "Батьки",
    "description": "Veteran team for parents",
    "photoUrl": "https://example.com/batky.jpg"
  },
  {
    "name": "U-14",
    "description": "Youth team under 14 years",
    "photoUrl": "https://example.com/u14.jpg"
  }
]
```

### Run Import Script

```bash
# Make sure dev server is running on port 3006
npm run dev:safe

# In another terminal, run the import script
node scripts/import-teams.js

# Or specify a custom file path
node scripts/import-teams.js path/to/teams.json
```

### Expected Output

```
🏀 Starting team import...

📄 Found 5 teams in teams.json

✅ Valid teams: 5

✅ Батьки (ID: 1)
✅ U-14 (ID: 2)
✅ U-16 (ID: 3)
✅ U-18 (ID: 4)
✅ Студенти (ID: 5)

📊 Import Summary:
   ✅ Successful: 5
   ❌ Failed: 0
   📈 Total: 5

🎉 All teams imported successfully!
```

---

## Testing

### Method 1: Using the Component

1. Start dev server:

```bash
npm run dev:safe
```

2. Navigate to any page with the `AddTeam` component
3. Fill in the form and click "Add Team"
4. Verify success message appears

### Method 2: Using curl (Terminal)

```bash
curl -X POST http://localhost:3006/api/teams/add \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Team",
    "description": "Testing the API",
    "photoUrl": "https://example.com/test.jpg"
  }'
```

**Expected response:**

```json
{
  "success": true,
  "message": "Team added successfully",
  "data": {
    "id": 1,
    "name": "Test Team",
    "description": "Testing the API",
    "photo_url": "https://example.com/test.jpg",
    "created_at": "2024-04-09T10:30:00Z"
  }
}
```

### Method 3: Using the Supabase Dashboard

1. Go to Supabase Dashboard
2. Navigate to **Table Editor**
3. Select **teams** table
4. Click **Insert Row** and verify data was added
5. Check the `created_at` timestamp

---

## Troubleshooting

### ❌ "Missing Supabase credentials" warning

**Problem:** Console shows warning about missing env variables

**Solution:**
1. Verify `.env.local` exists and is in `.gitignore`
2. Check `NEXT_PUBLIC_SUPABASE_URL` is set correctly
3. Verify `NEXT_PUBLIC_SUPABASE_ANON_KEY` is not empty
4. Restart dev server: `npm run dev:safe`

### ❌ "Failed to add team" error

**Problem:** API returns 500 error with "Failed to add team"

**Possible causes:**
1. Supabase table doesn't exist → Run SQL query again
2. RLS policies are blocking inserts → Check policies in Supabase Dashboard
3. API key is wrong → Verify in `.env.local`
4. Network connectivity → Check if you can reach Supabase

**Solution:**
```bash
# Check Supabase connection
curl https://your-project-id.supabase.co/rest/v1/ \
  -H "apikey: your-key"
```

### ❌ "Validation failed" error

**Problem:** Request returns 400 with validation errors

**Solution:**
- Ensure `name` field is not empty
- `name` must be string (not number)
- `name` must be less than 100 characters
- `photoUrl` must be valid URL format (if provided)

### ❌ Import script not finding teams.json

**Problem:** `ENOENT: no such file or directory`

**Solution:**
1. Create `teams.json` in project root:
   ```bash
   cp teams.example.json teams.json
   ```
2. Or specify full path:
   ```bash
   node scripts/import-teams.js /full/path/to/teams.json
   ```

### ❌ Import script says "API URL not found"

**Problem:** `ECONNREFUSED or 404 errors`

**Solution:**
1. Ensure dev server is running:
   ```bash
   npm run dev:safe
   ```
2. Check port is 3006 (or update API_URL in script)
3. Wait for Next.js build to complete

---

## Production Deployment

### On Vercel

1. Go to **Project Settings** → **Environment Variables**
2. Add variables:
   - `NEXT_PUBLIC_SUPABASE_URL` (Public)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Public)
3. Redeploy or trigger new deployment
4. Verify in **Deployments** tab

### On Other Platforms

1. Set env variables in your hosting control panel
2. `NEXT_PUBLIC_*` variables are visible to browser (safe for public keys)
3. Ensure Supabase is accessible from your server's IP
4. Test API endpoint after deployment

---

## File Structure

```
basket-lviv/
├── lib/
│   └── supabase.js                    # Supabase client
├── app/
│   └── api/
│       └── teams/
│           └── add/
│               └── route.ts           # API endpoint
├── components/
│   └── AddTeam.tsx                    # React component
├── scripts/
│   └── import-teams.js                # Import script
├── .env.local                         # Local secrets (IGNORE THIS)
├── .env.local.example                 # Template (commit this)
├── teams.json                         # Team data (your file)
├── teams.example.json                 # Template (commit this)
└── SUPABASE_SETUP.md                  # This file
```

---

## Quick Reference

| Task | Command |
|------|---------|
| Start dev server | `npm run dev:safe` |
| Run import script | `node scripts/import-teams.js` |
| View database | `npm run db:studio` |
| Restart dev | `npm run dev:safe` (stop & restart) |
| Check env vars | `cat .env.local \| grep SUPABASE` |

---

## Next Steps

After setting up Supabase:

1. ✅ Create Supabase project and table
2. ✅ Add credentials to `.env.local`
3. ✅ Test with `AddTeam` component
4. ✅ Import teams from JSON (optional)
5. 🔜 **Create additional features:**
   - Update team endpoint
   - Delete team endpoint
   - Get all teams endpoint
   - Filter/search teams
   - Team statistics

---

## Support

If you encounter issues:

1. **Check Supabase Status:** https://status.supabase.com
2. **Read Supabase Docs:** https://supabase.com/docs
3. **Check API Logs:** Supabase Dashboard → Logs
4. **Browser Console:** Check for client-side errors (F12)
5. **Server Logs:** Check terminal output from `npm run dev`

---

**Last Updated:** 2024-04-09  
**Version:** 1.0.0  
**Author:** Claude Code
