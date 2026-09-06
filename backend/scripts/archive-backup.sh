#!/usr/bin/env bash
#
# Nightly dump of the archive database to a file, with rotation and a restorability check.
#
#   ./scripts/archive-backup.sh
#   BACKUP_DIR=/mnt/data/backups KEEP_DAYS=30 ./scripts/archive-backup.sh
#
# Why this exists on top of the archive itself: the archive container and the application
# database live on the same VPS and the same disk. The archive survives a corrupted sheet,
# a bad migration or a dropped table — but not the loss of the host. This produces a
# single portable file per night so that gap can be closed by copying it off the box.
#
# THE COPY OFF THE BOX IS NOT DONE HERE — see OFFSITE below. A dump sitting on the same
# disk as the thing it backs up protects against accidents, not against losing the server.
#
# Safe to run while the archive is being written to: pg_dump takes a consistent snapshot.

set -euo pipefail

CONTAINER="${ARCHIVE_CONTAINER:-rk-archive-db}"
DB_USER="${ARCHIVE_DB_USER:-rk_archive}"
DB_NAME="${ARCHIVE_DB_NAME:-rk_archive}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/rk-archive}"
KEEP_DAYS="${KEEP_DAYS:-30}"

STAMP="$(date +%F_%H%M)"
OUT="${BACKUP_DIR}/rk_archive_${STAMP}.sql.gz"

log() { echo "[$(date -Is)] $*"; }

if ! docker inspect "$CONTAINER" >/dev/null 2>&1; then
  log "ERROR: container '$CONTAINER' not found. Set ARCHIVE_CONTAINER if it is named differently."
  exit 1
fi

mkdir -p "$BACKUP_DIR"

log "dumping ${DB_NAME} from ${CONTAINER} -> ${OUT}"
# Write to a .partial file first so a crash mid-dump can never leave a truncated file
# that looks like a valid backup.
docker exec "$CONTAINER" pg_dump -U "$DB_USER" "$DB_NAME" | gzip -9 > "${OUT}.partial"

# A backup nobody has verified is not a backup. This catches truncation and corruption;
# it does not prove the SQL restores cleanly, which only a real restore test does.
if ! gzip -t "${OUT}.partial"; then
  log "ERROR: dump failed its integrity check — keeping it as ${OUT}.partial for inspection"
  exit 1
fi

mv "${OUT}.partial" "$OUT"
SIZE="$(du -h "$OUT" | cut -f1)"
log "ok: ${OUT} (${SIZE})"

# Rotation. Only ever touches files this script created.
DELETED="$(find "$BACKUP_DIR" -name 'rk_archive_*.sql.gz' -type f -mtime "+${KEEP_DAYS}" -print -delete | wc -l)"
log "rotation: kept ${KEEP_DAYS} days, removed ${DELETED} old dump(s)"

REMAINING="$(find "$BACKUP_DIR" -name 'rk_archive_*.sql.gz' -type f | wc -l)"
log "backups on disk: ${REMAINING}"

# ── OFFSITE ──────────────────────────────────────────────────────────────────
# Add ONE of these so the dump leaves the VPS. Until then this protects against
# database-level accidents only, not against losing the server.
#
#   rclone copy "$OUT" gdrive:rk-archive-backups/     # Google Drive (you already use Google)
#   rclone copy "$OUT" b2:rk-archive-backups/         # Backblaze B2 / Cloudflare R2
#   scp "$OUT" user@otherhost:/backups/               # any second machine
#
# Also worth checking before building anything: Hostinger VPS plans include automated
# snapshots. If those are enabled and retained, host loss may already be covered.

log "done"
