alter table public.pending_uploads
  add constraint pending_uploads_expected_size_positive check (expected_size > 0),
  add constraint pending_uploads_file_name_not_blank check (length(btrim(file_name)) > 0),
  add constraint pending_uploads_content_type_not_blank check (length(btrim(content_type)) > 0),
  add constraint pending_uploads_bucket_not_blank check (length(btrim(bucket)) > 0),
  add constraint pending_uploads_expiry_after_creation check (expires_at > created_at),
  add constraint pending_uploads_completion_consistent check (
    (status = 'completed' and entity_id is not null and completed_at is not null)
    or (status <> 'completed' and entity_id is null and completed_at is null)
  );

alter table public.api_rate_limits
  add constraint api_rate_limits_request_count_positive check (request_count > 0);

create index api_rate_limits_updated_at_idx on public.api_rate_limits(updated_at);

create or replace function public.consume_rate_limit(p_key text,p_limit integer,p_window_seconds integer)
returns table(allowed boolean,remaining integer,retry_after integer)
language plpgsql security invoker set search_path=public as $$
declare current_window bigint; used integer;
begin
  if length(p_key)<1 or length(p_key)>200 or p_limit<1 or p_limit>1000 or p_window_seconds<1 or p_window_seconds>86400 then
    raise exception 'invalid rate limit parameters' using errcode='22023';
  end if;

  -- Bound persistent state without requiring a scheduler. The service-role-only
  -- RPC may safely remove windows that can no longer affect any allowed limit.
  delete from public.api_rate_limits
  where updated_at < clock_timestamp() - interval '2 days';

  current_window:=floor(extract(epoch from clock_timestamp())/p_window_seconds)::bigint;
  insert into public.api_rate_limits(key,window_start,request_count) values(p_key,current_window,1)
  on conflict(key,window_start) do update set request_count=public.api_rate_limits.request_count+1,updated_at=now()
  returning request_count into used;
  return query select used<=p_limit,greatest(0,p_limit-used),
    greatest(1,(p_window_seconds-(extract(epoch from clock_timestamp())::bigint % p_window_seconds))::integer);
end $$;

revoke all on function public.consume_rate_limit(text,integer,integer) from public;
grant execute on function public.consume_rate_limit(text,integer,integer) to service_role;
