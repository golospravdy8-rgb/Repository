#!/bin/bash
# Ручний або автоматичний бекап PostgreSQL
# Запуск: bash /opt/basket-lviv/deploy/backup.sh

set -e

BACKUP_DIR="/opt/backups/basket-lviv"
DATE=$(date +%Y-%m-%d_%H-%M-%S)
BACKUP_FILE="$BACKUP_DIR/backup_$DATE.sql.gz"
KEEP_DAYS=7

mkdir -p "$BACKUP_DIR"

echo "[$DATE] Starting backup..."

docker exec basket-postgres pg_dump \
  -U basket_user \
  -d basket_lviv \
  | gzip > "$BACKUP_FILE"

echo "Backup saved: $BACKUP_FILE ($(du -sh $BACKUP_FILE | cut -f1))"

# Видаляємо бекапи старші 7 днів
find "$BACKUP_DIR" -name "backup_*.sql.gz" -mtime +$KEEP_DAYS -delete
echo "Old backups cleaned (kept last $KEEP_DAYS days)"

echo "Done!"
