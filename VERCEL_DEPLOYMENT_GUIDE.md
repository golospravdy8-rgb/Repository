# 🚀 Vercel Deployment Guide for Supabase Integration

## Pre-Deployment Checklist

Before deploying to Vercel, ensure:

- ✅ All tests pass locally (`npm run dev:safe`)
- ✅ No TypeScript errors in `npm run build`
- ✅ Diagnostic tool shows 8/8 checks
- ✅ API endpoint works with curl
- ✅ React component adds teams successfully

---

## Step 1: Verify Local Build

```bash
# Build the project
npm run build

# Expected output: "✓ Compiled successfully"
```

If there are any TypeScript errors, fix them before deploying.

---

## Step 2: Add Environment Variables to Vercel

### In Vercel Dashboard:

1. Go to your project: https://vercel.com/dashboard
2. Select the **basket-lviv** project
3. Go to **Settings** → **Environment Variables**

### Add Public Variables

These are safe to expose in the browser (public keys):

**Name:** `NEXT_PUBLIC_SUPABASE_URL`  
**Value:** `https://your-project-id.supabase.co`  
**Environments:** Production, Preview, Development

**Name:** `NEXT_PUBLIC_SUPABASE_ANON_KEY`  
**Value:** `your-anon-key-here`  
**Environments:** Production, Preview, Development

### Verify Variable Format

- ✅ `NEXT_PUBLIC_SUPABASE_URL` should start with `https://`
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY` should be 200+ characters
- ✅ No extra spaces or line breaks

---

## Step 3: Redeploy Project

### Option A: Using Vercel Dashboard

1. Go to **Deployments**
2. Click **Redeploy** on the latest deployment
3. Or make a git push to trigger automatic deployment

### Option B: Using Vercel CLI

```bash
vercel deploy --prod
```

---

## Step 4: Verify Production Deployment

### Check 1: Health Check Endpoint

```bash
curl https://your-basket-lviv-domain.vercel.app/api/teams/add
```

**Expected Response:**
```json
{
  "message": "Teams API endpoint",
  "method": "POST",
  "endpoint": "/api/teams/add",
  "description": "Add a new team to Supabase"
}
```

### Check 2: Test API with Data

```bash
curl -X POST https://your-basket-lviv-domain.vercel.app/api/teams/add \
  -H "Content-Type: application/json" \
  -d '{"name":"Production Test Team"}'
