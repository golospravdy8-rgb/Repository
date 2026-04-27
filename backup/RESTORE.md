# 🔒 Backup & Restore Guide for basket-lviv

## Quick Start

### 1️⃣ Create a new snapshot (backup current state)
```bash
npm run backup
# or: bash backup/scripts/backup.sh
```

### 2️⃣ Restore entire game from latest snapshot
```bash
npm run restore:game
# or: bash backup/scripts/restore-game.sh
```

### 3️⃣ Restore a single file
```bash
npm run restore:file latest components/public/RucheekGameCanvas.tsx
# or: bash backup/scripts/restore.sh latest components/public/RucheekGameCanvas.tsx
```

---

## Detailed Usage

### View all snapshots
```bash
ls backup/snapshots/
```

Output example:
```
20260427_120000
20260427_121500
20260427_130000
```

### View snapshot contents
```bash
bash backup/scripts/restore.sh 20260427_130000
```

Shows:
- Version info (timestamp, git commit, branch)
- All files available in that snapshot
- Instructions to restore a specific file

### Restore specific file
```bash
bash backup/scripts/restore.sh latest components/public/RucheekGameCanvas.tsx
bash backup/scripts/restore.sh 20260427_130000 pages/api/pusher/get-order.ts
bash backup/scripts/restore.sh 20260427_130000 lib/gameOrderCounter.ts
```

Prompts for confirmation if file already exists.

### Restore entire game
```bash
bash backup/scripts/restore-game.sh
```

Restores all critical game files:
- `components/public/` (game canvas, physics)
- `pages/api/pusher/` (game order endpoints)
- `app/api/players/` (HP reward system)
- `lib/game/` (game logic)
- `lib/gameOrderCounter.ts`, `lib/pusher.ts`, `lib/gameChannel.ts`

Prompts for confirmation before overwriting.

### Restore from specific snapshot
```bash
bash backup/scripts/restore-game.sh 20260427_130000
```

---

## Snapshot Structure

Each snapshot contains:

```
backup/snapshots/20260427_130000/
├── version.json                  # Git metadata & timestamp
├── components/public/            # Game canvas, physics, visuals
├── pages/api/pusher/            # Game order APIs
├── app/api/players/             # HP rewards API
├── lib/                         # Game logic
├── prisma/                      # Database schema
└── env/
    ├── env.backup               # Current .env (if exists)
    └── env.local.backup         # Current .env.local (if exists)
```

---

## Critical Files Backed Up

| File | Purpose |
|------|---------|
| `components/public/RucheekGameCanvas.tsx` | Main game canvas component |
| `components/public/basketball-physics-engine.ts` | Physics simulation |
| `pages/api/pusher/get-order.ts` | Get next player position order |
| `pages/api/pusher/reset-order.ts` | Reset order counter |
| `app/api/players/add-hp/route.ts` | Award HP to winner |
| `lib/gameOrderCounter.ts` | Game order counter logic |
| `lib/game/basketballPhysics.ts` | Physics calculations |
| `lib/game/powerMeterSystem.ts` | Power meter logic |
| `lib/game/RimCollisionSystem.ts` | Rim collision detection |
| `prisma/schema.prisma` | Database schema |

---

## Recovery Scenarios

### Scenario 1: Bug in game canvas (RucheekGameCanvas.tsx)
```bash
# View version before bug
bash backup/scripts/restore.sh 20260427_120000

# Restore from before bug
bash backup/scripts/restore.sh 20260427_120000 components/public/RucheekGameCanvas.tsx

# Test
npm run build && npm run dev:safe

# If OK, commit
git add components/public/RucheekGameCanvas.tsx
git commit -m "revert: RucheekGameCanvas.tsx from backup 20260427_120000"
git push origin main
```

### Scenario 2: Physics engine broken
```bash
bash backup/scripts/restore.sh latest components/public/basketball-physics-engine.ts
npm run build && npm run dev:safe
```

