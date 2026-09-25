-- Persistent inbox state and realtime publication for operational modules.
alter table public.messages add column if not exists sender_id uuid references public.profiles(id) on delete set null;

create table public.conversation_reads(
  organization_id uuid not null references public.organizations(id) on delete cascade,
  conversation_id uuid not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key(conversation_id,user_id),
  foreign key(conversation_id,organization_id) references public.conversations(id,organization_id) on delete cascade
);
alter table public.conversation_reads enable row level security;
create policy conversation_reads_select on public.conversation_reads for select using(user_id=auth.uid() and public.is_org_member(organization_id));
create policy conversation_reads_manage on public.conversation_reads for all using(user_id=auth.uid() and public.can_access_conversation(conversation_id,organization_id)) with check(user_id=auth.uid() and public.can_access_conversation(conversation_id,organization_id));

create or replace function public.create_conversation(target_org uuid,target_contact uuid,conversation_channel text default 'WEBSITE')
returns public.conversations language plpgsql security definer set search_path=public as $$
declare created public.conversations;
begin
  if not public.is_org_member(target_org) then raise exception 'forbidden'; end if;
  if conversation_channel not in('WEBSITE','WHATSAPP','EMAIL','API') then raise exception 'invalid channel'; end if;
  if target_contact is not null and not exists(select 1 from public.contacts where id=target_contact and organization_id=target_org) then raise exception 'contact not found'; end if;
  insert into public.conversations(organization_id,contact_id,channel,assigned_to,last_message_at)
  values(target_org,target_contact,conversation_channel,auth.uid(),now()) returning * into created;
  insert into public.audit_events(organization_id,actor_id,event_type,entity_type,entity_id) values(target_org,auth.uid(),'conversation_created','conversation',created.id);
  return created;
end $$;

create or replace function public.send_conversation_message(target_org uuid,target_conversation uuid,message_body text)
returns public.messages language plpgsql security definer set search_path=public as $$
declare created public.messages; related_lead uuid;
begin
  if not public.can_access_conversation(target_conversation,target_org) then raise exception 'forbidden'; end if;
  if nullif(trim(message_body),'') is null or length(trim(message_body))>10000 then raise exception 'message must contain 1 to 10000 characters'; end if;
  insert into public.messages(organization_id,conversation_id,sender_type,sender_id,body)
  values(target_org,target_conversation,'HUMAN',auth.uid(),trim(message_body)) returning * into created;
  update public.conversations set last_message_at=created.created_at,updated_at=now() where id=target_conversation and organization_id=target_org;
  select l.id into related_lead from public.conversations c join public.leads l on l.contact_id=c.contact_id and l.organization_id=c.organization_id and l.archived_at is null where c.id=target_conversation order by l.created_at desc limit 1;
  if related_lead is not null then insert into public.lead_activities(organization_id,lead_id,actor_id,activity_type,body,metadata) values(target_org,related_lead,auth.uid(),'MESSAGE','Message sent',jsonb_build_object('conversation_id',target_conversation,'message_id',created.id)); end if;
  return created;
end $$;

create or replace function public.mark_conversation_read(target_org uuid,target_conversation uuid)
returns timestamptz language plpgsql security definer set search_path=public as $$
declare read_time timestamptz:=now();
begin
  if not public.can_access_conversation(target_conversation,target_org) then raise exception 'forbidden'; end if;
  insert into public.conversation_reads(organization_id,conversation_id,user_id,last_read_at) values(target_org,target_conversation,auth.uid(),read_time)
  on conflict(conversation_id,user_id) do update set last_read_at=excluded.last_read_at;
  return read_time;
end $$;

revoke all on function public.create_conversation(uuid,uuid,text) from public;
revoke all on function public.send_conversation_message(uuid,uuid,text) from public;
revoke all on function public.mark_conversation_read(uuid,uuid) from public;
grant execute on function public.create_conversation(uuid,uuid,text) to authenticated;
grant execute on function public.send_conversation_message(uuid,uuid,text) to authenticated;
grant execute on function public.mark_conversation_read(uuid,uuid) to authenticated;
grant select on public.conversation_reads to authenticated;
revoke insert,update,delete on public.messages from authenticated;
grant select on public.messages to authenticated;
revoke insert,update,delete on public.conversations from authenticated;
grant select on public.conversations to authenticated;
grant update(status,assigned_to,updated_at) on public.conversations to authenticated;

insert into public.integrations(organization_id,provider,status,public_config)
select organization.id,provider.name,'SETUP_REQUIRED','{}'::jsonb from public.organizations organization cross join(values('WHATSAPP'),('WEBSITE'),('EMAIL'),('WEBHOOK')) provider(name)
on conflict(organization_id,provider) do nothing;

create or replace function public.seed_integration_records() returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.integrations(organization_id,provider,status) values(new.id,'WHATSAPP','SETUP_REQUIRED'),(new.id,'WEBSITE','SETUP_REQUIRED'),(new.id,'EMAIL','SETUP_REQUIRED'),(new.id,'WEBHOOK','SETUP_REQUIRED') on conflict do nothing;
  return new;
end $$;
drop trigger if exists seed_integrations_on_organization on public.organizations;
create trigger seed_integrations_on_organization after insert on public.organizations for each row execute function public.seed_integration_records();

do $$
declare table_name text;
begin
  foreach table_name in array array['conversations','messages','conversation_reads','knowledge_items','ai_configs','integrations'] loop
    if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=table_name) then
      execute format('alter publication supabase_realtime add table public.%I',table_name);
    end if;
  end loop;
end $$;
