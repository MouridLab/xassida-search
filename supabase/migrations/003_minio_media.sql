create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  khassida_id uuid not null references public.khassidas(id) on delete cascade,
  kind text not null check (kind in ('pdf','audio')),
  provider text not null default 'minio' check (provider in ('minio','external')),
  bucket text,
  object_key text,
  external_url text,
  mime_type text not null,
  file_name text not null,
  file_size bigint,
  source_url text,
  is_primary boolean not null default false,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  check ((provider='minio' and bucket is not null and object_key is not null) or (provider='external' and external_url is not null))
);
create unique index one_primary_media_per_kind on public.media_assets(khassida_id,kind) where is_primary;
alter table public.media_assets enable row level security;
create policy "médias des œuvres publiées visibles" on public.media_assets for select using (exists(select 1 from public.khassidas k where k.id=khassida_id and k.is_verified) or public.is_staff());
create policy "équipe gère les médias" on public.media_assets for all using (public.is_staff()) with check (public.is_staff());
