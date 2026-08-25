create extension if not exists unaccent with schema extensions;

create or replace function public.normalize_public_search(value text)
returns text
language sql
immutable
parallel safe
set search_path = public, extensions
as $$
  select trim(regexp_replace(
    replace(replace(
      lower(extensions.unaccent(
        translate(
          regexp_replace(coalesce(value, ''), '[ؐ-ًؚ-ٰٟۖ-ۭـ]', '', 'g'),
          'أإآٱىؤئ', 'اااايوي'
        )
      )),
      'ou', 'u'),
      'aa', 'a'),
    '[^a-z0-9؀-ۿ]+', ' ', 'g'
  ));
$$;

-- PostgreSQL classe array_to_string comme STABLE, ce qui l'interdit directement
-- dans un index d'expression. Cette sérialisation de text[] est déterministe.
create or replace function public.immutable_array_to_search_text(value text[])
returns text
language sql
immutable
parallel safe
set search_path = public
as $$
  select array_to_string(coalesce(value, '{}'), ' ');
$$;

create index if not exists khassidas_search_text_trgm_idx
  on public.khassidas using gin (
    public.normalize_public_search(coalesce(title, '') || ' ' || coalesce(arabic_title, '') || ' ' || coalesce(transcription, '') || ' ' || public.immutable_array_to_search_text(aliases) || ' ' || public.immutable_array_to_search_text(themes)) extensions.gin_trgm_ops
  ) where is_verified;
create index if not exists chunks_translation_trgm_idx
  on public.khassida_chunks using gin (public.normalize_public_search(french_translation) extensions.gin_trgm_ops)
  where validation_status = 'verified';
create index if not exists chunks_commentary_trgm_idx
  on public.khassida_chunks using gin (public.normalize_public_search(commentary) extensions.gin_trgm_ops)
  where validation_status = 'verified';
create index if not exists library_search_text_trgm_idx
  on public.library_items using gin (
    public.normalize_public_search(coalesce(title, '') || ' ' || coalesce(subtitle, '') || ' ' || coalesce(author, '') || ' ' || coalesce(description, '') || ' ' || public.immutable_array_to_search_text(themes)) extensions.gin_trgm_ops
  ) where is_verified;

