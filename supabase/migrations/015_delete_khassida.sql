create or replace function public.delete_khassida(
  p_khassida_id uuid,
  p_actor_id uuid,
  p_confirmation text
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  work public.khassidas;
  object_keys text[];
begin
  select * into work
  from public.khassidas
  where id = p_khassida_id
  for update;

  if not found then
    raise exception 'khassida not found' using errcode = 'P0002';
  end if;

  if work.title <> p_confirmation then
    raise exception 'confirmation mismatch' using errcode = '22023';
  end if;

  select coalesce(array_agg(distinct object_key), '{}') into object_keys
  from (
    select object_key
    from public.media_assets
    where khassida_id = p_khassida_id and provider = 'minio'
    union all
    select object_key
    from public.khassida_editions
    where khassida_id = p_khassida_id
    union all
    select object_key
    from public.pending_uploads
    where khassida_id = p_khassida_id
  ) objects
  where object_key is not null;

  delete from public.khassidas where id = p_khassida_id;

  insert into public.audit_log(actor_id, entity_type, entity_id, action, previous_data)
  values (p_actor_id, 'khassida', p_khassida_id, 'delete', to_jsonb(work));

  return jsonb_build_object(
    'id', p_khassida_id,
    'title', work.title,
    'object_keys', to_jsonb(object_keys)
  );
end;
$$;

revoke all on function public.delete_khassida(uuid, uuid, text) from public;
grant execute on function public.delete_khassida(uuid, uuid, text) to service_role;
