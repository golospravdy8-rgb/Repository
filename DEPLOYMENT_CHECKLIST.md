# 🚀 Deployment Checklist — Production Release

**Date:** 2026-04-18  
**Target:** basketball.lviv.ua (Vercel)  
**Status:** ✅ **PUSHED TO GITHUB**

---

## ✅ Pre-Deployment

- [x] All code changes committed locally
- [x] Build passes without errors: `npm run build` ✅
- [x] No uncommitted changes: `git status` clean ✅
- [x] All commits in history:
  - [x] `212738b` — Quick reference guide
  - [x] `f83cb5f` — Compact dashboard documentation
  - [x] `2e4acd9` — Compact UI redesign (main)
  - [x] `4ba37d9` — Phase 2 protocol display

---

## ✅ Deployment Method Identified

**Platform:** Vercel  
**Configuration:** `vercel.json` present ✅  
**Database:** Neon PostgreSQL (via DATABASE_URL) ✅  
**Auto-deploy:** Enabled (GitHub webhook) ✅

---

## ✅ Git Push Complete

```bash
$ git push origin main
To https://github.com/golospravdy8-rgb/Repository.git
   5d64439..212738b  main -> main
```

**Status:** 4 commits successfully pushed to `origin/main`

---

## ⏱️ Vercel Auto-Deploy Timeline

| Time | Event |
|------|-------|
| **Now** | Commits pushed to GitHub |
| **+30s** | GitHub webhook triggers Vercel |
| **+1-2m** | Build starts on Vercel |
| **+2-3m** | Deployment complete |
| **+3-4m** | Live on basketball.lviv.ua |

---

## 🔍 Post-Deployment Verification (after 3-4 minutes)

### Test 1: Admin Dashboard (No-Scroll Layout)
```
URL: https://basketball.lviv.ua/admin/games/28

Checklist:
- [ ] Page loads completely
- [ ] Dashboard fits on screen without scroll
- [ ] Header shows: Status | Teams | Score | Timer | Fouls | Timeouts
- [ ] Control buttons visible: Start/Pause/Next/End
- [ ] Left panel: Home roster with ● (on-court) and ○ (bench)
- [ ] Right panel: Away roster with indicators
- [ ] Center panel has all sections:
  - [ ] Selected player display
  - [ ] Score type selector (4 buttons)
  - [ ] Scoring buttons (+1, +2, +3)
  - [ ] Free throw buttons (✓ made, ✗ miss)
  - [ ] Stat buttons (4 in 2×2 grid)
  - [ ] Foul buttons (3 buttons)
  - [ ] Substitution modal trigger
  - [ ] Undo button
- [ ] Action log horizontal strip at bottom
- [ ] No vertical scrollbar
```

### Test 2: Score Type Selector
```
Checklist:
- [ ] 4 buttons: [Звич] [⚡Відр] [↩2й] [💥Втр]
- [ ] Clicking button highlights with orange border
- [ ] Color coding matches design:
  - Blue (normal)
  - Green (fast break)
  - Amber (second chance)
  - Red (off turnover)
```

### Test 3: Substitution Modal
```
Checklist:
- [ ] Click ↕ Заміна button opens modal
- [ ] Modal shows "Хто ВИХОДИТЬ" (on-court players)
- [ ] Modal shows "Хто ЗАХОДИТЬ" (bench players)
- [ ] Can select player OUT
- [ ] Can select player IN
- [ ] ✓ Замінити button enabled when both selected
- [ ] Modal closes after substitution
- [ ] On-court dots update on roster panels
```

### Test 4: Roster Display
```
Checklist:
- [ ] Left panel shows "На паркеті" with green ● (5 players)
- [ ] Left panel shows "Лавка" with grey ○ (8 players)
- [ ] Player names abbreviated: "Lastname F."
- [ ] Selected player highlighted in orange
- [ ] Right panel (away) has same structure
```

### Test 5: Protocol Display (Game Stats Page)
```
URL: https://basketball.lviv.ua/game/1
(or any completed game)

Checklist:
- [ ] Box score table loads
- [ ] New columns visible:
  - [ ] ЕФК (Efficiency column) — blue header
  - [ ] +/- (Plus/Minus column) — orange header
- [ ] Values populated correctly:
  - [ ] EFF shows calculated scores
  - [ ] +/- shows ±X format (e.g., +8, -5)
- [ ] Team Advanced Statistics section visible
  - [ ] Points after opponent turnovers
  - [ ] Points in fast breaks (green)
  - [ ] Points from second chance (amber)
  - [ ] Points after substitutions (blue)
  - [ ] Biggest lead (orange)
  - [ ] Biggest run (purple)
```

### Test 6: Legend Updated
```
Checklist:
- [ ] Footer legend includes:
  - [ ] ЕФК — ефективність
  - [ ] +/- — плюс/мінус
  - [ ] All other abbreviations present
```

---

## 🚨 If Tests Fail

### Issue: Dashboard Still Has Scroll
**Solution:**
1. Hard refresh browser: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
2. Clear cache: Chrome → Settings → Privacy → Clear browsing data
3. Check Vercel deployment status at https://vercel.com/dashboard

### Issue: Buttons Not Responding
**Solution:**
1. Check browser console: F12 → Console tab
2. Look for error messages
3. Verify game is in LIVE status (not SCHEDULED or FINAL)

### Issue: EFF/+/- Columns Not Visible
**Solution:**
1. Hard refresh to clear old cache
2. Check if game was created after deployment
3. Verify BoxScore table has `plusMinus` and `efficiency` fields

### Issue: Vercel Still Building
**Solution:**
1. Wait 5-10 more minutes
2. Check deployment logs at https://vercel.com
3. Look for build errors in the build log

---

## 📊 Vercel Deployment Dashboard

Access deployment status:
```
https://vercel.com/golospravdy8-rgb/Repository
```

Look for:
- ✅ Green checkmark on latest commit
- ✅ Build status showing "Ready"
- ✅ Production URL: https://basketball.lviv.ua

---

## 🔗 Deployment URLs

| Page | URL | Expected Change |
|------|-----|-----------------|
| Admin Dashboard | `/admin/games/28` | No-scroll layout + new buttons |
| Game Protocol | `/game/1` | EFF & +/- columns + stats section |
| Quick Reference | (docs only) | Local file, no URL |
| Compact Guide | (docs only) | Local file, no URL |

---

## 📋 Rollback Plan (If Critical Issue)

If something is broken and needs immediate rollback:

```bash
# On local machine
git revert 212738b    # Revert compact UI changes
git push origin main

# Vercel will auto-redeploy from previous commit
# Takes 2-3 minutes
```

**DO NOT** revert unless there's a critical issue preventing login or game functionality.

---

## ✅ Sign-Off

**Deployer:** Claude Haiku 4.5  
**Deployment Method:** GitHub → Vercel (auto-deploy)  
**Push Time:** 2026-04-18 12:00 UTC  
**Expected Live Time:** 2026-04-18 12:03 UTC  

**Next Steps:**
1. Wait 3-4 minutes for Vercel deployment
2. Test URLs from "Deployment URLs" table
3. Run through "Post-Deployment Verification" checklist
4. Inform users that compact dashboard is live

---

**Remember:** No rollback is needed unless there's a critical issue. The new features are additive and backward-compatible.
