# 🚀 FULL SITE RESTORATION PLAN
## basket-lviv: From SUPER_FULL_BACKUP.json

**Date:** 2026-04-08  
**Status:** 📋 ANALYSIS COMPLETE → READY FOR RESTORATION

---

## 📊 CURRENT STATE ANALYSIS

### ✅ What Exists
- Contacts page (working)
- Some auth infrastructure
- Basic styling

### ❌ What's Missing (90% of site)
| Feature | Status | Impact |
|---------|--------|--------|
| Hero Banner (HeroBanner.jpg) | ❌ | Main page looks empty |
| Teams + Logos | ❌ | Teams page is blank |
| Players List | ❌ | Players section missing |
| Shop (balls, uniforms) | ❌ | No store functionality |
| Standings Table | ❌ | No tournament data |
| Schedule | ❌ | No game schedule |
| Dashboard/Admin | ❌ | Admin panel broken |
| Games, Leaders, News | ❌ | All detail pages missing |

---

## 🎯 RESTORATION STRATEGY

### Phase 1: Restructure /public Assets
**Goal:** Organize all media files in best-practice structure

```
Current:                      → New Structure:
public/
├── balls/                    ├── shop/
├── hero_banner/              │   ├── balls/
│   └── HeroBanner.jpg       │   └── uniforms/
├── logos/                    ├── logos/
├── players/                  │   ├── teams/
├── uniforms/                 │   └── players/
├── team-logos/               ├── images/
├── data/                     │   └── hero.jpg
└── SUPER_FULL_BACKUP.json   └── data/
                                  ├── gallery.json
                                  ├── highlights.json
                                  └── sponsors.json
```

