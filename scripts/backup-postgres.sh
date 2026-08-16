#!/usr/bin/env bash
set -Eeuo pipefail

# Backup oficial do PostgreSQL para a VPS do beta. O script usa um cliente
# postgres:16 temporário na mesma rede Docker e não publica a porta do banco.
umask 077

: "${ANISTREAM_DOCKER_NETWORK:?Defina ANISTREAM_DOCKER_NETWORK com a rede privada do Dokploy}"
: "${PGHOST:?Defina PGHOST com o nome DNS interno do serviço PostgreSQL}"
: "${PGUSER:?Defina PGUSER}"
: "${PGDATABASE:?Defina PGDATABASE}"

BACKUP_DIR="${BACKUP_DIR:-/var/backups/anistream/postgres}"
PGPORT="${PGPORT:-5432}"
PGIMAGE="${PGIMAGE:-postgres:16-alpine}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
DAILY_DIR="$BACKUP_DIR/daily"
WEEKLY_DIR="$BACKUP_DIR/weekly"
DAILY_FILE="$DAILY_DIR/anistream-$STAMP.dump"
PASSWORD_FILE="${PGPASSWORD_FILE:-}"

mkdir -p "$DAILY_DIR" "$WEEKLY_DIR"

if [[ -n "$PASSWORD_FILE" ]]; then
  PGPASSWORD="$(<"$PASSWORD_FILE")"
else
  : "${PGPASSWORD:?Defina PGPASSWORD ou PGPASSWORD_FILE}"
fi
export PGPASSWORD

docker run --rm \
  --network "$ANISTREAM_DOCKER_NETWORK" \
  -e PGPASSWORD \
  "$PGIMAGE" \
  pg_isready -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" >/dev/null

TEMP_FILE="$DAILY_FILE.tmp"
trap 'rm -f -- "$TEMP_FILE"' EXIT

docker run --rm \
  --network "$ANISTREAM_DOCKER_NETWORK" \
  -e PGPASSWORD \
  "$PGIMAGE" \
  pg_dump \
    --format=custom \
    --no-owner \
    --no-acl \
    --host="$PGHOST" \
    --port="$PGPORT" \
    --username="$PGUSER" \
    --dbname="$PGDATABASE" > "$TEMP_FILE"

test -s "$TEMP_FILE"
mv -- "$TEMP_FILE" "$DAILY_FILE"
sha256sum "$DAILY_FILE" > "$DAILY_FILE.sha256"
chmod 0600 "$DAILY_FILE" "$DAILY_FILE.sha256"

# Um snapshot semanal é criado no domingo a partir do dump diário do dia.
if [[ "$(date -u +%u)" == "7" ]]; then
  WEEKLY_FILE="$WEEKLY_DIR/anistream-$(date -u +%G-W%V).dump"
  cp -- "$DAILY_FILE" "$WEEKLY_FILE"
  sha256sum "$WEEKLY_FILE" > "$WEEKLY_FILE.sha256"
  chmod 0600 "$WEEKLY_FILE" "$WEEKLY_FILE.sha256"
fi

mapfile -t OLD_DAILY < <(find "$DAILY_DIR" -maxdepth 1 -type f -name '*.dump' -printf '%T@ %p\n' | sort -nr | awk 'NR > 14 { $1=""; sub(/^ /, ""); print }')
for file in "${OLD_DAILY[@]}"; do
  rm -f -- "$file" "$file.sha256"
done

mapfile -t OLD_WEEKLY < <(find "$WEEKLY_DIR" -maxdepth 1 -type f -name '*.dump' -printf '%T@ %p\n' | sort -nr | awk 'NR > 4 { $1=""; sub(/^ /, ""); print }')
for file in "${OLD_WEEKLY[@]}"; do
  rm -f -- "$file" "$file.sha256"
done

printf 'PostgreSQL backup created: %s\n' "$DAILY_FILE"
