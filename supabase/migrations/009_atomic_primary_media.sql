create or replace function public.replace_primary_media(
  p_khassida_id uuid,
  p_kind text,
  p_bucket text,
  p_object_key text,
  p_mime_type text,
  p_file_name text,
  p_file_size bigint,
  p_actor_id uuid
)
returns public.media_assets
language plpgsql
security invoker
set search_path = public
as $$
declare
  result public.media_assets;
begin
  if p_kind not in ('pdf', 'audio', 'cover') then
    raise exception 'invalid media kind' using errcode = '22023';
  end if;

  -- Serialize replacements for the same work and kind.
  perform pg_advisory_xact_lock(hashtextextended(p_khassida_id::text || ':' || p_kind, 0));

  update public.media_assets
  set is_primary = false
  where khassida_id = p_khassida_id and kind = p_kind and is_primary;

  insert into public.media_assets(
    khassida_id, kind, provider, bucket, object_key, mime_type,
    file_name, file_size, is_primary, created_by
  ) values (
    p_khassida_id, p_kind, 'minio', p_bucket, p_object_key, p_mime_type,
    p_file_name, p_file_size, true, p_actor_id
  ) returning * into result;

  insert into public.audit_log(actor_id, entity_type, entity_id, action, new_data)
  values (p_actor_id, 'media_asset', result.id, 'replace_primary', to_jsonb(result));

  return result;
end;
$$;

revoke all on function public.replace_primary_media(uuid, text, text, text, text, text, bigint, uuid) from public;
grant execute on function public.replace_primary_media(uuid, text, text, text, text, text, bigint, uuid) to service_role;
