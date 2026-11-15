#!/usr/bin/env bash
# usage: DATABASE_ADMIN_URL=postgresql://postgres:...@host/db ./database/migrate.sh
set -euo pipefail
: "${DATABASE_ADMIN_URL:?set DATABASE_ADMIN_URL (owner role; NOT the app_user URL)}"
psql "$DATABASE_ADMIN_URL" -v ON_ERROR_STOP=1 -c "CREATE TABLE IF NOT EXISTS schema_migrations (version TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW());"
for f in "$(dirname "$0")"/migrations/*.sql; do
  v=$(basename "$f")
  if [ "$(psql "$DATABASE_ADMIN_URL" -Atc "SELECT 1 FROM schema_migrations WHERE version='$v'")" != "1" ]; then
    echo "applying $v"; psql "$DATABASE_ADMIN_URL" -v ON_ERROR_STOP=1 -1 -f "$f"
    psql "$DATABASE_ADMIN_URL" -c "INSERT INTO schema_migrations(version) VALUES ('$v')"
  fi
done
