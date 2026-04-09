# 🚀 PRODUCTION DEPLOYMENT GUIDE

## Project Information

| Item | Value |
|------|-------|
| **Project Name** | basket-lviv |
| **Local Port** | 3006 |
| **Production Domain** | https://basketball.lviv.ua |
| **Supabase URL** | https://dzsvgyetmdgykmujmxuu.supabase.co |
| **Framework** | Next.js 14.2 |
| **Database** | PostgreSQL (Neon) + Supabase |
| **Auth** | NextAuth.js v5 |

---

## Pre-Deployment Checklist

### ✅ Local Testing (5 minutes)

1. **Verify Build**
   ```bash
   npm run build
   ```
   Expected: ✓ Compiled successfully

2. **Start Dev Server**
   ```bash
   npm run dev:safe
   ```
   Expected: Running on http://localhost:3006

3. **Test API Endpoint**
   ```bash
   # In another terminal:
   curl -X POST http://localhost:3006/api/teams/add \
     -H "Content-Type: application/json" \
     -d '{"name":"Deployment Test Team"}'
   ```
   Expected: 201 Created with team data

4. **Verify Supabase Connection**
   ```bash
   node test-connection.js
   ```
   Expected: CONFIGURATION SUCCESSFUL

5. **Check Component**
   - Navigate to a page with `<AddTeam />` component
   - Verify form loads without errors
   - Test adding a team through the form

---

## Deployment Steps

### Step 1: Prepare Git (2 minutes)

```bash
# Check status
git status

# Stage all changes
git add .

# Create meaningful commit
git commit -m "feat: deploy Supabase integration and configure production environment

- Added Supabase credentials to production
- Fixed API /api/teams/add to use production schema
- Updated NEXTAUTH_URL to production domain
- Added all environment variables to Vercel
- Verified all endpoints and components working"
```

### Step 2: Verify Git History (1 minute)

```bash
# Check last commit
git log --oneline -5

# Verify branch is up to date
git status
```

Expected: "nothing to commit, working tree clean"

### Step 3: Build for Production (3 minutes)

```bash
# Clean build
rm -rf .next
npm run build

# Expected output:
# ✓ Compiled successfully
# ✓ Database has been seeded
```

If build fails, check:
- TypeScript errors: `npm run lint`
- Prisma schema: `npx prisma validate`
- Environment variables: `cat .env.local`

### Step 4: Deploy to Vercel

#### Option A: Via Git Push (Recommended if CI/CD configured)

```bash
# Push to main branch
git push origin main

# Vercel will automatically detect and deploy
# Monitor at: https://vercel.com/dashboard
```

#### Option B: Via Vercel CLI

```bash
# Deploy to production
vercel deploy --prod

# You'll be prompted to confirm production deployment
```

#### Option C: Via Vercel Dashboard

1. Go to https://vercel.com/dashboard
2. Select "basketball.lviv.ua" project
3. Go to "Deployments" tab
4. Click "Redeploy" on latest deployment

### Step 5: Monitor Deployment (5 minutes)

```bash
# Watch deployment logs in real-time
vercel logs --follow

# Or check status
vercel status

# Or view specific deployment
vercel deployments list
```

Watch for:
- ✅ Build completes successfully
- ✅ All environment variables loaded
- ✅ Prisma migrations applied
- ✅ No runtime errors

---

## Post-Deployment Verification (10 minutes)

### 1. Check Production URL

```bash
# Test homepage loads
curl -I https://basketball.lviv.ua

# Expected: 200 OK
```

### 2. Test API Endpoint

```bash
# Test teams API in production
curl -X POST https://basketball.lviv.ua/api/teams/add \
  -H "Content-Type: application/json" \
  -d '{
    "name":"Production Verification Team",
    "photoUrl":"https://example.com/test.jpg"
  }'

# Expected: 201 Created
# Response: { "success": true, "data": { "id": X, "name": "...", ... } }
```

### 3. Verify Supabase Data

