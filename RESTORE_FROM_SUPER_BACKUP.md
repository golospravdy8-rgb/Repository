# RESTORE FROM SUPER_FULL_BACKUP.json

## Complete Restoration Guide for basket-lviv Project

This guide explains how to restore the entire basket-lviv project from `SUPER_FULL_BACKUP.json`.

---

## Quick Start (5-10 minutes)

### Step 1: Parse the Backup File
```bash
node -e "
const fs = require('fs');
const backup = JSON.parse(fs.readFileSync('SUPER_FULL_BACKUP.json', 'utf8'));
console.log('✓ Backup loaded');
console.log('  Project:', backup.meta.project);
console.log('  Commit:', backup.meta.github_last_commit_short);
console.log('  Created:', backup.meta.created_at);
"
```

### Step 2: Restore Environment Variables
```bash
# Create .env file from secrets
node -e "
const fs = require('fs');
const backup = JSON.parse(fs.readFileSync('SUPER_FULL_BACKUP.json', 'utf8'));
const env = Object.entries(backup.secrets)
  .map(([key, val]) => \`\${key}=\${val}\`)
  .join('\\n');
fs.writeFileSync('.env', env, 'utf8');
console.log('✓ .env file restored');
"
```

### Step 3: Install Dependencies
```bash
npm install
```

### Step 4: Setup Database
```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Seed database with backup data
npx prisma db seed
```

### Step 5: Restore Media Files
```bash
# Download all media files from GitHub
node -e "
const fs = require('fs');
const path = require('path');
const https = require('https');
const backup = JSON.parse(fs.readFileSync('SUPER_FULL_BACKUP.json', 'utf8'));

const download = (url, filepath) => {
  return new Promise((resolve, reject) => {
    const dir = path.dirname(filepath);
    fs.mkdirSync(dir, { recursive: true });
    const file = fs.createWriteStream(filepath);
    https.get(url, r => r.pipe(file)).on('error', reject);
    file.on('finish', () => { file.close(); resolve(); });
  });
};

(async () => {
  for (const item of backup.media_registry.files) {
    try {
      await download(item.github_raw_url, item.local_path);
      process.stdout.write('.');
    } catch (e) {
      console.error('✗', item.local_path);
    }
  }
  console.log('\\n✓ Media restoration complete');
})();
"
```

### Step 6: Build and Run
```bash
npm run build
npm run start
```

---

## Full Restoration (15-30 minutes)

### Scenario 1: Complete System Failure (Fresh Machine)

1. **Initialize Node Project**
   ```bash
   # Install Node.js v22+
   # Create new directory
   mkdir basket-lviv && cd basket-lviv
   ```

2. **Restore Code Structure**
   ```bash
   node -e "
   const fs = require('fs');
   const backup = JSON.parse(fs.readFileSync('SUPER_FULL_BACKUP.json', 'utf8'));
   
   // Write all code files from structure
   for (const [section, files] of Object.entries(backup.structure)) {
     if (typeof files === 'object') {
       for (const [filepath, content] of Object.entries(files)) {
         const dir = require('path').dirname(filepath);
         fs.mkdirSync(dir, { recursive: true });
         fs.writeFileSync(filepath, content, 'utf8');
       }
     }
   }
   console.log('✓ Code structure restored');
   "
   ```

3. **Restore Database Connection**
   - Update `.env` with your actual Neon PostgreSQL credentials
   - Ensure `DATABASE_URL` points to your database instance

4. **Verify Restoration**
   ```bash
   npx prisma studio  # Opens Prisma Studio to verify data
   npm run dev         # Start development server
   ```

### Scenario 2: Data-Only Recovery

If you only need to restore the database:

