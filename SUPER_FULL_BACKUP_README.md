# SUPER_FULL_BACKUP.json — Complete Vercel Production Backup

## Overview

**SUPER_FULL_BACKUP.json** is a comprehensive backup of the **basket-lviv** project (https://basketball.lviv.ua/) created on **2026-04-11 14:34:59 UTC**.

- **File**: `SUPER_FULL_BACKUP.json`
- **Size**: 8.93 MB
- **Lines**: 6,234
- **Format**: UTF-8 JSON (valid, verified with python3 -m json.tool)

## Contents

### 1. Meta Information
- Project name, production URL
- GitHub repo: golospravdy8-rgb/Repository
- Latest commit: d0083dd3119a67611f205ce416fe970f1e682e6d
- Vercel project ID: prj_9IAYJR9IRotcL0sxv1FfTRl6Hr8a
- Vercel org ID: team_m2ukJoXdRqoOcdBVbc7hjHLJ
- Vercel Blob store ID: dlrcmjzfg12lm7md

### 2. Vercel Project Info
- Framework: Next.js 14
- Build command: `prisma generate && next build`
- Install command: `npm install`

### 3. GitHub File Tree
- **380 source files** with paths, sizes, and raw GitHub URLs
- All code files: .ts, .tsx, .js, .css, .prisma, .json configs

### 4. Complete Source Code Structure
- **app/** — All pages, routes, admin panel
- **components/** — UI components and layouts
- **actions/** — Server Actions
- **lib/** — Utilities, Prisma client, auth config
- **prisma/** — Schema and migrations
- **config/** — Build, TypeScript, Tailwind configurations
- **380 total files** ready for extraction

### 5. Production Database Snapshot
Fresh export from Neon PostgreSQL (2026-04-11 14:34:03 UTC):

| Entity | Count |
|--------|-------|
| Seasons | 2 (U-14, U-16) |
| Teams | 11 |
| Players | 92 |
| Games | 11 |
| News Articles | 1 |
| Shop Products | 25 |
| Chat Messages | 13 |
| Site Settings | 82 (key-value pairs) |
| Videos | Multiple |
| Reviews | Multiple |
| Guest Contacts | Multiple |
| MVP Votes | Multiple |

All 34 Prisma models included with complete data.

### 6. Media Registry

#### Vercel Blob Storage
- **Store ID**: dlrcmjzfg12lm7md
- **Public Base URL**: https://dlrcmjzfg12lm7md.public.blob.vercel-storage.com
- **Files**: 1 player photo
  - File: `logos/player-photo-1775907511670-*.jpg`
  - Size: 103.7 KB
  - Publicly downloadable via blob_url

#### GitHub /public/ Directory
- **178 files** (team logos, images, icons)
- All with raw GitHub URLs for download
- Categories: team_logo, player_photo, icon, image

### 7. Secrets (55 Environment Variables)

**Database Credentials:**
- `DATABASE_URL` (Neon PostgreSQL pooler)
- `DATABASE_URL_UNPOOLED`
- `POSTGRES_USER`, `POSTGRES_PASSWORD`
- `PGHOST`, `PGHOST_UNPOOLED`
- `NEON_PROJECT_ID`

**Authentication:**
- `NEXTAUTH_SECRET`, `AUTH_SECRET`
- `JWT_SECRET`
- `CHAT_ADMIN_SECRET`
- `ADMIN_ACTIVATION_SECRET`

**API Keys:**
- `BLOB_READ_WRITE_TOKEN` (Vercel Blob)
- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHANNEL_ID`
- `YOUTUBE_API_KEY`, `YOUTUBE_CHANNEL_ID`
- `NEXTAUTH_URL`

**External Services:**
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_MONOBANK_JAR_ID`
- `GMAIL_USER`, `GMAIL_APP_PASSWORD`

## How to Use This Backup

### Scenario 1: Complete Project Recovery
```bash
# 1. Extract all files from structure section
# 2. Install dependencies
npm install

# 3. Create .env.local from secrets section
# 4. Set up database
npx prisma generate
npx prisma migrate deploy

# 5. Seed database with data section
npx prisma db seed

# 6. Build and deploy
npm run build
vercel --prod
```

### Scenario 2: New Vercel Instance
1. Create new Vercel project
2. Connect to GitHub (golospravdy8-rgb/Repository)
3. Add environment variables from secrets section
4. Vercel auto-deploys on push

### Scenario 3: Database Recovery Only
1. Update `DATABASE_URL` to point to new database
2. Run: `npx prisma migrate deploy`
3. Import data from data section

### Scenario 4: Media Recovery
- Download Blob files from `media_registry.blob_store.files[].blob_url`
- Download public files from `media_registry.github_public.files[].github_raw_url`
- Re-upload to new Blob store using `BLOB_READ_WRITE_TOKEN`

## Verification

### File Integrity
- ✅ JSON validation: `python3 -m json.tool SUPER_FULL_BACKUP.json`
- ✅ 380 source files included and readable
- ✅ All data models covered
- ✅ Media registry complete

### Production Data
- ✅ Fresh database export (2026-04-11 14:34:03 UTC)
- ✅ Current Git commit hash recorded
- ✅ All environment variables captured
- ✅ Vercel configuration documented

## Important Notes

1. **Secrets are included** — Keep this file secure (never commit to git, never share publicly)
2. **Media URLs are live** — All Blob files are publicly accessible
3. **GitHub URLs are live** — Clone from golospravdy8-rgb/Repository if code recovery needed
4. **Database credentials** — Update for target environment (DATABASE_URL, POSTGRES_PASSWORD, etc.)

## Critical Production Information

| Item | Value |
|------|-------|
| **Production URL** | https://basketball.lviv.ua/ |
| **GitHub Repo** | https://github.com/golospravdy8-rgb/Repository |
| **GitHub Branch** | main |
| **Vercel Project** | prj_9IAYJR9IRotcL0sxv1FfTRl6Hr8a |
| **Database** | Neon PostgreSQL (neondb) |
| **Blob Store** | dlrcmjzfg12lm7md |
| **Region** | US East 1 (AWS) |

## Timestamps

- **Backup Created**: 2026-04-11T14:34:59.341Z
- **Database Snapshot**: 2026-04-11T14:34:03.662Z
- **Last Git Commit**: d0083dd3119a67611f205ce416fe970f1e682e6d
- **Node Version**: v24.13.0

## Status

✅ **READY FOR PRODUCTION DEPLOYMENT PROTECTION**

This backup is complete, validated, and ready to use for:
- Disaster recovery
- Production migration
- Environment replication
- Data backup/archival
