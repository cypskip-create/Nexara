-- Billing readiness, atomic contact identity, and public sales enquiries.

-- A non-destructive identity registry preserves historical duplicates while
-- guaranteeing that all future writes resolve email and phone atomically.
create table public.contact_identities(
  organization_id uuid not null references public.organizations(id) on delete cascade,
  identity_type text not null check(identity_type in('EMAIL','PHONE')),
  identity_value text not null,
  contact_id uuid not null,
  created_at timestamptz not null default now(),
  primary key(organization_id,identity_type,identity_value),
  foreign key(contact_id,organization_id) references public.contacts(id,organization_id) on delete cascade
);
alter table public.contact_identities enable row level security;
create policy contact_identities_select on public.contact_identities for select using(public.is_org_member(organization_id));
insert into public.contact_identities(organization_id,identity_type,identity_value,contact_id)
select distinct on(organization_id,lower(trim(email))) organization_id,'EMAIL',lower(trim(email)),id from public.contacts
where nullif(trim(email),'') is not null order by organization_id,lower(trim(email)),created_at,id on conflict do nothing;
insert into public.contact_identities(organization_id,identity_type,identity_value,contact_id)
select distinct on(organization_id,regexp_replace(phone,'\D','','g')) organization_id,'PHONE',regexp_replace(phone,'\D','','g'),id from public.contacts
where nullif(regexp_replace(phone,'\D','','g'),'') is not null order by organization_id,regexp_replace(phone,'\D','','g'),created_at,id on conflict do nothing;

create or replace function public.upsert_contact(
  target_org uuid, contact_name text, contact_email text default null, contact_phone text default null,
  contact_company text default null, contact_tags text[] default '{}'
) returns public.contacts language plpgsql security definer set search_path=public as $$
declare selected public.contacts; selected_id uuid; email_key text:=nullif(lower(trim(contact_email)),''); phone_key text:=nullif(regexp_replace(contact_phone,'\D','','g'),''); email_contact uuid; phone_contact uuid;
begin
  if not public.is_org_member(target_org) then raise exception 'forbidden'; end if;
  if nullif(trim(contact_name),'') is null then raise exception 'contact name is required'; end if;
  if email_key is not null then perform pg_advisory_xact_lock(hashtextextended(target_org::text||':EMAIL:'||email_key,0)); end if;
  if phone_key is not null then perform pg_advisory_xact_lock(hashtextextended(target_org::text||':PHONE:'||phone_key,0)); end if;
  select contact_id into email_contact from public.contact_identities where organization_id=target_org and identity_type='EMAIL' and identity_value=email_key;
  select contact_id into phone_contact from public.contact_identities where organization_id=target_org and identity_type='PHONE' and identity_value=phone_key;
  if email_contact is not null and phone_contact is not null and email_contact<>phone_contact then raise exception 'email and phone belong to different contacts'; end if;
  selected_id:=coalesce(email_contact,phone_contact);
  if selected_id is null then
    insert into public.contacts(organization_id,name,email,phone,company,tags)
    values(target_org,trim(contact_name),nullif(lower(trim(contact_email)),''),nullif(trim(contact_phone),''),nullif(trim(contact_company),''),coalesce(contact_tags,'{}')) returning * into selected;
  else
    select * into selected from public.contacts where id=selected_id and organization_id=target_org for update;
    update public.contacts set
      name=case when selected.name='' then trim(contact_name) else selected.name end,
      email=coalesce(selected.email,nullif(lower(trim(contact_email)),'')), phone=coalesce(selected.phone,nullif(trim(contact_phone),'')),
      company=coalesce(selected.company,nullif(trim(contact_company),'')), tags=coalesce((select array_agg(distinct value) from unnest(selected.tags||coalesce(contact_tags,'{}')) value),'{}'), updated_at=now()
    where id=selected.id returning * into selected;
  end if;
  if email_key is not null then insert into public.contact_identities values(target_org,'EMAIL',email_key,selected.id,now()) on conflict do nothing; end if;
  if phone_key is not null then insert into public.contact_identities values(target_org,'PHONE',phone_key,selected.id,now()) on conflict do nothing; end if;
  return selected;
end $$;

