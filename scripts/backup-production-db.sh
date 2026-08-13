#!/usr/bin/env bash

set -Eeuo pipefail
umask 077

current_stage='startup'

fail() {
  printf 'Backup failed during: %s\n' "$current_stage" >&2
  printf 'BACKUP VERIFIED: NO\n' >&2
  exit 1
}

trap fail ERR

current_stage='environment validation'
[[ -n "${SUPABASE_PRODUCTION_DB_URL:-}" ]]

current_stage='tool validation'
command -v docker >/dev/null
command -v git >/dev/null
command -v shasum >/dev/null
command -v supabase >/dev/null
docker info >/dev/null 2>&1

current_stage='backup directory creation'
repo_root="$(git rev-parse --show-toplevel)"
backup_root="${SUPABASE_BACKUP_ROOT:-${HOME}/.local/share/xassida-search/backups}"

if [[ -L "$backup_root" ]]; then
  printf 'Backup root must not be a symbolic link\n' >&2
  exit 1
fi

mkdir -p -- "$backup_root"
backup_root="$(cd "$backup_root" && pwd -P)"

case "$backup_root" in
  "$repo_root" | "$repo_root"/*)
    printf 'Backup root must be outside the Git repository\n' >&2
    exit 1
    ;;
esac

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
backup_dir="${backup_root}/production-${timestamp}"
mkdir -- "$backup_dir"
chmod 700 "$backup_root" "$backup_dir"
touch "$backup_dir/.DO_NOT_COMMIT"

run_dump() {
  local diagnostic_file
  diagnostic_file="$(mktemp)"
  if ! supabase db dump "$@" >"$diagnostic_file" 2>&1; then
    if grep -Eqi 'password authentication failed|SASL|SCRAM' "$diagnostic_file"; then
      printf 'Diagnostic: PostgreSQL authentication failed\n' >&2
    elif grep -Eqi 'no route to host|network is unreachable|connection refused|could not translate host|dial tcp|timeout' "$diagnostic_file"; then
      printf 'Diagnostic: PostgreSQL network connection failed\n' >&2
    elif grep -Eqi 'Cannot connect to the Docker daemon|docker daemon|docker.sock|docker context' "$diagnostic_file"; then
      printf 'Diagnostic: Docker/Colima connection failed\n' >&2
    elif grep -Eqi 'permission denied|operation not permitted' "$diagnostic_file"; then
      printf 'Diagnostic: filesystem or PostgreSQL permission denied\n' >&2
    elif grep -Eqi 'no such file or directory|mount|file sharing' "$diagnostic_file"; then
      printf 'Diagnostic: backup path is not accessible to the dump container\n' >&2
    elif grep -Eqi 'pull access denied|manifest unknown|image.*not found' "$diagnostic_file"; then
      printf 'Diagnostic: Supabase PostgreSQL container image unavailable\n' >&2
    else
      printf 'Diagnostic: unclassified Supabase CLI failure\n' >&2
    fi
    if [[ "${SUPABASE_BACKUP_DIAGNOSTICS:-0}" == '1' ]]; then
      printf '%s\n' 'Sanitized Supabase CLI details:' >&2
      sed -E \
        -e 's#(postgres(ql)?://)[^[:space:]]+#\1[REDACTED]#g' \
        -e 's#(password[=: ]+)[^[:space:]]+#\1[REDACTED]#Ig' \
        -e 's#(user[=: ]+)[^[:space:]]+#\1[REDACTED]#Ig' \
        -e 's#(SUPABASE_[A-Z0-9_]+=)[^[:space:]]+#\1[REDACTED]#g' \
        "$diagnostic_file" >&2
    fi
    rm -f -- "$diagnostic_file"
    return 1
  fi
  rm -f -- "$diagnostic_file"
}

current_stage='roles dump'
run_dump \
  --db-url "$SUPABASE_PRODUCTION_DB_URL" \
  --file "$backup_dir/roles.sql" \
  --role-only

current_stage='schema dump'
run_dump \
  --db-url "$SUPABASE_PRODUCTION_DB_URL" \
  --file "$backup_dir/schema.sql"

current_stage='data dump'
run_dump \
  --db-url "$SUPABASE_PRODUCTION_DB_URL" \
  --file "$backup_dir/data.sql" \
  --use-copy \
  --data-only \
  --exclude 'storage.buckets_vectors' \
  --exclude 'storage.vector_indexes'

current_stage='migration history schema dump'
run_dump \
  --db-url "$SUPABASE_PRODUCTION_DB_URL" \
  --file "$backup_dir/history_schema.sql" \
  --schema supabase_migrations

current_stage='migration history data dump'
run_dump \
  --db-url "$SUPABASE_PRODUCTION_DB_URL" \
  --file "$backup_dir/history_data.sql" \
  --use-copy \
  --data-only \
  --schema supabase_migrations

backup_files=(
  roles.sql
  schema.sql
  data.sql
  history_schema.sql
  history_data.sql
)

current_stage='backup file validation'
for file_name in "${backup_files[@]}"; do
  [[ -f "$backup_dir/$file_name" && -s "$backup_dir/$file_name" ]]
done

current_stage='checksum generation and validation'
(
  cd "$backup_dir"
  shasum -a 256 "${backup_files[@]}" >SHA256SUMS
  shasum -a 256 --check SHA256SUMS >/dev/null
)

chmod 600 "$backup_dir"/*.sql "$backup_dir/SHA256SUMS"

current_stage='completed'
printf 'Backup directory: %s\n' "$backup_dir"
for file_name in "${backup_files[@]}" SHA256SUMS; do
  file_size="$(wc -c <"$backup_dir/$file_name")"
  printf '%s: %s bytes\n' "$file_name" "${file_size//[[:space:]]/}"
done
printf 'BACKUP VERIFIED: YES\n'
