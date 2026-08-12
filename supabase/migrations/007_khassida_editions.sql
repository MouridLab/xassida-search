create type public.edition_kind as enum ('original', 'translation', 'transcription');

create table public.khassida_editions (
  id uuid primary key default gen_random_uuid(),
  khassida_id uuid not null references public.khassidas(id) on delete cascade,
  language text not null,
  edition_kind public.edition_kind not null default 'translation',
  title text,
  translator text,
  publisher text,
  publication_year integer,
  page_count integer,
  source_name text,
  bucket text not null,
  object_key text not null unique,
  mime_type text not null default 'application/pdf',
  file_name text not null,
  file_size bigint,
  validation_status public.validation_status not null default 'review',
  created_by uuid references public.profiles(id),
  validated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (publication_year is null or publication_year between 1800 and 2200),
  check (page_count is null or page_count > 0)
);

create index khassida_editions_work_idx on public.khassida_editions(khassida_id);
create index khassida_editions_language_idx on public.khassida_editions(language);
alter table public.khassida_editions enable row level security;
create policy "éditions validées publiques" on public.khassida_editions for select
  using (validation_status = 'verified' or public.is_staff());
create policy "équipe gère les éditions" on public.khassida_editions for all
  using (public.is_staff()) with check (public.is_staff());
