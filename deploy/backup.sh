#!/bin/bash
# ============================================================
# PolyglotLC — Kunlik backup skripti
# ============================================================
# Joylashuv:  /opt/polyglot_crm/backup.sh
# Cron:       0 3 * * * /opt/polyglot_crm/backup.sh >> /var/log/polyglot/backup.log 2>&1
# ------------------------------------------------------------

set -euo pipefail

# Sozlamalar
BACKUP_DIR="/var/backups/polyglot"
MEDIA_DIR="/opt/polyglot_crm/backend/media"
DB_NAME="polyglot_crm"
DB_USER="polyglot"
KEEP_DAYS=14
DATE=$(date +%F_%H%M)

mkdir -p "$BACKUP_DIR"

# 1) PostgreSQL dump
echo "[$(date)] Postgres dump boshlandi..."
PGPASSWORD="$(grep '^DB_PASSWORD=' /opt/polyglot_crm/backend/.env | cut -d'=' -f2)" \
    pg_dump -U "$DB_USER" -h 127.0.0.1 "$DB_NAME" \
    | gzip > "$BACKUP_DIR/db_${DATE}.sql.gz"

DB_SIZE=$(du -h "$BACKUP_DIR/db_${DATE}.sql.gz" | cut -f1)
echo "[$(date)] Postgres dump tayyor: ${DB_SIZE}"

# 2) Media papka (kichkina bo'lsa)
if [ -d "$MEDIA_DIR" ]; then
    echo "[$(date)] Media archive boshlandi..."
    tar -czf "$BACKUP_DIR/media_${DATE}.tar.gz" -C "$(dirname $MEDIA_DIR)" "$(basename $MEDIA_DIR)"
    MEDIA_SIZE=$(du -h "$BACKUP_DIR/media_${DATE}.tar.gz" | cut -f1)
    echo "[$(date)] Media archive tayyor: ${MEDIA_SIZE}"
fi

# 3) Eski backuplarni o'chirish
echo "[$(date)] $KEEP_DAYS kundan eski backuplarni o'chirish..."
find "$BACKUP_DIR" -name '*.gz' -mtime +$KEEP_DAYS -delete

echo "[$(date)] ✅ Backup tugadi"
