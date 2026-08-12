create type public.library_item_type as enum ('book','article','biography','conference','audio','video','manuscript','archive');

create table public.library_items (
  id uuid primary key default gen_random_uuid(), slug text not null unique, title text not null,
  subtitle text, description text, item_type public.library_item_type not null, author text,
  publisher text, publication_year integer, language text not null default 'fr', themes text[] not null default '{}',
  cover_url text, resource_url text, source_name text, is_featured boolean not null default false,
  is_verified boolean not null default false, created_by uuid references public.profiles(id),
  validated_by uuid references public.profiles(id), created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(), check(publication_year is null or publication_year between 1800 and 2200)
);
create index library_items_type_idx on public.library_items(item_type);
create index library_items_title_trgm_idx on public.library_items using gin(title extensions.gin_trgm_ops);
create index library_items_themes_idx on public.library_items using gin(themes);
alter table public.library_items enable row level security;
create policy "ressources vérifiées publiques" on public.library_items for select using(is_verified or public.is_staff());
create policy "équipe gère la bibliothèque" on public.library_items for all using(public.is_staff()) with check(public.is_staff());
