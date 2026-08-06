-- Un nouvel utilisateur n'obtient aucun pouvoir automatiquement.
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin insert into public.profiles(id,display_name,role) values(new.id,coalesce(new.raw_user_meta_data->>'display_name',new.email),'editor'); return new; end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

-- À exécuter une seule fois depuis le SQL Editor pour promouvoir le responsable initial :
-- update public.profiles set role='admin' where id=(select id from auth.users where email='admin@example.com');