1. Go to https://app.supabase.com
2. Select project: dzsvgyetmdgykmujmxuu
3. Navigate to "teams" table
4. Verify new team record appears
5. Confirm all fields populated correctly

### 4. Check Vercel Logs

```bash
vercel logs --follow
```

Look for:
- ✅ No error messages
- ✅ API requests completing successfully
- ✅ No "undefined environment variable" warnings
- ✅ Response times < 500ms

### 5. Test Authentication (if using)

```bash
# Try accessing protected route
curl -I https://basketball.lviv.ua/admin/

# Should redirect to login page (302 or 307)
```

### 6. Check Environment Variables in Vercel

1. Go to https://vercel.com/dashboard
2. Select basketball.lviv.ua
3. Go to Settings → Environment Variables
4. Verify all variables are set:
   - ✅ NEXT_PUBLIC_SUPABASE_URL
   - ✅ NEXT_PUBLIC_SUPABASE_ANON_KEY
   - ✅ NEXTAUTH_URL = https://basketball.lviv.ua
   - ✅ DATABASE_URL
   - ✅ All other required variables

---

## Rollback Procedure (If Needed)

### Quick Rollback (Less than 1 minute)

**Via Vercel Dashboard:**

1. Go to https://vercel.com/dashboard
2. Select basketball.lviv.ua
3. Go to Deployments
4. Find previous successful deployment
5. Click "..." menu
6. Select "Promote to Production"

**Via CLI:**

```bash
# List recent deployments
vercel deployments list

# Get deployment URL of previous working version
# Then promote it
vercel promote <deployment-url>
```

### Full Rollback (If Needed)

```bash
# Revert last commit in git
git revert HEAD

# Push to main
git push origin main

# Vercel will automatically redeploy with previous code
```

### Manual Rollback via Git

```bash
# Check git log
git log --oneline -10

# Revert to specific commit
git revert <commit-hash>

# Or reset (only if commit not pushed yet)
git reset --soft HEAD~1

# Push changes
git push origin main
```

---

## Environment Variables Reference

### Supabase (Production)

```
NEXT_PUBLIC_SUPABASE_URL=https://dzsvgyetmdgykmujmxuu.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_086iusJsMoX5QOr6FxqKFA_WBM1LMdB
```

### Authentication

```
NEXTAUTH_URL=https://basketball.lviv.ua
NEXTAUTH_SECRET=(from .env.local)
AUTH_SECRET=(from .env.local)
JWT_SECRET=(from .env.local)
```

### Database

```
DATABASE_URL=(Neon connection string)
DATABASE_URL_UNPOOLED=(Neon unpooled)
PRISMA_DATABASE_URL=(Neon Prisma)
POSTGRES_*(various Neon vars)
```

### Services

```
NEXT_PUBLIC_MONOBANK_JAR_ID=6Wm6ypKDNBz7vZ8E3kPq4m
TELEGRAM_BOT_TOKEN=(your token)
TELEGRAM_ADMIN_CHAT_ID=(your chat id)
TELEGRAM_CHANNEL_ID=(your channel id)
```

---

## Troubleshooting

### Build Fails with TypeScript Error

```bash
# Check TypeScript
npx tsc --noEmit

# Check for errors
npm run lint

# Fix issues and rebuild
npm run build
```

### Runtime Error: "Cannot find module"

```bash
# Reinstall dependencies
rm -rf node_modules
npm install

# Rebuild
npm run build
```

### Environment Variable Not Found

```bash
# Verify in Vercel Dashboard:
# 1. Settings → Environment Variables
# 2. Check variable is marked as "Public" if NEXT_PUBLIC_*
# 3. Redeploy after adding variables

# Or via CLI:
vercel env list
```

### API Returns 500 Error

```bash
# Check Vercel logs
vercel logs --follow

# Common causes:
# - Database connection failed: Check DATABASE_URL
# - Supabase auth failed: Check NEXT_PUBLIC_SUPABASE_ANON_KEY
# - Missing environment variable: Check Vercel settings
```

