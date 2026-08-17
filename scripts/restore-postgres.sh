#!/usr/bin/env bash
set -Eeuo pipefail

# Restaura um dump custom em um banco explicitamente informado. Use este
# script apenas para um banco temporário de validação ou para recuperação.
umask 077

: "${ANISTREAM_DOCKER_NETWORK:?Defina ANISTREAM_DOCKER_NETWORK}"
: "${PGHOST:?Defina PGHOST}"
: "${PGUSER:?Defina PGUSER}"
: "${PGDATABASE:?Defina PGDATABASE com o banco de destino}"
: "${BACKUP_FILE:?Defina BACKUP_FILE com o caminho do .dump}"
: "${PGPASSWORD:?Defina PGPASSWORD}"
export PGPASSWORD

PGPORT="${PGPORT:-5432}"
PGIMAGE="${PGIMAGE:-postgres:16-alpine}"

if [[ ! "$PGDATABASE" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]]; then
  printf 'PGDATABASE must be a simple PostgreSQL identifier for safe database creation.\n' >&2
  exit 1
fi

test -f "$BACKUP_FILE"
if [[ -f "$BACKUP_FILE.sha256" ]]; then
  (cd "$(dirname "$BACKUP_FILE")" && sha256sum -c "$(basename "$BACKUP_FILE.sha256")")
fi

# Restore validation always targets a database name supplied by the operator;
# it is created automatically on the PostgreSQL server if absent.
database_exists="$(docker run --rm \
  --network "$ANISTREAM_DOCKER_NETWORK" \
  -e PGPASSWORD \
  "$PGIMAGE" \
  psql \
    --host="$PGHOST" \
    --port="$PGPORT" \
    --username="$PGUSER" \
    --dbname=postgres \
    --tuples-only \
    --no-align \
    --command="SELECT 1 FROM pg_database WHERE datname = '$PGDATABASE';")"
if [[ "$database_exists" != "1" ]]; then
  docker run --rm \
    --network "$ANISTREAM_DOCKER_NETWORK" \
    -e PGPASSWORD \
    "$PGIMAGE" \
    createdb \
      --host="$PGHOST" \
      --port="$PGPORT" \
      --username="$PGUSER" \
      --maintenance-db=postgres \
      "$PGDATABASE"
fi

cat "$BACKUP_FILE" | docker run --rm -i \
  --network "$ANISTREAM_DOCKER_NETWORK" \
  -e PGPASSWORD \
  "$PGIMAGE" \
  pg_restore \
    --format=custom \
    --clean \
    --if-exists \
    --no-owner \
    --no-acl \
    --host="$PGHOST" \
    --port="$PGPORT" \
    --username="$PGUSER" \
    --dbname="$PGDATABASE"

validation="$(docker run --rm \
  --network "$ANISTREAM_DOCKER_NETWORK" \
  -e PGPASSWORD \
  "$PGIMAGE" \
  psql \
    --host="$PGHOST" \
    --port="$PGPORT" \
    --username="$PGUSER" \
    --dbname="$PGDATABASE" \
    --tuples-only \
    --no-align \
    --command="SELECT 'AdminUser', COUNT(*) FROM \"AdminUser\" UNION ALL SELECT 'Anime', COUNT(*) FROM \"Anime\" UNION ALL SELECT 'Episode', COUNT(*) FROM \"Episode\" ORDER BY 1;")"
validation="$(printf '%s\n' "$validation" | tr -d '\r' | awk 'NF')"
validation_lines="$(printf '%s\n' "$validation" | awk 'NF' | wc -l | tr -d ' ' )"
if [[ "$validation_lines" != "3" ]]; then
  printf 'Restore validation failed: expected row counts for AdminUser, Anime and Episode.\n' >&2
  exit 1
fi

while IFS='|' read -r table_name row_count; do
  if [[ ! "$table_name" =~ ^(AdminUser|Anime|Episode)$ || ! "$row_count" =~ ^[0-9]+$ ]]; then
    printf 'Restore validation failed: invalid table/count result: %s|%s\n' "$table_name" "$row_count" >&2
    exit 1
  fi
done <<< "$validation"

printf 'PostgreSQL restore completed and validated in database: %s (row counts: %s)\n' "$PGDATABASE" "${validation//$'\n'/, }"
