#!/bin/bash
# ============================================
# SmartTicketQR — Database Backup Script
# Usage: ./scripts/backup-db.sh
# Supports: SQLite (dev) and PostgreSQL (production)
# ============================================

set -euo pipefail

# --- Config ---
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/stqr_${TIMESTAMP}.dump.gz"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info()  { echo -e "${GREEN}[INFO]${NC}  $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# --- Create backup directory ---
mkdir -p "$BACKUP_DIR"

# --- Detect database type ---
if [ -n "${DATABASE_URL:-}" ] && echo "$DATABASE_URL" | grep -q "^postgres"; then
    # PostgreSQL backup
    log_info "PostgreSQL backup detected"

    if ! command -v pg_dump &>/dev/null; then
        log_error "pg_dump not found. Install postgresql-client."
        exit 1
    fi

    # Parse DATABASE_URL: postgres://user:password@host:port/dbname
    DB_USER=$(echo "$DATABASE_URL" | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
    DB_PASS=$(echo "$DATABASE_URL" | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
    DB_HOST=$(echo "$DATABASE_URL" | sed -n 's/.*@\([^:]*\):.*/\1/p')
    DB_PORT=$(echo "$DATABASE_URL" | sed -n 's/.*@[^:]*:\([0-9]*\)\/.*/\1/p')
    DB_NAME=$(echo "$DATABASE_URL" | sed -n 's/.*\/\([^?]*\).*/\1/p')

    export PGPASSWORD="$DB_PASS"

    log_info "Backing up ${DB_NAME} from ${DB_HOST}:${DB_PORT}..."
    pg_dump \
        -h "${DB_HOST}" \
        -p "${DB_PORT}" \
        -U "${DB_USER}" \
        -F c \
        -b \
        -v \
        "${DB_NAME}" | gzip > "$BACKUP_FILE"

    unset PGPASSWORD

elif [ -n "${DATABASE_URL:-}" ] && echo "$DATABASE_URL" | grep -q "^file:"; then
    # SQLite backup
    DB_PATH=$(echo "$DATABASE_URL" | sed 's/file://')
    log_info "SQLite backup: ${DB_PATH}"

    if [ ! -f "$DB_PATH" ]; then
        log_error "SQLite database not found: ${DB_PATH}"
        exit 1
    fi

    # Use sqlite3 .dump if available, otherwise copy the file
    if command -v sqlite3 &>/dev/null; then
        sqlite3 "$DB_PATH" .dump | gzip > "$BACKUP_FILE"
    else
        cp "$DB_PATH" "${BACKUP_FILE%.dump.gz}.db"
        gzip "${BACKUP_FILE%.dump.gz}.db"
    fi
else
    log_error "Cannot determine database type. Set DATABASE_URL."
    exit 1
fi

# --- Verify backup ---
if [ -f "$BACKUP_FILE" ]; then
    SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    log_info "Backup completed: ${BACKUP_FILE} (${SIZE})"
else
    log_error "Backup file not created!"
    exit 1
fi

# --- Cleanup old backups ---
DELETED=$(find "$BACKUP_DIR" -name "stqr_*.dump.gz" -mtime +"$RETENTION_DAYS" -delete -print | wc -l)
if [ "$DELETED" -gt 0 ]; then
    log_info "Cleaned ${DELETED} backup(s) older than ${RETENTION_DAYS} days"
fi

log_info "Done."
