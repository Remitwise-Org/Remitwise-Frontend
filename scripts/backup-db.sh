#!/usr/bin/env bash
# =============================================================================
# RemitWise — SQLite database backup script
#
# Usage:
#   bash scripts/backup-db.sh
#
# Environment variables (can be set in .env.local or the shell):
#   DATABASE_PATH        Path to the SQLite .db file (default: prisma/dev.db)
#   BACKUP_DIR           Directory for local backups    (default: ./backups)
#   BACKUP_RETENTION_DAYS Days to keep local backups    (default: 7)
#   BACKUP_S3_BUCKET     S3 bucket name; leave unset to skip S3 upload
#   BACKUP_S3_PREFIX     S3 key prefix                  (default: remitwise/db)
#   AWS_ACCESS_KEY_ID    \
#   AWS_SECRET_ACCESS_KEY > Required when BACKUP_S3_BUCKET is set
#   AWS_DEFAULT_REGION   /
# =============================================================================
set -euo pipefail

# ---------------------------------------------------------------------------
# Load .env.local if present (key=value pairs only; no export needed)
# ---------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"

if [[ -f "$REPO_ROOT/.env.local" ]]; then
  while IFS= read -r line; do
    [[ "$line" =~ ^#.*$ || -z "$line" ]] && continue
    key="${line%%=*}"
    val="${line#*=}"
    # Only export if not already set in the environment
    [[ -v "$key" ]] || export "$key"="$val"
  done < "$REPO_ROOT/.env.local"
fi

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
DATABASE_PATH="${DATABASE_PATH:-$REPO_ROOT/prisma/dev.db}"
BACKUP_DIR="${BACKUP_DIR:-$REPO_ROOT/backups}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-7}"
BACKUP_S3_BUCKET="${BACKUP_S3_BUCKET:-}"
BACKUP_S3_PREFIX="${BACKUP_S3_PREFIX:-remitwise/db}"

TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP_FILENAME="remitwise_db_${TIMESTAMP}.db"
BACKUP_PATH="$BACKUP_DIR/$BACKUP_FILENAME"

# ---------------------------------------------------------------------------
# Preflight checks
# ---------------------------------------------------------------------------
if [[ ! -f "$DATABASE_PATH" ]]; then
  echo "[backup] ERROR: database file not found: $DATABASE_PATH" >&2
  exit 1
fi

if ! command -v sqlite3 &>/dev/null; then
  echo "[backup] ERROR: sqlite3 is not installed or not on PATH" >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"

# ---------------------------------------------------------------------------
# Create backup using SQLite's online backup API (safe during live writes)
# ---------------------------------------------------------------------------
echo "[backup] Starting backup: $DATABASE_PATH → $BACKUP_PATH"
sqlite3 "$DATABASE_PATH" ".backup '$BACKUP_PATH'"
echo "[backup] Backup complete: $BACKUP_PATH ($(du -sh "$BACKUP_PATH" | cut -f1))"

# ---------------------------------------------------------------------------
# Optional: upload to S3
# ---------------------------------------------------------------------------
if [[ -n "$BACKUP_S3_BUCKET" ]]; then
  if ! command -v aws &>/dev/null; then
    echo "[backup] WARNING: BACKUP_S3_BUCKET is set but 'aws' CLI not found — skipping S3 upload" >&2
  else
    S3_KEY="${BACKUP_S3_PREFIX}/${BACKUP_FILENAME}"
    echo "[backup] Uploading to s3://${BACKUP_S3_BUCKET}/${S3_KEY} ..."
    aws s3 cp "$BACKUP_PATH" "s3://${BACKUP_S3_BUCKET}/${S3_KEY}" \
      --storage-class STANDARD_IA
    echo "[backup] S3 upload complete."
  fi
fi

# ---------------------------------------------------------------------------
# Rotate old local backups
# ---------------------------------------------------------------------------
echo "[backup] Removing local backups older than ${BACKUP_RETENTION_DAYS} days ..."
find "$BACKUP_DIR" -maxdepth 1 -name "remitwise_db_*.db" \
  -mtime "+${BACKUP_RETENTION_DAYS}" -print -delete

echo "[backup] Done."