### Scenario 3: API changes broke game
```bash
bash backup/scripts/restore-game.sh
npm run build && npm run dev:safe
git diff  # Review changes
git add .
git commit -m "restore: game system from backup"
```

### Scenario 4: Multiple files corrupted
```bash
# Restore from specific snapshot
bash backup/scripts/restore-game.sh 20260427_100000

# Build and test
npm run build
npm run dev:safe

# Check git diff
git diff

# Commit if OK
git add .
git commit -m "restore: game system from snapshot 20260427_100000"
```

---

## Git Workflow

After restore, always:

1. **Review changes**
   ```bash
   git status
   git diff [file]
   ```

2. **Build**
   ```bash
   npm run build
   ```

3. **Test locally**
   ```bash
   npm run dev:safe
   ```

4. **Commit**
   ```bash
   git add .
   git commit -m "restore: [what was restored] from [snapshot]"
   ```

5. **Deploy**
   ```bash
   git push origin main
   ```

---

## Snapshot Location

All backups are stored in: `backup/snapshots/[TIMESTAMP]/`

Example full path:
```
D:\n8n\basket-lviv\backup\snapshots\20260427_130000\
```

---

## Retention Policy

Snapshots are kept indefinitely. To clean up old snapshots:

```bash
# Remove snapshots older than 30 days
find backup/snapshots -maxdepth 1 -type d -mtime +30 -exec rm -rf {} \;

# Remove specific snapshot
rm -rf backup/snapshots/20260427_100000
```

---

## Troubleshooting

### No snapshots found
```bash
❌ No snapshots found in backup/snapshots/
```

**Solution:** Create first backup
```bash
npm run backup
```

### Snapshot not found
```bash
❌ Snapshot not found: backup/snapshots/20260427_130000
```

**Solution:** Check available snapshots
```bash
ls backup/snapshots/
bash backup/scripts/restore.sh latest
```

### File not found in snapshot
```bash
❌ File not found in snapshot: components/public/SomeFile.tsx
```

**Solution:** View available files in snapshot
```bash
bash backup/scripts/restore.sh 20260427_130000
```

### Build fails after restore
```bash
npm run build
# → Error: ...
```

**Solution:** Check git diff and review changes
```bash
git diff
git status
npm install  # If package.json changed
npm run build
```

---

## Advanced: Manual Restore

If scripts don't work:

```bash
# Copy entire snapshot
cp -r backup/snapshots/20260427_130000/components/public/* components/public/
cp -r backup/snapshots/20260427_130000/pages/api/pusher/* pages/api/pusher/
cp -r backup/snapshots/20260427_130000/app/api/players/* app/api/players/
cp -r backup/snapshots/20260427_130000/lib/game/* lib/game/

# Then rebuild
npm run build
npm run dev:safe
```

---

## Backup Schedule

### Manual backups
Before any major changes:
```bash
npm run backup
git add backup/snapshots/
git commit -m "backup: pre-[feature] snapshot"
```

### Automated backups (optional)
To create daily snapshots, add to crontab (Linux/Mac):
```bash
0 2 * * * cd /path/to/basket-lviv && bash backup/scripts/backup.sh
```

Or Windows Task Scheduler (Windows):
```
Program: C:\bash.exe (Git Bash)
Arguments: -c "cd 'D:\n8n\basket-lviv' && bash backup/scripts/backup.sh"
Schedule: Daily, 2:00 AM
```

---

## Support

If something goes wrong:

1. **Check git log**
   ```bash
   git log --oneline | head -20
   ```

2. **Check available snapshots**
   ```bash
   ls -lh backup/snapshots/ | tail -10
   ```

3. **View snapshot contents**
   ```bash
   bash backup/scripts/restore.sh latest
   ```

4. **Restore from stable snapshot**
   ```bash
   bash backup/scripts/restore-game.sh 20260427_120000
   npm run build
   npm run dev:safe
   ```

---

**Created:** 2026-04-27  
**Project:** basket-lviv (Next.js 14 + Rucheek game + Prisma + Pusher)