### Phase 2: Restore Code Files (328 files)
- **app/** → All pages and routes (196 files)
- **components/** → All UI components (42 files)
- **lib/** → Utilities and helpers
- **data/** → JSON data files

### Phase 3: Fix Image Paths
All image imports must use:
```typescript
<img src="/images/hero.jpg" alt="..." />
<Image src="/logos/teams/..." alt="..." />
```

---

## 📋 DETAILED RESTORATION STEPS

### STEP 1: Create Organized Public Structure

```bash
# Create new organized directories
mkdir -p public/shop/balls
mkdir -p public/shop/uniforms
mkdir -p public/logos/teams
mkdir -p public/logos/players
mkdir -p public/images
mkdir -p public/data

# Move assets to new locations (examples)
mv public/balls/* public/shop/balls/ 2>/dev/null || true
mv public/uniforms/* public/shop/uniforms/ 2>/dev/null || true
mv public/logos/* public/logos/teams/ 2>/dev/null || true
mv public/players/* public/logos/players/ 2>/dev/null || true

# Reorganize hero banner
mv public/hero_banner/HeroBanner.jpg public/images/hero.jpg 2>/dev/null || true

# Clean up empty old directories
rmdir public/balls 2>/dev/null || true
rmdir public/hero_banner 2>/dev/null || true
rmdir public/uniforms 2>/dev/null || true
rmdir public/team-logos 2>/dev/null || true
```

### STEP 2: Extract All Code Files from Backup

A Node.js script will:
1. Read SUPER_FULL_BACKUP.json
2. Extract all 328 files from structure
3. Create them in correct directories
4. Fix all image paths to use new locations

### STEP 3: Update Image Paths in Components

Replace all occurrences of:
```typescript
// OLD
src="/balls/..." → src="/shop/balls/..."
src="/uniforms/..." → src="/shop/uniforms/..."
src="/logos/..." → src="/logos/teams/..."
src="/players/..." → src="/logos/players/..."
src="/hero_banner/..." → src="/images/hero.jpg"
```

### STEP 4: Verify Data Files

Ensure these JSON files exist in public/data/:
- gallery.json
- highlights.json
- sponsors.json

### STEP 5: Build & Test

```bash
npm run build
npm run dev
```

### STEP 6: Push to GitHub & Vercel

```bash
git add .
git commit -m "feat: Full site restoration from SUPER_FULL_BACKUP - 328 files restored, asset restructuring"
git push origin main
# Vercel auto-deploys
```

---

## 🗂️ NEW PUBLIC DIRECTORY STRUCTURE

```
public/
├── shop/
│   ├── balls/                    ← All ball images
│   └── uniforms/                 ← Team uniform photos
├── logos/
│   ├── teams/                    ← Team logos
│   └── players/                  ← Player profile images
├── images/
│   ├── hero.jpg                  ← Main banner
│   └── ... other images
├── data/
│   ├── gallery.json              ← Photo gallery data
│   ├── highlights.json           ← Video highlights data
│   └── sponsors.json             ← Sponsor information
├── fbl-logo.png                  ← Federation logo
└── .gitkeep
```

---

## 📝 FILES TO BE RESTORED

### Page Components (58 files)
- `app/(public)/page.tsx` — Home page with hero banner
- `app/(public)/teams/page.tsx` — Teams listing
- `app/(public)/players/page.tsx` — Players directory
- `app/(public)/shop/page.tsx` — Shop/Store
- `app/(public)/standings/page.tsx` — Tournament table
- `app/(public)/schedule/page.tsx` — Game schedule
- And 52 more pages...

### UI Components (42 files)
- `components/public/HeroButtons.tsx` — Hero section buttons
- `components/public/ShopClient.tsx` — Shop functionality
- `components/public/StandingsTable.tsx` — Table component
- `components/public/GameCard.tsx` — Game card display
- And 38 more components...

### Admin/Dashboard (44 files)
- `app/admin/dashboard/page.tsx` — Admin panel
- `app/admin/login/page.tsx` — Admin login
- `app/api/admin/*` — Admin API endpoints
- And all dashboard functionality...

### Libraries & Utilities
- `lib/prisma.ts` — Database client
- `lib/stats-calculator.ts` — Game statistics
- `lib/auth.ts` — Authentication
- And more...

---

## 🔧 RESTORATION SCRIPT

A Node.js script will handle:

```javascript
// restore-site.js
const backupData = JSON.parse(fs.readFileSync('SUPER_FULL_BACKUP.json', 'utf-8'));
const structure = backupData.structure || {};

for (const [filePath, content] of Object.entries(structure)) {
  const fsPath = filePath.replace(/\\/g, '/');
  
  // Fix image paths in content
  let fixedContent = content
    .replace(/\/balls\//g, '/shop/balls/')
    .replace(/\/uniforms\//g, '/shop/uniforms/')
    .replace(/\/logos\//g, '/logos/teams/')
    .replace(/\/players\//g, '/logos/players/')
    .replace(/\/hero_banner\//g, '/images/');
  
  // Create file
  fs.mkdirSync(path.dirname(fsPath), { recursive: true });
  fs.writeFileSync(fsPath, fixedContent, 'utf-8');
  
  console.log(`✓ Created: ${fsPath}`);
}
```

---

## ✅ EXPECTED RESULTS AFTER RESTORATION

### Homepage
- ✅ Hero banner displays (HeroBanner.jpg)
- ✅ Hero buttons functional
- ✅ Sponsor banner shows
- ✅ Latest news visible

### Teams Page
- ✅ All teams listed
- ✅ Team logos display
- ✅ Team names and info

### Players Page
- ✅ Player list with photos
- ✅ Player positions
- ✅ Team assignments

### Shop/Store
- ✅ Ball products
- ✅ Uniform photos
- ✅ Shopping functionality

### Standings
- ✅ Tournament table
- ✅ Team stats
- ✅ Age group filtering

### Dashboard
- ✅ Admin login works
- ✅ Dashboard displays stats
- ✅ All admin functions operational

---

## 🚨 CRITICAL DEPENDENCIES

### Files That Reference Images
These MUST exist in new locations:
- `app/(public)/page.tsx` → needs `/images/hero.jpg`
- `components/public/ShopClient.tsx` → needs `/shop/balls/*`, `/shop/uniforms/*`
- `components/public/StandingsTable.tsx` → needs team data
- `app/(public)/teams/page.tsx` → needs `/logos/teams/*`

### Data Files Required
- `public/data/gallery.json`
- `public/data/highlights.json`
- `public/data/sponsors.json`

---

## 📈 RESTORATION STATISTICS

| Metric | Value |
|--------|-------|
| Total files to restore | 328 |
| App pages | 58 |
| UI components | 42 |
| Admin pages | 44 |
| Directories to create | ~8 |
| Image relocations | ~50+ |
| Code path fixes | ~100+ |

---

## 🎯 SUCCESS CRITERIA

✅ All 328 files restored  
✅ All image paths updated  
✅ Build passes without errors  
✅ No broken imports  
✅ Homepage displays with banner  
✅ All pages accessible  
✅ Admin dashboard functional  
✅ Shop/store working  
✅ Standings table displays  
✅ No console errors  

---

## 📅 TIMELINE

| Phase | Duration | Action |
|-------|----------|--------|
| Asset restructuring | 2 min | Move public files |
| Code restoration | 5 min | Extract 328 files |
| Path fixing | 3 min | Update all references |
| Build & test | 2 min | npm run build |
| Push to GitHub | 1 min | git push |
| Vercel deploy | 3 min | Auto-deploy |
| **TOTAL** | **~16 minutes** | **Site live!** |

---

## 📞 SUPPORT

If anything breaks:
1. Check Vercel build logs
2. All files are in SUPER_FULL_BACKUP.json
3. Can restore specific sections independently
4. Database schema is untouched (Prisma)

---

**READY TO RESTORE? Follow Step-by-Step Guide Below ↓**
