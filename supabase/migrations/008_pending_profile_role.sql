-- Preserve every existing account and make only future accounts non-privileged.
alter table public.profiles alter column role set default 'pending';
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check
  check (role in ('pending', 'editor', 'validator', 'admin'));

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles(id, display_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', new.email),
    'pending'
  );
  return new;
end;
$$;

-- Role promotion remains an explicit service-role/SQL administration action.
-- Existing editor, validator and admin profiles are intentionally unchanged.
