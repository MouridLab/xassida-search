create extension if not exists vector with schema extensions;
create extension if not exists pg_trgm with schema extensions;

create type public.validation_status as enum ('draft','review','verified','disabled');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role text not null default 'editor' check (role in ('editor','validator','admin')),
  created_at timestamptz not null default now()
);

create table public.khassidas (
  id uuid primary key default gen_random_uuid(), slug text not null unique,
  title text not null, arabic_title text, aliases text[] not null default '{}', themes text[] not null default '{}',
  description text, transcription text, translation text, pdf_url text, audio_url text,
  is_verified boolean not null default false, source_name text, validated_by uuid references public.profiles(id),
  created_by uuid references public.profiles(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.khassida_chunks (
  id uuid primary key default gen_random_uuid(), khassida_id uuid not null references public.khassidas(id) on delete cascade,
  arabic_text text, normalized_arabic text, transcription text, normalized_transcription text,
  french_translation text, commentary text, chapter_number integer, verse_start integer, verse_end integer,
  page_number integer, source_pdf_url text, audio_url text,
  validation_status public.validation_status not null default 'draft', embedding extensions.vector(1536),
  created_by uuid references public.profiles(id), validated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (verse_end is null or verse_start is null or verse_end >= verse_start)
);

create table public.audit_log (
  id bigint generated always as identity primary key, actor_id uuid references public.profiles(id),
  entity_type text not null, entity_id uuid not null, action text not null, previous_data jsonb, new_data jsonb,
  created_at timestamptz not null default now()
);

create index khassidas_title_trgm_idx on public.khassidas using gin (title extensions.gin_trgm_ops);
create index khassidas_arabic_title_trgm_idx on public.khassidas using gin (arabic_title extensions.gin_trgm_ops);
create index chunks_arabic_trgm_idx on public.khassida_chunks using gin (normalized_arabic extensions.gin_trgm_ops);
create index chunks_transcription_trgm_idx on public.khassida_chunks using gin (normalized_transcription extensions.gin_trgm_ops);
create index chunks_embedding_hnsw_idx on public.khassida_chunks using hnsw (embedding extensions.vector_cosine_ops);

create function public.is_staff() returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from profiles where id=auth.uid() and role in ('editor','validator','admin'));
$$;
create function public.can_validate() returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from profiles where id=auth.uid() and role in ('validator','admin'));
$$;

alter table public.profiles enable row level security;
alter table public.khassidas enable row level security;
alter table public.khassida_chunks enable row level security;
alter table public.audit_log enable row level security;
create policy "profile personnel lisible" on public.profiles for select using (id=auth.uid());
create policy "khassidas vérifiés publics" on public.khassidas for select using (is_verified or public.is_staff());
create policy "équipe gère les khassidas" on public.khassidas for all using (public.is_staff()) with check (public.is_staff());
create policy "passages vérifiés publics" on public.khassida_chunks for select using (validation_status='verified' or public.is_staff());
create policy "équipe gère les passages" on public.khassida_chunks for all using (public.is_staff()) with check (public.is_staff());
create policy "administrateurs lisent le journal" on public.audit_log for select using (exists(select 1 from profiles where id=auth.uid() and role='admin'));

create function public.hybrid_search(query_text text, query_embedding extensions.vector(1536), match_count int default 10)
returns table(id uuid,khassida_id uuid,arabic_text text,transcription text,french_translation text,commentary text,chapter_number int,verse_start int,verse_end int,page_number int,source_pdf_url text,audio_url text,score float)
language sql stable security invoker as $$
with candidates as (
 select c.*, greatest(extensions.similarity(coalesce(c.normalized_arabic,''),query_text),extensions.similarity(coalesce(c.normalized_transcription,''),query_text)) lexical,
 case when query_embedding is null or c.embedding is null then 0 else 1-(c.embedding OPERATOR(extensions.<=>) query_embedding) end semantic
 from khassida_chunks c join khassidas k on k.id=c.khassida_id where c.validation_status='verified' and k.is_verified
)
select id,khassida_id,arabic_text,transcription,french_translation,commentary,chapter_number,verse_start,verse_end,page_number,source_pdf_url,audio_url,(lexical*.55+semantic*.45)::float score
from candidates where lexical>.05 or semantic>.2 order by score desc limit least(match_count,20);
$$;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
('documents','documents',false,20971520,array['application/pdf']),
('audio','audio',false,104857600,array['audio/mpeg','audio/mp4','audio/ogg']) on conflict(id) do nothing;
create policy "équipe importe les médias" on storage.objects for insert to authenticated with check (bucket_id in ('documents','audio') and public.is_staff());
create policy "équipe modifie les médias" on storage.objects for all to authenticated using (bucket_id in ('documents','audio') and public.is_staff());