create or replace function public.update_contact(
  target_contact uuid,target_org uuid,contact_name text,contact_email text default null,contact_phone text default null,
  contact_company text default null,contact_tags text[] default '{}'
) returns public.contacts language plpgsql security definer set search_path=public as $$
declare changed public.contacts; email_key text:=nullif(lower(trim(contact_email)),''); phone_key text:=nullif(regexp_replace(contact_phone,'\D','','g'),''); conflict_id uuid;
begin
  if not public.is_org_member(target_org) then raise exception 'forbidden'; end if;
  if not exists(select 1 from public.contacts where id=target_contact and organization_id=target_org) then raise exception 'contact not found'; end if;
  if nullif(trim(contact_name),'') is null then raise exception 'contact name is required'; end if;
  if email_key is not null then perform pg_advisory_xact_lock(hashtextextended(target_org::text||':EMAIL:'||email_key,0));select contact_id into conflict_id from public.contact_identities where organization_id=target_org and identity_type='EMAIL' and identity_value=email_key;if conflict_id is not null and conflict_id<>target_contact then raise exception 'email already belongs to another contact';end if;end if;
  if phone_key is not null then perform pg_advisory_xact_lock(hashtextextended(target_org::text||':PHONE:'||phone_key,0));select contact_id into conflict_id from public.contact_identities where organization_id=target_org and identity_type='PHONE' and identity_value=phone_key;if conflict_id is not null and conflict_id<>target_contact then raise exception 'phone already belongs to another contact';end if;end if;
  delete from public.contact_identities where organization_id=target_org and contact_id=target_contact;
  update public.contacts set name=trim(contact_name),email=email_key,phone=nullif(trim(contact_phone),''),company=nullif(trim(contact_company),''),tags=coalesce(contact_tags,'{}'),updated_at=now() where id=target_contact and organization_id=target_org returning * into changed;
  if email_key is not null then insert into public.contact_identities values(target_org,'EMAIL',email_key,target_contact,now());end if;
  if phone_key is not null then insert into public.contact_identities values(target_org,'PHONE',phone_key,target_contact,now());end if;
  return changed;
end $$;

revoke all on function public.upsert_contact(uuid,text,text,text,text,text[]) from public;
grant execute on function public.upsert_contact(uuid,text,text,text,text,text[]) to authenticated;
revoke all on function public.update_contact(uuid,uuid,text,text,text,text,text[]) from public;
grant execute on function public.update_contact(uuid,uuid,text,text,text,text,text[]) to authenticated;
revoke insert,update,delete on public.contacts from authenticated;
grant select on public.contacts,public.contact_identities to authenticated;

create or replace function public.create_lead_with_contact(
  target_org uuid, contact_name text, contact_email text default null, contact_phone text default null,
  contact_company text default null, lead_interest text default null, lead_source text default 'Manual',
  lead_stage public.lead_stage default 'NEW', lead_score integer default 0, lead_value numeric default null,
  lead_owner uuid default null, lead_next_action text default null, lead_tags text[] default '{}', lead_qualification jsonb default '{}'
) returns public.leads language plpgsql security definer set search_path=public as $$
declare selected_contact public.contacts; created_lead public.leads;
begin
  if not public.is_org_member(target_org) then raise exception 'forbidden'; end if;
  if nullif(trim(contact_name),'') is null then raise exception 'contact name is required'; end if;
  if lead_owner is not null and lead_owner<>auth.uid() and not public.has_org_role(target_org,array['OWNER','ADMIN','MANAGER']::public.member_role[]) then raise exception 'cannot assign this owner'; end if;
  selected_contact:=public.upsert_contact(target_org,contact_name,contact_email,contact_phone,contact_company,lead_tags);
  insert into public.leads(organization_id,contact_id,owner_id,interest,source,stage,score,estimated_value,qualification,next_action)
  values(target_org,selected_contact.id,lead_owner,nullif(trim(lead_interest),''),nullif(trim(lead_source),''),lead_stage,lead_score,lead_value,coalesce(lead_qualification,'{}'),nullif(trim(lead_next_action),'')) returning * into created_lead;
  insert into public.lead_activities(organization_id,lead_id,actor_id,activity_type,body) values(target_org,created_lead.id,auth.uid(),'CREATED','Lead created');
  insert into public.audit_events(organization_id,actor_id,event_type,entity_type,entity_id) values(target_org,auth.uid(),'lead_created','lead',created_lead.id);
  insert into public.analytics_events(organization_id,event_name,actor_id,entity_type,entity_id) values(target_org,'lead_created',auth.uid(),'lead',created_lead.id);
  return created_lead;
end $$;

create table if not exists public.website_inquiries(
  id uuid primary key default gen_random_uuid(), inquiry_type text not null check(inquiry_type in('CONTACT','DEMO')),
  name text not null, email text not null, phone text, company text, interest text, message text not null,
  status text not null default 'NEW' check(status in('NEW','CONTACTED','QUALIFIED','CLOSED','SPAM')),
  source text not null default 'WEBSITE', ip_hash text, user_agent text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists website_inquiries_created_idx on public.website_inquiries(created_at desc);
create index if not exists website_inquiries_email_idx on public.website_inquiries(lower(email));
alter table public.website_inquiries enable row level security;
revoke all on public.website_inquiries from anon,authenticated;

create table if not exists public.stripe_events(
  id text primary key, event_type text not null, processed_at timestamptz not null default now()
);
alter table public.stripe_events enable row level security;
revoke all on public.stripe_events from anon,authenticated;

do $$ begin
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='subscriptions') then
    alter publication supabase_realtime add table public.subscriptions;
  end if;
end $$;