### Component Not Loading

```bash
# Check browser console (F12)
# Look for network errors or "CORS" issues

# Check Vercel logs
vercel logs

# Common fixes:
# - Clear browser cache
# - Check API endpoint path
# - Verify component imports
```

---

## Post-Launch Monitoring

### Daily Checks (First Week)

- [ ] Monitor Vercel error logs
- [ ] Check Supabase database for new records
- [ ] Test API endpoints manually
- [ ] Verify email notifications working (if configured)
- [ ] Check authentication flow

### Setup Monitoring (Long-term)

1. **Enable Vercel Analytics**
   - https://vercel.com/dashboard → Settings → Analytics

2. **Monitor Supabase**
   - https://app.supabase.com → Logs
   - https://app.supabase.com → Monitoring

3. **Set Up Alerts**
   - Vercel: Enable deployment notifications
   - Email alerts for failed deployments

4. **Regular Backups**
   - Supabase: Enable automatic backups
   - Database: Regular exports

---

## Success Indicators

### ✅ Deployment Successful When:

- [ ] Vercel build completes (status: "Ready")
- [ ] No errors in Vercel logs
- [ ] https://basketball.lviv.ua loads without errors
- [ ] /api/teams/add responds to GET (200)
- [ ] /api/teams/add responds to POST (201 with data)
- [ ] New teams appear in Supabase dashboard
- [ ] All environment variables loaded correctly
- [ ] Authentication pages load (if applicable)
- [ ] API response times < 500ms
- [ ] No database connection errors

---

## Quick Reference Commands

```bash
# Pre-deployment
npm run build                           # Build for production
npm run dev:safe                        # Test locally
node test-connection.js                 # Verify Supabase
curl -X POST http://localhost:3006/api/teams/add ... # Test API

# Git operations
git status                              # Check status
git add .                               # Stage changes
git commit -m "message"                 # Create commit
git push origin main                    # Push to main

# Vercel operations
vercel status                           # Check deployment status
vercel logs --follow                    # Watch logs in real-time
vercel deployments list                 # List all deployments
vercel promote <url>                    # Promote previous deployment
vercel env list                         # List environment variables
vercel open                             # Open project in browser

# Production testing
curl -X POST https://basketball.lviv.ua/api/teams/add ...  # Test production API
vercel logs                             # View production logs
```

---

## Deployment Timeline

| Step | Time | What Happens |
|------|------|-------------|
| Pre-deployment checks | 5 min | Verify build, test locally |
| Git operations | 2 min | Commit and push |
| Vercel deployment | 3-5 min | Build and deploy in cloud |
| Post-deployment verification | 10 min | Test production endpoints |
| **Total** | **20-22 min** | Full deployment cycle |

---

## Support & Escalation

If something breaks:

1. **Check Vercel Logs First**
   ```bash
   vercel logs --follow
   ```

2. **Verify Environment Variables**
   - Vercel Dashboard → Settings → Environment Variables

3. **Check Supabase Status**
   - https://status.supabase.com

4. **Review Git History**
   ```bash
   git log --oneline -10
   ```

5. **Rollback if Necessary**
   - See "Rollback Procedure" section above

---

## Final Checklist Before Pushing

- [ ] All local tests pass
- [ ] npm run build completes without errors
- [ ] No TypeScript errors
- [ ] git status shows "clean"
- [ ] API endpoint tested locally
- [ ] Supabase connection verified
- [ ] Environment variables in .env.local
- [ ] Vercel CLI installed and authenticated
- [ ] Vercel project linked (vercel link)
- [ ] No sensitive data in git history

---

**Status: Ready for Production Deployment ✅**

Once you confirm all checks pass, run:
```bash
git push origin main
```

And monitor at: https://vercel.com/dashboard

---

**Generated:** 2026-04-09  
**Project:** basketball.lviv.ua  
**Status:** Production-ready
