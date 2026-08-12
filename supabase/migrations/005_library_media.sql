alter table public.library_items
  add column media_bucket text,
  add column media_object_key text,
  add column media_mime_type text,
  add column media_file_name text,
  add column media_file_size bigint;

alter table public.library_items
  add constraint library_media_complete check (
    (media_object_key is null and media_bucket is null)
    or
    (media_object_key is not null and media_bucket is not null and media_mime_type is not null and media_file_name is not null)
  );
