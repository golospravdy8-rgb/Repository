# ⚡ Supabase Quick Start (5 minutes)

## 1️⃣ Create Supabase Project (2 min)

```bash
# Go to https://supabase.com
# Click "New Project"
# Fill: Name, Password, Region
# Wait for setup...
```

## 2️⃣ Create teams Table (1 min)

Go to **SQL Editor** in Supabase Dashboard, paste this:

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

Click "Run" ✅

## 3️⃣ Get Credentials (30 sec)

Go to **Settings** → **API**, copy:
- **Project URL** (e.g., `https://abc123.supabase.co`)
- **Anon Key** (long string starting with `eyJ...`)

## 4️⃣ Update `.env.local` (30 sec)

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

## 5️⃣ Test It (1 min)

```bash
# Terminal 1: Start dev server
npm run dev:safe

# Terminal 2: Test API
curl -X POST http://localhost:3006/api/teams/add \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Team"}'

# Expected: {"success":true, "data":{...}}
```

## ✅ Done!

Use the component:
```tsx
import AddTeam from '@/components/AddTeam';

export default function Page() {
  return <AddTeam />;
}
```

Or call API directly:
```js
fetch('/api/teams/add', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'My Team' })
})
```

## 📚 Full Guide

See `SUPABASE_SETUP.md` for detailed instructions.

## 🆘 Problem?

- ❌ "Missing Supabase credentials" → Check `.env.local`
- ❌ "Failed to add team" → Verify table exists in Supabase
- ❌ Connection refused → Ensure dev server running on 3006
