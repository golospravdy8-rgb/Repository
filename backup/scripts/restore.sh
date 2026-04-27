#!/bin/bash

# 🔒 Restore System for basket-lviv
# Restores files from a snapshot
# Usage: bash backup/scripts/restore.sh [snapshot_timestamp] [optional: file_path]
# Examples:
#   bash backup/scripts/restore.sh latest
#   bash backup/scripts/restore.sh latest components/public/RucheekGameCanvas.tsx
#   bash backup/scripts/restore.sh 20260427_130000 lib/gameOrderCounter.ts

SNAPSHOT=$1
FILE=$2

if [ -z "$SNAPSHOT" ]; then
  echo "❌ Error: snapshot timestamp required"
  echo ""
  echo "📋 Available snapshots:"
  ls -1 backup/snapshots/ 2>/dev/null | tail -10 || echo "  (none found)"
  echo ""
  echo "Usage: bash backup/scripts/restore.sh [snapshot] [optional: file_path]"
  exit 1
fi

# Если snapshot = "latest" — взять последний
if [ "$SNAPSHOT" = "latest" ]; then
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

if [ -z "$FILE" ]; then
  # Show contents of snapshot
  echo "📦 Contents of snapshot: $SNAPSHOT"
  echo ""
  echo "Version info:"
  cat "$SNAPSHOT_DIR/version.json" 2>/dev/null | sed 's/^/  /'
  echo ""
  echo "Files available for restore:"
  find "$SNAPSHOT_DIR" -type f -not -name "version.json" | sed 's|^'"$SNAPSHOT_DIR"'/||' | sed 's/^/  /' | sort
  echo ""
  echo "Usage: bash backup/scripts/restore.sh $SNAPSHOT [file_path]"
else
  # Restore specific file
  BACKUP_FILE="$SNAPSHOT_DIR/$FILE"

  if [ -f "$BACKUP_FILE" ]; then
    # Create directory if needed
    mkdir -p "$(dirname "$FILE")"

    # Show what will happen
    if [ -f "$FILE" ]; then
      echo "⚠️  File exists: $FILE"
      echo "   Backup:   $(stat -c%y "$BACKUP_FILE" 2>/dev/null || date -r "$BACKUP_FILE" 2>/dev/null || echo 'N/A')"
      echo "   Current:  $(stat -c%y "$FILE" 2>/dev/null || date -r "$FILE" 2>/dev/null || echo 'N/A')"
      echo ""
      read -p "   Restore? (y/n) " -n 1 -r
      echo
      if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Cancelled"
        exit 1
      fi
    fi

    cp "$BACKUP_FILE" "$FILE"
    echo "✅ Restored: $FILE"
    echo "   From snapshot: $SNAPSHOT"
  else
    echo "❌ File not found in snapshot: $FILE"
    echo ""
    echo "📋 Available files in snapshot $SNAPSHOT:"
    find "$SNAPSHOT_DIR" -type f -not -name "version.json" | sed 's|^'"$SNAPSHOT_DIR"'/||' | sed 's/^/   /'
    exit 1
  fi
fi
