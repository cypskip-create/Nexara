-- Durable automation retries, persisted workspace settings, and signed webhooks.
alter table public.automation_runs add column if not exists attempt integer not null default 1 check(attempt between 1 and 10);
alter table public.automation_runs add column if not exists max_attempts integer not null default 3 check(max_attempts between 1 and 10);
alter table public.automation_runs add column if not exists next_retry_at timestamptz;
alter table public.automation_runs add column if not exists retry_of uuid references public.automation_runs(id) on delete set null;
create index if not exists automation_runs_retry_idx on public.automation_runs(next_retry_at) where status='FAILED' and next_retry_at is not null;

create table public.webhook_endpoints(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  url text not null,
  events text[] not null default array['lead.created'],
  enabled boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id,url)
);
create table public.webhook_deliveries(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  endpoint_id uuid not null references public.webhook_endpoints(id) on delete cascade,
  event_type text not null,
  event_id uuid not null default gen_random_uuid(),
  status text not null check(status in('PENDING','SUCCEEDED','FAILED')),
  response_status integer,
  attempt integer not null default 1,
  error_code text,
  created_at timestamptz not null default now(),
  delivered_at timestamptz
);
create index webhook_deliveries_org_time_idx on public.webhook_deliveries(organization_id,created_at desc);
alter table public.webhook_endpoints enable row level security;
alter table public.webhook_deliveries enable row level security;
create policy webhook_endpoints_select on public.webhook_endpoints for select using(public.has_org_role(organization_id,array['OWNER','ADMIN']::public.member_role[]));
create policy webhook_deliveries_select on public.webhook_deliveries for select using(public.has_org_role(organization_id,array['OWNER','ADMIN']::public.member_role[]));
revoke all on public.webhook_endpoints,public.webhook_deliveries from anon,authenticated;
grant select on public.webhook_endpoints,public.webhook_deliveries to authenticated;

create or replace function public.update_organization_settings(target_org uuid,organization_name text,organization_industry text,organization_website text,organization_phone text,organization_country text,organization_timezone text)
returns public.organizations language plpgsql security definer set search_path=public as $$
declare updated public.organizations;
begin
  if not public.has_org_role(target_org,array['OWNER','ADMIN']::public.member_role[]) then raise exception 'forbidden'; end if;
  if length(trim(organization_name))<2 then raise exception 'organization name is required'; end if;
  update public.organizations set name=trim(organization_name),industry=nullif(trim(organization_industry),''),website=nullif(trim(organization_website),''),phone=nullif(trim(organization_phone),''),country=coalesce(nullif(trim(organization_country),''),'KE'),timezone=coalesce(nullif(trim(organization_timezone),''),'Africa/Nairobi'),updated_at=now() where id=target_org returning * into updated;
  insert into public.audit_events(organization_id,actor_id,event_type,entity_type,entity_id) values(target_org,auth.uid(),'organization_settings_updated','organization',target_org);
  return updated;
end $$;
revoke all on function public.update_organization_settings(uuid,text,text,text,text,text,text) from public;
grant execute on function public.update_organization_settings(uuid,text,text,text,text,text,text) to authenticated;

do $$ declare table_name text; begin
  foreach table_name in array array['webhook_endpoints','webhook_deliveries'] loop
    if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=table_name) then execute format('alter publication supabase_realtime add table public.%I',table_name); end if;
  end loop;
end $$;
