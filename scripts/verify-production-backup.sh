#!/usr/bin/env bash

set -Eeuo pipefail
umask 077

fail() {
  printf 'RESTORE VERIFIED: NO\n' >&2
  exit 1
}

trap fail ERR

if [[ $# -ne 1 ]]; then
  printf 'Usage: bun run backup:verify -- /absolute/path/to/backup\n' >&2
  exit 1
fi

: "${SUPABASE_PRODUCTION_DB_URL:?SUPABASE_PRODUCTION_DB_URL is required}"
: "${SUPABASE_PRODUCTION_PROJECT_REF:?SUPABASE_PRODUCTION_PROJECT_REF is required}"
: "${SUPABASE_TEST_DB_URL:?SUPABASE_TEST_DB_URL is required}"
: "${SUPABASE_TEST_PROJECT_REF:?SUPABASE_TEST_PROJECT_REF is required}"
: "${TEST_SUPABASE_URL:?TEST_SUPABASE_URL is required}"
: "${TEST_SUPABASE_ANON_KEY:?TEST_SUPABASE_ANON_KEY is required}"
: "${TEST_SUPABASE_SERVICE_ROLE_KEY:?TEST_SUPABASE_SERVICE_ROLE_KEY is required}"

command -v bun >/dev/null
command -v git >/dev/null
command -v psql >/dev/null
command -v shasum >/dev/null

[[ "$SUPABASE_TEST_PROJECT_REF" != "$SUPABASE_PRODUCTION_PROJECT_REF" ]]
[[ "$SUPABASE_PRODUCTION_DB_URL" != "$SUPABASE_TEST_DB_URL" ]]
[[ "$SUPABASE_PRODUCTION_DB_URL" == *"$SUPABASE_PRODUCTION_PROJECT_REF"* ]]
[[ "$SUPABASE_TEST_DB_URL" == *"$SUPABASE_TEST_PROJECT_REF"* ]]

test_api_url="${TEST_SUPABASE_URL%/}"
[[ "$test_api_url" == "https://${SUPABASE_TEST_PROJECT_REF}.supabase.co" ]]

repo_root="$(git rev-parse --show-toplevel)"
backup_dir="$1"
[[ -d "$backup_dir" && ! -L "$backup_dir" ]]
backup_dir="$(cd "$backup_dir" && pwd -P)"

case "$backup_dir" in
  "$repo_root" | "$repo_root"/*)
    printf 'Backup directory must be outside the Git repository\n' >&2
    exit 1
    ;;
esac

backup_files=(
  roles.sql
  schema.sql
  data.sql
  history_schema.sql
  history_data.sql
  SHA256SUMS
)

for file_name in "${backup_files[@]}"; do
  [[ -f "$backup_dir/$file_name" && -s "$backup_dir/$file_name" ]]
done

(
  cd "$backup_dir"
  shasum -a 256 --check SHA256SUMS >/dev/null
)

public_table_count="$(
  psql "$SUPABASE_TEST_DB_URL" \
    --no-psqlrc \
    --tuples-only \
    --no-align \
    --set ON_ERROR_STOP=1 \
    --command "select count(*) from pg_catalog.pg_tables where schemaname = 'public';"
)"
public_table_count="${public_table_count//[[:space:]]/}"
[[ "$public_table_count" == '0' ]]

psql "$SUPABASE_TEST_DB_URL" \
  --no-psqlrc \
  --quiet \
  --single-transaction \
  --set ON_ERROR_STOP=1 \
  --file "$backup_dir/roles.sql" \
  --file "$backup_dir/schema.sql" \
  --command 'SET session_replication_role = replica' \
  --file "$backup_dir/data.sql"

psql "$SUPABASE_TEST_DB_URL" \
  --no-psqlrc \
  --quiet \
  --single-transaction \
  --set ON_ERROR_STOP=1 \
  --file "$backup_dir/history_schema.sql" \
  --file "$backup_dir/history_data.sql"

expected_migrations='001,002,003,004,005,006,007,008,009,010,011'
restored_migrations="$(
  psql "$SUPABASE_TEST_DB_URL" \
    --no-psqlrc \
    --tuples-only \
    --no-align \
    --set ON_ERROR_STOP=1 \
    --command "select string_agg(version, ',' order by version) from supabase_migrations.schema_migrations;"
)"
restored_migrations="${restored_migrations//[[:space:]]/}"
[[ "$restored_migrations" == "$expected_migrations" ]]

critical_tables=(
  profiles
  khassidas
  khassida_chunks
  audit_log
  media_assets
  library_items
  khassida_editions
)

for table_name in "${critical_tables[@]}"; do
  production_count="$(
    psql "$SUPABASE_PRODUCTION_DB_URL" \
      --no-psqlrc \
      --tuples-only \
      --no-align \
      --set ON_ERROR_STOP=1 \
      --command "select count(*) from public.${table_name};"
  )"
  test_count="$(
    psql "$SUPABASE_TEST_DB_URL" \
      --no-psqlrc \
      --tuples-only \
      --no-align \
      --set ON_ERROR_STOP=1 \
      --command "select count(*) from public.${table_name};"
  )"
  production_count="${production_count//[[:space:]]/}"
  test_count="${test_count//[[:space:]]/}"
  [[ "$production_count" == "$test_count" ]]
done

rls_failure_count="$(
  psql "$SUPABASE_TEST_DB_URL" \
    --no-psqlrc \
    --tuples-only \
    --no-align \
    --set ON_ERROR_STOP=1 \
    --command "
      select count(*)
      from unnest(array[
        'profiles','khassidas','khassida_chunks','audit_log','media_assets',
        'library_items','khassida_editions'
      ]) as expected(table_name)
      left join pg_catalog.pg_class c on c.relname = expected.table_name
      left join pg_catalog.pg_namespace n
        on n.oid = c.relnamespace and n.nspname = 'public'
      where c.oid is null or not c.relrowsecurity;
    "
)"
rls_failure_count="${rls_failure_count//[[:space:]]/}"
[[ "$rls_failure_count" == '0' ]]

policy_failure_count="$(
  psql "$SUPABASE_TEST_DB_URL" \
    --no-psqlrc \
    --tuples-only \
    --no-align \
    --set ON_ERROR_STOP=1 \
    --command "
      select count(*)
      from unnest(array[
        'profiles','khassidas','khassida_chunks','audit_log','media_assets',
        'library_items','khassida_editions'
      ]) as expected(table_name)
      where not exists (
        select 1 from pg_catalog.pg_policies p
        where p.schemaname = 'public' and p.tablename = expected.table_name
      );
    "
)"
policy_failure_count="${policy_failure_count//[[:space:]]/}"
[[ "$policy_failure_count" == '0' ]]

critical_rpc_count="$(
  psql "$SUPABASE_TEST_DB_URL" \
    --no-psqlrc \
    --tuples-only \
    --no-align \
    --set ON_ERROR_STOP=1 \
    --command "
      select count(distinct p.proname)
      from pg_catalog.pg_proc p
      join pg_catalog.pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname in (
          'is_staff','can_validate','hybrid_search',
          'replace_primary_media','enforce_validation_permission'
        );
    "
)"
critical_rpc_count="${critical_rpc_count//[[:space:]]/}"
[[ "$critical_rpc_count" == '5' ]]

required_role_count="$(
  psql "$SUPABASE_TEST_DB_URL" \
    --no-psqlrc \
    --tuples-only \
    --no-align \
    --set ON_ERROR_STOP=1 \
    --command "
      select count(*) from pg_catalog.pg_roles
      where rolname in ('anon','authenticated','service_role','postgres');
    "
)"
required_role_count="${required_role_count//[[:space:]]/}"
[[ "$required_role_count" == '4' ]]

NEXT_PUBLIC_SUPABASE_URL="$TEST_SUPABASE_URL" \
NEXT_PUBLIC_SUPABASE_ANON_KEY="$TEST_SUPABASE_ANON_KEY" \
SUPABASE_SERVICE_ROLE_KEY="$TEST_SUPABASE_SERVICE_ROLE_KEY" \
  bun run test:rls

printf 'BACKUP VERIFIED: YES\n'
printf 'RESTORE VERIFIED: YES\n'
