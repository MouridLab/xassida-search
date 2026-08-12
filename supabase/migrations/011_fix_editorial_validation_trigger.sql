create or replace function public.enforce_validation_permission()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  row_data jsonb := to_jsonb(new);
  wants_verified boolean := false;
begin
  if row_data ? 'is_verified' then
    wants_verified := coalesce((row_data->>'is_verified')::boolean, false);
  elsif row_data ? 'validation_status' then
    wants_verified := row_data->>'validation_status' = 'verified';
  end if;

  if wants_verified
    and coalesce(auth.role(), '') <> 'service_role'
    and not public.can_validate()
  then
    raise exception 'validation requires validator role' using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_validation_permission() from public;
