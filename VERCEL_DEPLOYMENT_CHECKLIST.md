
# 🚀 VERCEL DEPLOYMENT CHECKLIST

## Pre-Deployment (Local)

✅ **Step 1: Build Verification**
```bash
npm run build
```
Expected: "✓ Compiled successfully"

✅ **Step 2: Local Test**
```bash
npm run dev:safe
curl -X POST http://localhost:3006/api/teams/add \
  -H "Content-Type: application/json" \
  -d '{"name":"Test"}'
```
Expected: 201 Created with team data

✅ **Step 3: Git Status**
```bash
git status
git add .
git commit -m "feat: configure Supabase and Vercel deployment"
```

## Deployment (Vercel)

✅ **Step 4: Deploy to Vercel**
```bash
# Option A: Via git push (if CI/CD is configured)
git push origin main

# Option B: Via Vercel CLI
vercel deploy --prod
```

## Post-Deployment (Verify Production)

✅ **Step 5: Verify Production API**
```bash
curl -X POST https://basketball.lviv.ua/api/teams/add \
  -H "Content-Type: application/json" \
  -d '{"name":"Production Test"}'
```
Expected: 201 Created

✅ **Step 6: Check Supabase Dashboard**
- Navigate to https://app.supabase.com
- Check "teams" table
- Verify new record appears

✅ **Step 7: Monitor Vercel Logs**
- Go to https://vercel.com/dashboard
- Select basketball.lviv.ua
- Check Deployments and Logs
- Verify no errors

## Rollback (If Needed)

❌ **If Something Breaks:**
```bash
# Option A: Revert git
git revert HEAD
git push origin main

# Option B: Promote previous deployment
# In Vercel Dashboard → Deployments → Select previous → Promote
```

## Environment Variables Configured

The following variables have been set in Vercel:

**Supabase (Production):**
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY

**Auth:**
- NEXTAUTH_SECRET
- NEXTAUTH_URL (updated to https://basketball.lviv.ua)
- AUTH_SECRET

**Database:**
- DATABASE_URL
- DATABASE_URL_UNPOOLED
- PRISMA_DATABASE_URL

**Payment & Services:**
- NEXT_PUBLIC_MONOBANK_JAR_ID
- TELEGRAM_BOT_TOKEN
- TELEGRAM_ADMIN_CHAT_ID
- TELEGRAM_CHANNEL_ID

**Admin:**
- ADMIN_PHONE_NUMBER
- ADMIN_ACTIVATION_SECRET

## Quick Commands

```bash
# Check Vercel status
vercel status

# View current deployments
vercel deployments list

# View production URL
vercel domains

# Check env vars
vercel env list

# Redeploy from git
git push origin main

# Deploy via CLI
vercel deploy --prod

# View logs
vercel logs

# Open in browser
vercel open
```

## Success Indicators

✅ Vercel build completes without errors
✅ /api/teams/add endpoint responds 200 (GET)
✅ POST to /api/teams/add returns 201 with data
✅ New teams appear in Supabase dashboard
✅ No errors in Vercel runtime logs
✅ https://basketball.lviv.ua loads successfully

## Support

If deployment fails:
1. Check Vercel logs for errors
2. Verify environment variables in Vercel Dashboard
3. Ensure DATABASE_URL is correct (Neon)
4. Check Supabase status
5. Review git history: `git log --oneline`