```bash
# 1. Create Prisma seed file from backup data
node -e "
const fs = require('fs');
const backup = JSON.parse(fs.readFileSync('SUPER_FULL_BACKUP.json', 'utf8'));

const seedCode = \`
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Teams
  \${JSON.stringify(backup.data.teams, null, 2)}
  
  // Players
  \${JSON.stringify(backup.data.players, null, 2)}
  
  // Games
  \${JSON.stringify(backup.data.games, null, 2)}
  
  // ... other tables
}

main()
  .then(() => console.log('✓ Seeding complete'))
  .catch(e => console.error(e));
\`;

fs.writeFileSync('prisma/seed-from-backup.ts', seedCode, 'utf8');
console.log('✓ Seed file created: prisma/seed-from-backup.ts');
"

# 2. Run seed
npx prisma db seed
```

### Scenario 3: Media-Only Recovery

If you only need to restore media files:

```bash
# Download all media files
node -e "
const fs = require('fs');
const path = require('path');
const https = require('https');
const backup = JSON.parse(fs.readFileSync('SUPER_FULL_BACKUP.json', 'utf8'));

let count = 0;
let errors = 0;

const download = (url, filepath) => {
  return new Promise((resolve) => {
    const dir = path.dirname(filepath);
    fs.mkdirSync(dir, { recursive: true });
    const file = fs.createWriteStream(filepath);
    https.get(url, r => r.pipe(file))
      .on('error', () => { errors++; resolve(); });
    file.on('finish', () => { file.close(); count++; resolve(); });
    file.on('error', () => { errors++; file.close(); resolve(); });
  });
};

(async () => {
  console.log('⏳ Downloading media files...');
  const tasks = backup.media_registry.files.map(item => 
    download(item.github_raw_url, item.local_path)
  );
  await Promise.all(tasks);
  console.log(\`✓ Downloaded \${count} files\`);
  if (errors > 0) console.log(\`⚠️ \${errors} files failed\`);
})();
"
```

---

## Backup Contents Reference

### backup.meta
- Project name, GitHub repo, commit info
- Creation timestamp
- Node and Next.js versions

### backup.structure
- All source code files (.ts, .tsx, .js, .css)
- Configuration files (next.config.mjs, tsconfig.json, etc.)
- Prisma schema

### backup.data
- Teams (2 teams: U-14, U-16)
- Players (all player records)
- Games (all game records)
- Standings (league standings)
- News (all news articles)
- BoxScores (game statistics)
- Shop Products (merchandise)
- Site Settings (configuration)

### backup.media_registry
- 193 media files (~92 MB)
- GitHub raw URLs for each file
- File sizes and categories

### backup.secrets
- 55 environment variables
- Database credentials
- API tokens
- Service integrations

### backup.architecture
- System design documentation
- Integration points
- Database schema overview

---

## Troubleshooting

### Database Connection Issues
```bash
# Test Neon connection
psql postgresql://neondb_owner:npg_wW3lIbDUcx9g@ep-still-frost-an4xb137-pooler.c-6.us-east-1.aws.neon.tech/neondb

# Check Prisma schema
npx prisma validate
```

### Missing Files
```bash
# Re-download all media
node restore_media.js

# Re-extract code files
node extract_code_from_backup.js
```

### Build Errors
```bash
# Clear cache and reinstall
rm -rf node_modules .next
npm install
npm run build
```

---

## Verification Checklist

- [ ] `.env` file created with all secrets
- [ ] `npm install` completed
- [ ] Database migrations applied
- [ ] Database seeded with data
- [ ] Media files downloaded (193 files)
- [ ] `npm run build` succeeds
- [ ] `npm run dev` starts server on localhost:3006
- [ ] Admin panel accessible at /admin
- [ ] Homepage loads with teams and standings

---

## File Sizes & Counts

- **Code Files**: ~50 files
- **Database Records**: 308 total records
- **Media Files**: 193 files (91.82 MB)
- **Environment Variables**: 55 variables
- **Backup Size**: 0.2 MB (compressed JSON)

---

## Support

For questions or issues during restoration:
1. Check the backup metadata: `backup.meta`
2. Verify database credentials in `.env`
3. Check GitHub raw URLs are accessible
4. Review Prisma schema for table structure

**Backup Created**: 2026-05-02T16:39:07.065Z  
**Git Commit**: 3b2ca27  
**Status**: ✅ Complete and Ready
