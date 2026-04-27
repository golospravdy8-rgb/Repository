#!/bin/bash

# 🔒 Backup System for basket-lviv
# Creates timestamped snapshots of all critical game files
# Usage: bash backup/scripts/backup.sh

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
SNAPSHOT_DIR="backup/snapshots/$TIMESTAMP"
mkdir -p "$SNAPSHOT_DIR"

echo "📦 Creating snapshot: $SNAPSHOT_DIR"

# Критические файлы игры
echo "  → components/public (game canvas, physics, visuals)"
mkdir -p "$SNAPSHOT_DIR/components/public"
cp -r components/public/*.tsx components/public/*.ts "$SNAPSHOT_DIR/components/public/" 2>/dev/null || true

echo "  → pages/api/pusher (game order, order reset)"
mkdir -p "$SNAPSHOT_DIR/pages/api/pusher"
cp -r pages/api/pusher/*.ts "$SNAPSHOT_DIR/pages/api/pusher/" 2>/dev/null || true

echo "  → app/api/players (HP rewards system)"
mkdir -p "$SNAPSHOT_DIR/app/api/players"
cp -r app/api/players/ "$SNAPSHOT_DIR/app/api/players/" 2>/dev/null || true

echo "  → lib (game logic, Prisma client, Pusher config)"
mkdir -p "$SNAPSHOT_DIR/lib"
cp -r lib/*.ts "$SNAPSHOT_DIR/lib/" 2>/dev/null || true
cp -r lib/game "$SNAPSHOT_DIR/lib/" 2>/dev/null || true

echo "  → prisma (database schema)"
mkdir -p "$SNAPSHOT_DIR/prisma"
cp prisma/schema.prisma "$SNAPSHOT_DIR/prisma/" 2>/dev/null || true

echo "  → environment files (if available)"
mkdir -p "$SNAPSHOT_DIR/env"
cp .env "$SNAPSHOT_DIR/env/env.backup" 2>/dev/null && echo "    ✓ .env" || echo "    ○ .env not found"
cp .env.local "$SNAPSHOT_DIR/env/env.local.backup" 2>/dev/null && echo "    ✓ .env.local" || echo "    ○ .env.local not found"

# Git metadata
echo "  → git version info"
echo "{
  \"timestamp\": \"$TIMESTAMP\",
  \"git_commit\": \"$(git rev-parse HEAD 2>/dev/null || echo 'N/A')\",
  \"git_branch\": \"$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'N/A')\",
  \"user\": \"$(whoami)\"
}" > "$SNAPSHOT_DIR/version.json"

echo ""
echo "✅ Snapshot created successfully!"
echo "📁 Location: $SNAPSHOT_DIR"
echo ""
echo "📋 Files backed up:"
find "$SNAPSHOT_DIR" -type f | sed 's|^|   |' | head -50

FILE_COUNT=$(find "$SNAPSHOT_DIR" -type f | wc -l)
DIR_COUNT=$(find "$SNAPSHOT_DIR" -type d | wc -l)
echo ""
echo "📊 Stats: $FILE_COUNT files, $DIR_COUNT directories"
echo ""
echo "💾 To restore: bash backup/scripts/restore.sh $TIMESTAMP [file_path]"
echo "💾 Or restore game: bash backup/scripts/restore-game.sh $TIMESTAMP"
