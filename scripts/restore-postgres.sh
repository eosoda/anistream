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

test -f "$BACKUP_FILE"
if [[ -f "$BACKUP_FILE.sha256" ]]; then
  (cd "$(dirname "$BACKUP_FILE")" && sha256sum -c "$(basename "$BACKUP_FILE.sha256")")
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
    --dbname="$PGDATABASE" \
    -

printf 'PostgreSQL restore completed in database: %s\n' "$PGDATABASE"
