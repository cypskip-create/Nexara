-- Universal inbound lead sources and expanded conversation channels.
create extension if not exists pgcrypto;

create table public.lead_sources(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check(length(trim(name)) between 2 and 80),
  platform text not null check(length(trim(platform)) between 2 and 80),
  status text not null default 'ACTIVE' check(status in('ACTIVE','PAUSED')),
  secret_hash text not null,
  created_by uuid references public.profiles(id) on delete set null,
  last_received_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id,name)
);
create index lead_sources_org_status_idx on public.lead_sources(organization_id,status);
alter table public.lead_sources enable row level security;
create policy lead_sources_read on public.lead_sources for select using(public.is_org_member(organization_id));
create policy lead_sources_manage on public.lead_sources for all using(public.has_org_role(organization_id,array['OWNER','ADMIN']::public.member_role[])) with check(public.has_org_role(organization_id,array['OWNER','ADMIN']::public.member_role[]));
grant select,update,delete on public.lead_sources to authenticated;

create or replace function public.create_lead_source(target_org uuid,source_name text,source_platform text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare token text; created public.lead_sources;
begin
  if not public.has_org_role(target_org,array['OWNER','ADMIN']::public.member_role[]) then raise exception 'forbidden'; end if;
  if length(trim(source_name)) not between 2 and 80 or length(trim(source_platform)) not between 2 and 80 then raise exception 'invalid source'; end if;
  token:=encode(gen_random_bytes(24),'hex');
  insert into public.lead_sources(organization_id,name,platform,secret_hash,created_by) values(target_org,trim(source_name),trim(source_platform),encode(digest(token,'sha256'),'hex'),auth.uid()) returning * into created;
  insert into public.audit_events(organization_id,actor_id,event_type,entity_type,entity_id,metadata) values(target_org,auth.uid(),'lead_source_created','lead_source',created.id,jsonb_build_object('platform',created.platform));
  return jsonb_build_object('source',to_jsonb(created)-'secret_hash','token',token);
end $$;
revoke all on function public.create_lead_source(uuid,text,text) from public;
grant execute on function public.create_lead_source(uuid,text,text) to authenticated;

create or replace function public.rotate_lead_source_key(target_org uuid,target_source uuid)
returns text language plpgsql security definer set search_path=public as $$
declare token text;
begin
  if not public.has_org_role(target_org,array['OWNER','ADMIN']::public.member_role[]) then raise exception 'forbidden'; end if;
  token:=encode(gen_random_bytes(24),'hex');
  update public.lead_sources set secret_hash=encode(digest(token,'sha256'),'hex'),updated_at=now() where id=target_source and organization_id=target_org;
  if not found then raise exception 'source not found'; end if;
  insert into public.audit_events(organization_id,actor_id,event_type,entity_type,entity_id) values(target_org,auth.uid(),'lead_source_key_rotated','lead_source',target_source);
  return token;
end $$;
revoke all on function public.rotate_lead_source_key(uuid,uuid) from public;
grant execute on function public.rotate_lead_source_key(uuid,uuid) to authenticated;

alter table public.conversations drop constraint if exists conversations_channel_check;
alter table public.conversations add constraint conversations_channel_check check(channel in('WEBSITE','WHATSAPP','EMAIL','PHONE','SMS','INSTAGRAM','FACEBOOK','MESSENGER','LINKEDIN','TIKTOK','TELEGRAM','MARKETPLACE','API','OTHER'));
create or replace function public.create_conversation(target_org uuid,target_contact uuid,conversation_channel text default 'WEBSITE')
returns public.conversations language plpgsql security definer set search_path=public as $$
declare created public.conversations;
begin
  if not public.is_org_member(target_org) then raise exception 'forbidden'; end if;
  if conversation_channel not in('WEBSITE','WHATSAPP','EMAIL','PHONE','SMS','INSTAGRAM','FACEBOOK','MESSENGER','LINKEDIN','TIKTOK','TELEGRAM','MARKETPLACE','API','OTHER') then raise exception 'invalid channel'; end if;
  if target_contact is not null and not exists(select 1 from public.contacts where id=target_contact and organization_id=target_org) then raise exception 'contact not found'; end if;
  insert into public.conversations(organization_id,contact_id,channel,assigned_to,last_message_at) values(target_org,target_contact,conversation_channel,auth.uid(),now()) returning * into created;
  return created;
end $$;
revoke all on function public.create_conversation(uuid,uuid,text) from public;
grant execute on function public.create_conversation(uuid,uuid,text) to authenticated;

do $$ begin
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='lead_sources') then alter publication supabase_realtime add table public.lead_sources; end if;
end $$;