```

**Expected Response (201):**
```json
{
  "success": true,
  "data": {
    "id": 999,
    "name": "Production Test Team",
    "created_at": "2024-04-09T..."
  }
}
```

### Check 3: Component Test

1. Navigate to your app
2. Add the `AddTeam` component to a page
3. Fill the form and submit
4. Verify:
   - ✅ Success message appears
   - ✅ Form clears after submission
   - ✅ Data appears in Supabase Dashboard

### Check 4: Monitor Logs

In Vercel Dashboard:

1. Go to **Deployments**
2. Select the latest deployment
3. Click **Logs** (Runtime Logs)
4. Look for any errors related to Supabase

---

## Troubleshooting Production Issues

### Issue: "401 Unauthorized" on Production

**Problem:** API key is wrong or environment variables not set

**Solution:**
1. Verify in Vercel Dashboard → Settings → Environment Variables
2. Confirm `NEXT_PUBLIC_SUPABASE_ANON_KEY` is exact copy from Supabase
3. Redeploy after fixing

### Issue: API endpoint returns 500 error

**Problem:** Supabase connectivity issue

**Solutions:**
1. Check Supabase Dashboard → Logs for errors
2. Verify `NEXT_PUBLIC_SUPABASE_URL` is correct format
3. Check Supabase project is active (not paused)
4. Verify `teams` table exists in Supabase

### Issue: Component form doesn't submit on production

**Problem:** CORS or environment variable issue

**Solutions:**
1. Check browser console (F12) → Network tab
2. Look for CORS errors
3. Verify env variables loaded: `console.log(process.env.NEXT_PUBLIC_SUPABASE_URL)`
4. Hard refresh (Ctrl+Shift+R) to clear cache

### Issue: Data appears in dev but not in production

**Problem:** Different Supabase projects or env variables

**Solutions:**
1. Confirm using same Supabase project in dev and prod
2. Compare `.env.local` values with Vercel env vars
3. Check Supabase project URL is identical

---

## Production Monitoring

### Set Up Error Tracking

In Vercel Dashboard → Logs:

1. Monitor API endpoint responses
2. Check for 400/500 errors
3. Look for slow queries (> 1000ms)

### Supabase Monitoring

In Supabase Dashboard:

1. Go to **Logs** → **API Audit** to see all API calls
2. Check for failed insertions
3. Monitor database query performance

### Performance Baseline

After deployment, measure:

- **API Response Time:** Should be < 500ms
- **Component Load Time:** Should be < 100ms
- **Error Rate:** Should be < 0.1%

---

## Scaling Considerations

### When to Scale

If you experience:
- High latency (> 1000ms)
- Rate limiting errors
- Database connection issues

### Solutions

1. **Increase Supabase plan** (if needed)
2. **Add caching** for frequently accessed data
3. **Optimize database queries** (add more indexes)
4. **Use database connection pooling** (built-in with Supabase)

---

## Security in Production

### Recommended Settings

1. **Enable RLS on all tables** ✅ (already done)
2. **Set up CORS policy** (Vercel handles this)
3. **Monitor API usage** in Supabase
4. **Set rate limits** if needed
5. **Use HTTPS only** ✅ (Vercel default)

### Security Checklist

- ✅ No hardcoded secrets in code
- ✅ Environment variables in Vercel only
- ✅ NEXT_PUBLIC_* variables are public keys (safe)
- ✅ Private keys never stored in repo
- ✅ RLS policies restrict data access

---

## Rollback Procedure

If something breaks in production:

### Option 1: Revert to Previous Deployment

1. Go to **Deployments** in Vercel Dashboard
2. Find the last working deployment
3. Click the three dots → **Promote to Production**

### Option 2: Git Rollback

```bash
git revert HEAD
git push origin main
```

---

## Post-Deployment Checklist

After deploying to production:

- [ ] Health check endpoint responds (curl /api/teams/add)
- [ ] Can add team via API (curl POST with test data)
- [ ] Component form works and adds team
- [ ] Data appears in Supabase Dashboard
- [ ] No errors in Vercel Logs
- [ ] No errors in browser console
- [ ] Response time is acceptable (< 500ms)
- [ ] Monitor for 24 hours for issues

---

## Production Commands

```bash
# View production logs
vercel logs --prod

# Check deployment status
vercel status

# List recent deployments
vercel deployments list

# Redeploy last version
vercel deploy --prod

# View environment variables
vercel env list
```

---

## Monitoring & Alerting

### Recommended Setup

1. **Vercel Alerts**
   - Enable deployment notifications
   - Monitor error rates
   - Set up performance alerts

2. **Supabase Alerts**
   - Monitor database connections
   - Watch for failed API requests
   - Track query performance

3. **Custom Monitoring**
   - Log API response times
   - Track error types
   - Monitor team creation rate

---

## Support & Documentation

### Vercel Support
- Dashboard: https://vercel.com/dashboard
- Docs: https://vercel.com/docs

### Supabase Support
- Dashboard: https://app.supabase.com
- Docs: https://supabase.com/docs

### Local Testing Before Production

Always test locally first:

```bash
npm run dev:safe
# Test all features before deploying
node scripts/test-supabase-integration.js
```

---

## Quick Deployment Checklist

```bash
# 1. Verify local build
npm run build

# 2. Run all tests
node scripts/diagnose-supabase.js
node scripts/test-supabase-integration.js

# 3. Test API
curl -X POST http://localhost:3006/api/teams/add ...

# 4. Add env vars in Vercel Dashboard

# 5. Redeploy
vercel deploy --prod

# 6. Test production
curl https://your-domain.vercel.app/api/teams/add

# 7. Monitor logs
vercel logs --prod
```

---

## Summary

✅ **Environment Setup:** Done in Vercel Dashboard  
✅ **Codebase:** Production-ready  
✅ **Testing:** Comprehensive  
✅ **Documentation:** Complete  
✅ **Rollback:** Available if needed

**Status:** Ready to deploy to Vercel

---

**Last Updated:** 2026-04-09