create or replace function public.unified_public_search(
  query_text text,
  result_type_filter text default null,
  theme_filter text default null,
  result_limit integer default 15,
  result_offset integer default 0
)
returns table(
  result_type text, id uuid, title text, slug text, subtitle text, excerpt text,
  khassida_id uuid, page_number integer, chapter_number integer,
  verse_start integer, verse_end integer, matched_field text, rank_score double precision,
  total_count bigint
)
language sql
stable
security invoker
set search_path = public, extensions
as $$
with input as (
  select public.normalize_public_search(query_text) q
), candidates as (
  select 'khassida'::text result_type, k.id, k.title, k.slug,
    k.arabic_title subtitle, coalesce(k.description, k.transcription, k.translation) excerpt,
    null::uuid khassida_id, null::integer page_number, null::integer chapter_number,
    null::integer verse_start, null::integer verse_end,
    case
      when public.normalize_public_search(k.title) = i.q or public.normalize_public_search(k.arabic_title) = i.q then 'title'
      when exists (select 1 from unnest(k.aliases) a where public.normalize_public_search(a) = i.q) then 'alias'
      when public.normalize_public_search(k.title) like '%' || i.q || '%' or public.normalize_public_search(k.arabic_title) like '%' || i.q || '%' then 'title'
      when exists (select 1 from unnest(k.themes) t where public.normalize_public_search(t) like '%' || i.q || '%') then 'theme'
      else 'metadata'
    end matched_field,
    case
      when public.normalize_public_search(k.title) = i.q or public.normalize_public_search(k.arabic_title) = i.q then 100
      when exists (select 1 from unnest(k.aliases) a where public.normalize_public_search(a) = i.q) then 90
      when exists (select 1 from unnest(k.aliases) a where public.normalize_public_search(a) like '%' || i.q || '%') then 85
      when public.normalize_public_search(k.title) like '%' || i.q || '%' or public.normalize_public_search(k.arabic_title) like '%' || i.q || '%' then 80
      when exists (select 1 from unnest(k.themes) t where public.normalize_public_search(t) like '%' || i.q || '%') then 70
      else 65
    end::double precision rank_score
  from public.khassidas k cross join input i
  where k.is_verified
    and (theme_filter is null or k.themes @> array[theme_filter])
    and public.normalize_public_search(coalesce(k.title, '') || ' ' || coalesce(k.arabic_title, '') || ' ' || coalesce(k.transcription, '') || ' ' || array_to_string(k.aliases, ' ') || ' ' || array_to_string(k.themes, ' ')) like '%' || i.q || '%'

  union all
  select 'passage', c.id, k.title, k.slug, k.arabic_title,
    case
      when public.normalize_public_search(c.arabic_text) like '%' || i.q || '%' then c.arabic_text
      when public.normalize_public_search(c.transcription) like '%' || i.q || '%' then c.transcription
      when public.normalize_public_search(c.french_translation) like '%' || i.q || '%' then c.french_translation
      else c.commentary
    end,
    k.id, c.page_number, c.chapter_number, c.verse_start, c.verse_end,
    case
      when public.normalize_public_search(c.arabic_text) like '%' || i.q || '%' then 'arabic_text'
      when public.normalize_public_search(c.transcription) like '%' || i.q || '%' then 'transcription'
      when public.normalize_public_search(c.french_translation) like '%' || i.q || '%' then 'translation'
      else 'commentary'
    end,
    case
      when public.normalize_public_search(c.arabic_text) like '%' || i.q || '%' then 60
      when public.normalize_public_search(c.transcription) like '%' || i.q || '%' then 58
      when public.normalize_public_search(c.french_translation) like '%' || i.q || '%' then 55
      else 50
    end::double precision
  from public.khassida_chunks c join public.khassidas k on k.id = c.khassida_id cross join input i
  where c.validation_status = 'verified' and k.is_verified
    and (theme_filter is null or k.themes @> array[theme_filter])
    and (
      coalesce(c.normalized_arabic, public.normalize_public_search(c.arabic_text)) like '%' || i.q || '%'
      or coalesce(c.normalized_transcription, public.normalize_public_search(c.transcription)) like '%' || i.q || '%'
      or public.normalize_public_search(c.french_translation) like '%' || i.q || '%'
      or public.normalize_public_search(c.commentary) like '%' || i.q || '%'
    )

  union all
  select 'library', l.id, l.title, l.slug, coalesce(l.subtitle, l.author),
    coalesce(l.description, l.subtitle, l.author), null::uuid, null::integer, null::integer,
    null::integer, null::integer,
    case when public.normalize_public_search(l.title) like '%' || i.q || '%' then 'title'
      when public.normalize_public_search(l.author) like '%' || i.q || '%' then 'author'
      when exists (select 1 from unnest(l.themes) t where public.normalize_public_search(t) like '%' || i.q || '%') then 'theme'
      else 'description' end,
    case when public.normalize_public_search(l.title) = i.q then 45
      when public.normalize_public_search(l.title) like '%' || i.q || '%' then 40
      when public.normalize_public_search(l.author) like '%' || i.q || '%' then 35
      else 30 end::double precision
  from public.library_items l cross join input i
  where l.is_verified
    and (theme_filter is null or l.themes @> array[theme_filter])
    and (
      public.normalize_public_search(coalesce(l.title, '') || ' ' || coalesce(l.subtitle, '') || ' ' || coalesce(l.author, '') || ' ' || coalesce(l.description, '') || ' ' || array_to_string(l.themes, ' ')) like '%' || i.q || '%'
      or public.normalize_public_search(l.item_type::text) like '%' || i.q || '%'
    )
), filtered as (
  select * from candidates
  where result_type_filter is null or result_type = result_type_filter
), counted as (
  select filtered.*, count(*) over () total_count from filtered
)
select * from counted
order by rank_score desc, title asc, id asc
limit least(greatest(result_limit, 1), 30)
offset greatest(result_offset, 0);
$$;
