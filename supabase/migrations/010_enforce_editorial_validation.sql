create or replace function public.enforce_validation_permission()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  wants_verified boolean;
begin
  wants_verified := case tg_table_name
    when 'khassidas' then new.is_verified
    when 'library_items' then new.is_verified
    when 'khassida_chunks' then new.validation_status = 'verified'
    when 'khassida_editions' then new.validation_status = 'verified'
    else false
  end;

  if wants_verified
    and coalesce(auth.role(), '') <> 'service_role'
    and not public.can_validate()
  then
    raise exception 'validation requires validator role' using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_khassida_validation on public.khassidas;
create trigger enforce_khassida_validation
before insert or update of is_verified on public.khassidas
for each row execute function public.enforce_validation_permission();

drop trigger if exists enforce_chunk_validation on public.khassida_chunks;
create trigger enforce_chunk_validation
before insert or update of validation_status on public.khassida_chunks
for each row execute function public.enforce_validation_permission();

drop trigger if exists enforce_library_validation on public.library_items;
create trigger enforce_library_validation
before insert or update of is_verified on public.library_items
for each row execute function public.enforce_validation_permission();

drop trigger if exists enforce_edition_validation on public.khassida_editions;
create trigger enforce_edition_validation
before insert or update of validation_status on public.khassida_editions
for each row execute function public.enforce_validation_permission();

revoke all on function public.enforce_validation_permission() from public;
