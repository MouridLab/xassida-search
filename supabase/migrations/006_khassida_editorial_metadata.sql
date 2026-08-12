alter table public.khassidas
  add column page_count integer,
  add column verse_count integer,
  add constraint khassidas_page_count_positive check (page_count is null or page_count > 0),
  add constraint khassidas_verse_count_positive check (verse_count is null or verse_count > 0);

alter table public.media_assets drop constraint media_assets_kind_check;
alter table public.media_assets
  add constraint media_assets_kind_check check (kind in ('pdf', 'audio', 'cover'));
