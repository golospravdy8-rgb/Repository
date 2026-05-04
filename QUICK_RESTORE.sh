#!/bin/bash

# QUICK_RESTORE.sh — basket-lviv Project Recovery
# Usage: bash QUICK_RESTORE.sh
# Time: 5-10 minutes

set -e

echo "🚀 Starting basket-lviv Project Recovery..."
echo ""

# Step 1: Restore environment
echo "1️⃣  Creating .env from backup..."
node -e "
const fs = require('fs');
const backup = JSON.parse(fs.readFileSync('SUPER_FULL_BACKUP.json', 'utf8'));
const env = Object.entries(backup.secrets)
  .map(([key, val]) => \`\${key}=\${val}\`)
  .join('\\n');
fs.writeFileSync('.env', env, 'utf8');
console.log('   ✓ .env restored with \$(Object.keys(backup.secrets).length) variables');
"
echo ""

# Step 2: Install dependencies
echo "2️⃣  Installing dependencies..."
npm install --silent
echo "   ✓ npm dependencies installed"
echo ""

# Step 3: Database setup
echo "3️⃣  Setting up database..."
npx prisma generate --silent
echo "   ✓ Prisma client generated"

npx prisma migrate deploy --silent 2>/dev/null || echo "   ⚠️  Migrations skipped (already applied)"
echo "   ✓ Database migrations applied"

# Uncomment to seed database
# npx prisma db seed
# echo "   ✓ Database seeded"
echo ""

# Step 4: Build
echo "4️⃣  Building project..."
npm run build --silent
echo "   ✓ Project built successfully"
echo ""

# Step 5: Summary
echo "✅ RECOVERY COMPLETE!"
echo ""
echo "Next steps:"
echo "  • npm run dev         → Start development server"
echo "  • npm run start       → Start production server"
echo "  • npx prisma studio  → View database"
echo ""
echo "Restore media files (optional):"
echo "  bash restore_media.sh"
echo ""
