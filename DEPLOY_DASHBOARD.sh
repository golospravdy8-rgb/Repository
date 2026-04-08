#!/bin/bash
# Quick Dashboard Deployment Script
# Usage: bash DEPLOY_DASHBOARD.sh

set -e  # Exit on any error

echo "🚀 DASHBOARD RESTORATION & DEPLOYMENT"
echo "======================================"
echo ""

# Step 1: Verify build
echo "📦 Step 1: Verifying build..."
npm run build > /dev/null 2>&1
if [ $? -eq 0 ]; then
  echo "   ✅ Build successful"
else
  echo "   ❌ Build failed"
  exit 1
fi

echo ""

# Step 2: Git operations
echo "📝 Step 2: Committing changes..."
git add .
git commit -m "feat: Restore Dashboard from SUPER_FULL_BACKUP - 24 files recovered, Next.js 15 fixes" || echo "   ℹ️  No changes to commit"

echo ""

# Step 3: Push
echo "🔄 Step 3: Pushing to repository..."
git push origin main
if [ $? -eq 0 ]; then
  echo "   ✅ Pushed successfully"
else
  echo "   ⚠️  Push failed - check your connection"
  exit 1
fi

echo ""

# Step 4: Summary
echo "======================================"
echo "✨ DEPLOYMENT INITIATED"
echo "======================================"
echo ""
echo "📋 Next steps:"
echo "   1. Vercel will auto-deploy"
echo "   2. Monitor at: https://vercel.com/dashboard"
echo "   3. Once deployed, test at:"
echo "      https://basketball.lviv.ua/admin/login"
echo ""
echo "⏱️  Deployment time: ~2-5 minutes"
echo ""
