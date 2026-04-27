#!/bin/bash

# 🔒 Restore Game System for basket-lviv
# Restores entire game system (components, APIs, lib) from a snapshot
# Usage: bash backup/scripts/restore-game.sh [optional: snapshot_timestamp]
# Examples:
#   bash backup/scripts/restore-game.sh           # latest snapshot
#   bash backup/scripts/restore-game.sh 20260427_130000

SNAPSHOT=$1

if [ -z "$SNAPSHOT" ]; then
  SNAPSHOT=$(ls -1 backup/snapshots/ 2>/dev/null | sort -r | head -1)
  if [ -z "$SNAPSHOT" ]; then
    echo "❌ No snapshots found in backup/snapshots/"
    exit 1
  fi
  echo "📦 Using latest snapshot: $SNAPSHOT"
fi

SNAPSHOT_DIR="backup/snapshots/$SNAPSHOT"

if [ ! -d "$SNAPSHOT_DIR" ]; then
  echo "❌ Snapshot not found: $SNAPSHOT_DIR"
  echo ""
  echo "📋 Available snapshots:"
  ls -1 backup/snapshots/ 2>/dev/null | tail -10
  exit 1
fi

echo ""
echo "🔄 Restoring game system from snapshot: $SNAPSHOT"
echo "⚠️  This will overwrite:"
echo "   - components/public/"
echo "   - pages/api/pusher/"
echo "   - app/api/players/"
echo "   - lib/ (game logic only)"
echo ""

read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "❌ Cancelled"
  exit 1
fi

echo ""
echo "🔄 Restoring..."

# Game components
if [ -d "$SNAPSHOT_DIR/components/public" ]; then
  echo "  → components/public"
  rm -rf components/public/*
  cp -r "$SNAPSHOT_DIR/components/public/"* components/public/ 2>/dev/null || true
fi

# Pusher API routes
if [ -d "$SNAPSHOT_DIR/pages/api/pusher" ]; then
  echo "  → pages/api/pusher"
  rm -rf pages/api/pusher/*
  cp -r "$SNAPSHOT_DIR/pages/api/pusher/"* pages/api/pusher/ 2>/dev/null || true
fi

# Players API routes
if [ -d "$SNAPSHOT_DIR/app/api/players" ]; then
  echo "  → app/api/players"
  rm -rf app/api/players/*
  cp -r "$SNAPSHOT_DIR/app/api/players/"* app/api/players/ 2>/dev/null || true
fi

# Game libraries
if [ -d "$SNAPSHOT_DIR/lib" ]; then
  echo "  → lib (game logic)"
  # Preserve non-game files
  mkdir -p lib/game
  cp -r "$SNAPSHOT_DIR/lib/game/"* lib/game/ 2>/dev/null || true
  # Core game files only
  cp "$SNAPSHOT_DIR/lib/gameOrderCounter.ts" lib/ 2>/dev/null || true
  cp "$SNAPSHOT_DIR/lib/pusher.ts" lib/ 2>/dev/null || true
  cp "$SNAPSHOT_DIR/lib/gameChannel.ts" lib/ 2>/dev/null || true
fi

echo ""
echo "✅ Game restored from snapshot: $SNAPSHOT"
echo ""
echo "📋 Next steps:"
echo "   1. Review changes: git status"
echo "   2. Build: npm run build"
echo "   3. Test locally: npm run dev:safe"
echo "   4. If OK, commit: git add . && git commit -m 'restore: game from snapshot $SNAPSHOT'"
echo "   5. Deploy: git push origin main"
echo ""
