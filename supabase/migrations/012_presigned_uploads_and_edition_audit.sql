create table public.pending_uploads (
  id uuid primary key default gen_random_uuid(), actor_id uuid not null references public.profiles(id),
  khassida_id uuid not null references public.khassidas(id) on delete cascade,
  kind text not null check(kind in ('pdf','audio','cover','edition')), bucket text not null,
  object_key text not null unique, file_name text not null, content_type text not null, expected_size bigint not null,
  metadata jsonb not null default '{}', status text not null default 'pending' check(status in ('pending','completed','failed')),
  entity_id uuid, expires_at timestamptz not null, created_at timestamptz not null default now(), completed_at timestamptz
);
create index pending_uploads_cleanup_idx on public.pending_uploads(status, expires_at);
alter table public.pending_uploads enable row level security;

create or replace function public.finalize_media_upload(p_upload_id uuid, p_actor_id uuid)
returns uuid language plpgsql security invoker set search_path=public as $$
declare u public.pending_uploads; media public.media_assets;
begin
  select * into u from public.pending_uploads where id=p_upload_id for update;
  if not found or u.actor_id<>p_actor_id or u.kind='edition' then raise exception 'invalid upload' using errcode='42501'; end if;
  if u.status='completed' then return u.entity_id; end if;
  if u.status<>'pending' or u.expires_at<now() then raise exception 'expired upload' using errcode='22023'; end if;
  media:=public.replace_primary_media(u.khassida_id,u.kind,u.bucket,u.object_key,u.content_type,u.file_name,u.expected_size,p_actor_id);
  update public.pending_uploads set status='completed',entity_id=media.id,completed_at=now() where id=u.id;
  return media.id;
end $$;

create or replace function public.finalize_edition_upload(p_upload_id uuid, p_actor_id uuid)
returns uuid language plpgsql security invoker set search_path=public as $$
declare u public.pending_uploads; edition public.khassida_editions; requested_status public.validation_status;
begin
  select * into u from public.pending_uploads where id=p_upload_id for update;
  if not found or u.actor_id<>p_actor_id or u.kind<>'edition' then raise exception 'invalid upload' using errcode='42501'; end if;
  if u.status='completed' then return u.entity_id; end if;
  if u.status<>'pending' or u.expires_at<now() then raise exception 'expired upload' using errcode='22023'; end if;
  requested_status:=coalesce((u.metadata->>'validation_status')::public.validation_status,'review');
  insert into public.khassida_editions(khassida_id,language,edition_kind,title,translator,publisher,publication_year,page_count,source_name,bucket,object_key,mime_type,file_name,file_size,validation_status,created_by,validated_by)
  values(u.khassida_id,u.metadata->>'language',(u.metadata->>'edition_kind')::public.edition_kind,nullif(u.metadata->>'title',''),nullif(u.metadata->>'translator',''),nullif(u.metadata->>'publisher',''),(u.metadata->>'publication_year')::int,(u.metadata->>'page_count')::int,nullif(u.metadata->>'source_name',''),u.bucket,u.object_key,u.content_type,u.file_name,u.expected_size,requested_status,p_actor_id,case when requested_status='verified' then p_actor_id end)
  returning * into edition;
  insert into public.audit_log(actor_id,entity_type,entity_id,action,new_data) values(p_actor_id,'khassida_edition',edition.id,'create',to_jsonb(edition));
  update public.pending_uploads set status='completed',entity_id=edition.id,completed_at=now() where id=u.id;
  return edition.id;
end $$;

revoke all on function public.finalize_media_upload(uuid,uuid) from public;
revoke all on function public.finalize_edition_upload(uuid,uuid) from public;
grant execute on function public.finalize_media_upload(uuid,uuid) to service_role;
grant execute on function public.finalize_edition_upload(uuid,uuid) to service_role;

create or replace function public.review_edition(p_edition_id uuid, p_status public.validation_status, p_actor_id uuid)
returns public.khassida_editions language plpgsql security invoker set search_path=public as $$
declare previous public.khassida_editions; reviewed public.khassida_editions;
begin
  if p_status not in ('verified','disabled') then raise exception 'invalid review status' using errcode='22023'; end if;
  select * into previous from public.khassida_editions where id=p_edition_id for update;
  if not found then raise exception 'edition not found' using errcode='P0002'; end if;
  update public.khassida_editions set validation_status=p_status,
    validated_by=case when p_status='verified' then p_actor_id else null end, updated_at=now()
  where id=p_edition_id returning * into reviewed;
  insert into public.audit_log(actor_id,entity_type,entity_id,action,previous_data,new_data)
  values(p_actor_id,'khassida_edition',reviewed.id,case when p_status='verified' then 'validate' else 'reject' end,to_jsonb(previous),to_jsonb(reviewed));
  return reviewed;
end $$;

revoke all on function public.review_edition(uuid,public.validation_status,uuid) from public;
grant execute on function public.review_edition(uuid,public.validation_status,uuid) to service_role;

create table public.api_rate_limits (
  key text not null, window_start bigint not null, request_count integer not null,
  updated_at timestamptz not null default now(), primary key(key,window_start)
);
alter table public.api_rate_limits enable row level security;

create or replace function public.consume_rate_limit(p_key text,p_limit integer,p_window_seconds integer)
returns table(allowed boolean,remaining integer,retry_after integer)
language plpgsql security invoker set search_path=public as $$
declare current_window bigint; used integer;
begin
  if length(p_key)<1 or length(p_key)>200 or p_limit<1 or p_limit>1000 or p_window_seconds<1 or p_window_seconds>86400 then
    raise exception 'invalid rate limit parameters' using errcode='22023';
  end if;
  current_window:=floor(extract(epoch from clock_timestamp())/p_window_seconds)::bigint;
  insert into public.api_rate_limits(key,window_start,request_count) values(p_key,current_window,1)
  on conflict(key,window_start) do update set request_count=public.api_rate_limits.request_count+1,updated_at=now()
  returning request_count into used;
  return query select used<=p_limit,greatest(0,p_limit-used),
    greatest(1,(p_window_seconds-(extract(epoch from clock_timestamp())::bigint % p_window_seconds))::integer);
end $$;

revoke all on function public.consume_rate_limit(text,integer,integer) from public;
grant execute on function public.consume_rate_limit(text,integer,integer) to service_role;
