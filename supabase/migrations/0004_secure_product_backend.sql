-- Production backend foundation: tenant-safe relationships, role-aware RLS,
-- operational entities and transactional CRM commands.

alter table public.organizations
  add column if not exists onboarding_step integer not null default 1 check (onboarding_step between 1 and 7),
  add column if not exists onboarding_completed_at timestamptz;

alter table public.leads
  add column if not exists next_action text,
  add column if not exists archived_at timestamptz;

alter table public.contacts add constraint contacts_id_organization_unique unique (id, organization_id);
alter table public.conversations add constraint conversations_id_organization_unique unique (id, organization_id);
alter table public.automations add constraint automations_id_organization_unique unique (id, organization_id);
alter table public.leads add constraint leads_id_organization_unique unique (id, organization_id);

alter table public.leads
  add constraint leads_contact_same_organization
  foreign key (contact_id, organization_id) references public.contacts(id, organization_id);
alter table public.leads
  add constraint leads_owner_is_member
  foreign key (organization_id, owner_id) references public.organization_members(organization_id, user_id);
alter table public.conversations
  add constraint conversations_contact_same_organization
  foreign key (contact_id, organization_id) references public.contacts(id, organization_id);
alter table public.conversations
  add constraint conversations_assignee_is_member
  foreign key (organization_id, assigned_to) references public.organization_members(organization_id, user_id);
alter table public.messages
  add constraint messages_conversation_same_organization
  foreign key (conversation_id, organization_id) references public.conversations(id, organization_id);
alter table public.automation_steps
  add constraint automation_steps_parent_same_organization
  foreign key (automation_id, organization_id) references public.automations(id, organization_id);

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  role public.member_role not null default 'AGENT',
  token_hash text not null unique,
  invited_by uuid not null references public.profiles(id) on delete cascade,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  check (email = lower(trim(email)))
);

create table public.lead_activities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  activity_type text not null check (activity_type in ('CREATED','NOTE','STAGE_CHANGED','ASSIGNED','FOLLOW_UP','AUTOMATION','MESSAGE','ARCHIVED')),
  body text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete cascade,
  assigned_to uuid references public.profiles(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  title text not null,
  description text,
  status text not null default 'OPEN' check (status in ('OPEN','COMPLETED','CANCELLED')),
  due_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (organization_id, assigned_to) references public.organization_members(organization_id, user_id)
);

create table public.ai_configs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organizations(id) on delete cascade,
  assistant_name text not null default 'Nexara Assistant',
  role_description text not null default 'Customer enquiry assistant',
  welcome_message text,
  tone text not null default 'PROFESSIONAL' check (tone in ('PROFESSIONAL','FRIENDLY','CONCISE','CUSTOM')),
  custom_instructions text,
  qualification_fields text[] not null default '{}',
  escalation_rules jsonb not null default '[]',
  business_hours jsonb not null default '{}',
  enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.automation_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  automation_id uuid not null references public.automations(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete set null,
  status text not null check (status in ('RUNNING','SUCCEEDED','FAILED','SKIPPED')),
  trigger_event text not null,
  input jsonb not null default '{}',
  output jsonb not null default '{}',
  error_code text,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  foreign key (automation_id, organization_id) references public.automations(id, organization_id)
);

create table public.integrations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider text not null check (provider in ('WHATSAPP','WEBSITE','EMAIL','WEBHOOK')),
  status text not null default 'SETUP_REQUIRED' check (status in ('SETUP_REQUIRED','CONNECTED','ERROR','DISABLED')),
  public_config jsonb not null default '{}',
  secret_reference text,
  last_error_code text,
  connected_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, provider)
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organizations(id) on delete cascade,
  plan text not null default 'STARTER' check (plan in ('STARTER','GROWTH','PRO')),
  status text not null default 'TRIALING' check (status in ('TRIALING','ACTIVE','PAST_DUE','CANCELLED','INCOMPLETE')),
  billing_interval text not null default 'MONTHLY' check (billing_interval in ('MONTHLY','YEARLY')),
  provider text,
  provider_customer_id text,
  provider_subscription_id text,
  trial_ends_at timestamptz,
  current_period_ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.analytics_events (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  event_name text not null check (event_name in ('lead_created','lead_qualified','lead_assigned','lead_stage_changed','conversation_started','human_takeover','automation_triggered','automation_failed','lead_won','lead_lost')),
  actor_id uuid references public.profiles(id) on delete set null,
  entity_type text,
  entity_id uuid,
  properties jsonb not null default '{}',
  occurred_at timestamptz not null default now()
);

alter table public.lead_activities
  add constraint lead_activities_parent_same_organization
  foreign key (lead_id, organization_id) references public.leads(id, organization_id);
alter table public.tasks
  add constraint tasks_lead_same_organization
  foreign key (lead_id, organization_id) references public.leads(id, organization_id);
alter table public.automation_runs
  add constraint automation_runs_lead_same_organization
  foreign key (lead_id, organization_id) references public.leads(id, organization_id);

create index invitations_org_email_idx on public.invitations(organization_id, email);
create index lead_activities_lead_created_idx on public.lead_activities(lead_id, created_at desc);
create index tasks_org_due_idx on public.tasks(organization_id, status, due_at);
create index automation_runs_org_started_idx on public.automation_runs(organization_id, started_at desc);
create index analytics_events_org_name_time_idx on public.analytics_events(organization_id, event_name, occurred_at desc);
create index contacts_org_email_lookup_idx on public.contacts(organization_id, lower(email)) where email is not null;
create index contacts_org_phone_lookup_idx on public.contacts(organization_id, phone) where phone is not null;
create index leads_org_owner_stage_idx on public.leads(organization_id, owner_id, stage) where archived_at is null;

create or replace function public.has_org_role(target_org uuid, allowed_roles public.member_role[])
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.organization_members
    where organization_id = target_org and user_id = auth.uid() and role = any(allowed_roles)
  );
$$;

create or replace function public.can_access_owned_record(target_org uuid, record_owner uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_org_role(target_org, array['OWNER','ADMIN','MANAGER']::public.member_role[])
    or (public.is_org_member(target_org) and (record_owner is null or record_owner = auth.uid()));
$$;

create or replace function public.can_access_conversation(target_conversation uuid, target_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.conversations c
    where c.id = target_conversation and c.organization_id = target_org
      and public.can_access_owned_record(c.organization_id, c.assigned_to)
  );
$$;

revoke all on function public.has_org_role(uuid, public.member_role[]) from public;
revoke all on function public.can_access_owned_record(uuid, uuid) from public;
revoke all on function public.can_access_conversation(uuid, uuid) from public;
grant execute on function public.has_org_role(uuid, public.member_role[]) to authenticated;
grant execute on function public.can_access_owned_record(uuid, uuid) to authenticated;
grant execute on function public.can_access_conversation(uuid, uuid) to authenticated;

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end;
$$;

create or replace function public.prevent_organization_change()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.organization_id <> old.organization_id then raise exception 'organization_id is immutable'; end if;
  return new;
end;
$$;

create or replace function public.protect_owner_membership()
returns trigger language plpgsql security definer set search_path = public as $$
declare target_org uuid;
begin
  target_org := case when tg_op = 'DELETE' then old.organization_id else new.organization_id end;
  if (tg_op = 'DELETE' and old.role = 'OWNER') or (tg_op = 'UPDATE' and (old.role = 'OWNER' or new.role = 'OWNER')) then
    if not public.has_org_role(target_org, array['OWNER']::public.member_role[]) then raise exception 'only an owner can change owner membership'; end if;
  end if;
  if ((tg_op = 'DELETE' and old.role = 'OWNER') or (tg_op = 'UPDATE' and old.role = 'OWNER' and new.role <> 'OWNER'))
     and (select count(*) from public.organization_members where organization_id = target_org and role = 'OWNER') <= 1 then
    raise exception 'organization must retain at least one owner';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists protect_owner_membership on public.organization_members;
create trigger protect_owner_membership before update or delete on public.organization_members
for each row execute function public.protect_owner_membership();

do $$
declare table_name text;
begin
  foreach table_name in array array['organizations','profiles','contacts','leads','conversations','knowledge_items','automations','tasks','ai_configs','integrations','subscriptions']
  loop
    execute format('drop trigger if exists set_%I_updated_at on public.%I', table_name, table_name);
    execute format('create trigger set_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()', table_name, table_name);
  end loop;
  foreach table_name in array array['contacts','leads','pipeline_stages','conversations','messages','knowledge_items','automations','automation_steps','notifications','audit_events','invitations','lead_activities','tasks','ai_configs','automation_runs','integrations','subscriptions','analytics_events']
  loop
    execute format('drop trigger if exists prevent_%I_org_change on public.%I', table_name, table_name);
    execute format('create trigger prevent_%I_org_change before update on public.%I for each row execute function public.prevent_organization_change()', table_name, table_name);
  end loop;
end $$;

alter table public.invitations enable row level security;
alter table public.lead_activities enable row level security;
alter table public.tasks enable row level security;
alter table public.ai_configs enable row level security;
alter table public.automation_runs enable row level security;
alter table public.integrations enable row level security;
alter table public.subscriptions enable row level security;
alter table public.analytics_events enable row level security;

drop policy if exists "members can read their organizations" on public.organizations;
drop policy if exists "members can read memberships" on public.organization_members;
drop policy if exists "members can manage contacts" on public.contacts;
drop policy if exists "members can manage leads" on public.leads;
drop policy if exists "members can manage pipeline stages" on public.pipeline_stages;
drop policy if exists "members can manage conversations" on public.conversations;
drop policy if exists "members can manage messages" on public.messages;
drop policy if exists "members can manage knowledge" on public.knowledge_items;
drop policy if exists "members can manage automations" on public.automations;
drop policy if exists "members can manage automation steps" on public.automation_steps;
drop policy if exists "members can read own notifications" on public.notifications;
drop policy if exists "members can update own notifications" on public.notifications;
drop policy if exists "members can read audit events" on public.audit_events;

create policy organizations_select on public.organizations for select using (public.is_org_member(id));
create policy organizations_update on public.organizations for update
  using (public.has_org_role(id, array['OWNER','ADMIN']::public.member_role[]))
  with check (public.has_org_role(id, array['OWNER','ADMIN']::public.member_role[]));

create policy members_select on public.organization_members for select using (public.is_org_member(organization_id));
create policy members_insert on public.organization_members for insert
  with check (public.has_org_role(organization_id, array['OWNER','ADMIN']::public.member_role[]));
create policy members_update on public.organization_members for update
  using (public.has_org_role(organization_id, array['OWNER','ADMIN']::public.member_role[]))
  with check (public.has_org_role(organization_id, array['OWNER','ADMIN']::public.member_role[]));
create policy members_delete on public.organization_members for delete
  using (public.has_org_role(organization_id, array['OWNER','ADMIN']::public.member_role[]) and user_id <> auth.uid());

create policy contacts_select on public.contacts for select using (public.is_org_member(organization_id));
create policy contacts_insert on public.contacts for insert with check (public.is_org_member(organization_id));
create policy contacts_update on public.contacts for update using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
create policy contacts_delete on public.contacts for delete using (public.has_org_role(organization_id, array['OWNER','ADMIN','MANAGER']::public.member_role[]));

create policy leads_select on public.leads for select using (public.can_access_owned_record(organization_id, owner_id));
create policy leads_insert on public.leads for insert with check (
  public.is_org_member(organization_id) and (owner_id is null or owner_id = auth.uid() or public.has_org_role(organization_id, array['OWNER','ADMIN','MANAGER']::public.member_role[]))
);
create policy leads_update on public.leads for update
  using (public.can_access_owned_record(organization_id, owner_id))
  with check (public.can_access_owned_record(organization_id, owner_id));
create policy leads_delete on public.leads for delete using (public.has_org_role(organization_id, array['OWNER','ADMIN']::public.member_role[]));

create policy pipeline_select on public.pipeline_stages for select using (public.is_org_member(organization_id));
create policy pipeline_manage on public.pipeline_stages for all
  using (public.has_org_role(organization_id, array['OWNER','ADMIN']::public.member_role[]))
  with check (public.has_org_role(organization_id, array['OWNER','ADMIN']::public.member_role[]));

create policy conversations_select on public.conversations for select using (public.can_access_owned_record(organization_id, assigned_to));
create policy conversations_insert on public.conversations for insert with check (public.is_org_member(organization_id));
create policy conversations_update on public.conversations for update
  using (public.can_access_owned_record(organization_id, assigned_to))
  with check (public.can_access_owned_record(organization_id, assigned_to));
create policy messages_select on public.messages for select using (public.can_access_conversation(conversation_id, organization_id));
create policy messages_insert on public.messages for insert with check (public.can_access_conversation(conversation_id, organization_id));

create policy knowledge_select on public.knowledge_items for select using (public.is_org_member(organization_id));
create policy knowledge_manage on public.knowledge_items for all
  using (public.has_org_role(organization_id, array['OWNER','ADMIN','MANAGER']::public.member_role[]))
  with check (public.has_org_role(organization_id, array['OWNER','ADMIN','MANAGER']::public.member_role[]));
create policy automations_select on public.automations for select using (public.is_org_member(organization_id));
create policy automations_manage on public.automations for all
  using (public.has_org_role(organization_id, array['OWNER','ADMIN','MANAGER']::public.member_role[]))
  with check (public.has_org_role(organization_id, array['OWNER','ADMIN','MANAGER']::public.member_role[]));
create policy automation_steps_select on public.automation_steps for select using (public.is_org_member(organization_id));
create policy automation_steps_manage on public.automation_steps for all
  using (public.has_org_role(organization_id, array['OWNER','ADMIN','MANAGER']::public.member_role[]))
  with check (public.has_org_role(organization_id, array['OWNER','ADMIN','MANAGER']::public.member_role[]));

create policy notifications_select on public.notifications for select using (user_id = auth.uid() and public.is_org_member(organization_id));
create policy notifications_update on public.notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy audit_select on public.audit_events for select using (public.has_org_role(organization_id, array['OWNER','ADMIN','MANAGER']::public.member_role[]));

create policy invitations_select on public.invitations for select using (public.has_org_role(organization_id, array['OWNER','ADMIN']::public.member_role[]));
create policy invitations_manage on public.invitations for all
  using (public.has_org_role(organization_id, array['OWNER','ADMIN']::public.member_role[]))
  with check (public.has_org_role(organization_id, array['OWNER','ADMIN']::public.member_role[]) and invited_by = auth.uid());
create policy activities_select on public.lead_activities for select using (public.is_org_member(organization_id));
create policy activities_insert on public.lead_activities for insert with check (public.is_org_member(organization_id) and actor_id = auth.uid());
create policy tasks_select on public.tasks for select using (public.can_access_owned_record(organization_id, assigned_to));
create policy tasks_insert on public.tasks for insert with check (public.is_org_member(organization_id) and created_by = auth.uid());
create policy tasks_update on public.tasks for update using (public.can_access_owned_record(organization_id, assigned_to)) with check (public.can_access_owned_record(organization_id, assigned_to));
create policy ai_config_select on public.ai_configs for select using (public.is_org_member(organization_id));
create policy ai_config_manage on public.ai_configs for all
  using (public.has_org_role(organization_id, array['OWNER','ADMIN']::public.member_role[]))
  with check (public.has_org_role(organization_id, array['OWNER','ADMIN']::public.member_role[]));
create policy automation_runs_select on public.automation_runs for select using (public.is_org_member(organization_id));
create policy integrations_select on public.integrations for select using (public.is_org_member(organization_id));
create policy integrations_manage on public.integrations for all
  using (public.has_org_role(organization_id, array['OWNER','ADMIN']::public.member_role[]))
  with check (public.has_org_role(organization_id, array['OWNER','ADMIN']::public.member_role[]));
create policy subscriptions_select on public.subscriptions for select using (public.has_org_role(organization_id, array['OWNER','ADMIN']::public.member_role[]));
create policy analytics_select on public.analytics_events for select using (public.has_org_role(organization_id, array['OWNER','ADMIN','MANAGER']::public.member_role[]));

create or replace function public.create_organization(org_name text)
returns uuid language plpgsql security definer set search_path = public as $$
declare new_org uuid;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if nullif(trim(org_name), '') is null then raise exception 'organization name is required'; end if;
  insert into public.organizations (name) values (trim(org_name)) returning id into new_org;
  insert into public.organization_members (organization_id, user_id, role) values (new_org, auth.uid(), 'OWNER');
  insert into public.pipeline_stages (organization_id, name, position, color) values
    (new_org,'New',0,'#7c83fd'), (new_org,'Qualified',1,'#7257e9'), (new_org,'Contacted',2,'#4d8cf5'),
    (new_org,'Meeting',3,'#f3a63b'), (new_org,'Negotiation',4,'#e47738'), (new_org,'Won',5,'#2dac7c'), (new_org,'Lost',6,'#9aa3b2');
  insert into public.ai_configs (organization_id) values (new_org);
  insert into public.subscriptions (organization_id, trial_ends_at) values (new_org, now() + interval '14 days');
  return new_org;
end;
$$;

create or replace function public.create_lead_with_contact(
  target_org uuid, contact_name text, contact_email text default null, contact_phone text default null,
  contact_company text default null, lead_interest text default null, lead_source text default 'Manual',
  lead_stage public.lead_stage default 'NEW', lead_score integer default 0, lead_value numeric default null,
  lead_owner uuid default null, lead_next_action text default null, lead_tags text[] default '{}',
  lead_qualification jsonb default '{}'
) returns public.leads language plpgsql security definer set search_path = public as $$
declare selected_contact public.contacts; created_lead public.leads;
begin
  if not public.is_org_member(target_org) then raise exception 'forbidden'; end if;
  if nullif(trim(contact_name), '') is null then raise exception 'contact name is required'; end if;
  if lead_owner is not null and lead_owner <> auth.uid() and not public.has_org_role(target_org, array['OWNER','ADMIN','MANAGER']::public.member_role[]) then raise exception 'cannot assign this owner'; end if;
  select * into selected_contact from public.contacts
    where organization_id = target_org and (
      (contact_email is not null and lower(email) = lower(trim(contact_email))) or
      (contact_phone is not null and phone = trim(contact_phone))
    ) order by created_at limit 1;
  if selected_contact.id is null then
    insert into public.contacts (organization_id, name, email, phone, company, tags)
    values (target_org, trim(contact_name), nullif(lower(trim(contact_email)),''), nullif(trim(contact_phone),''), nullif(trim(contact_company),''), coalesce(lead_tags,'{}'))
    returning * into selected_contact;
  end if;
  insert into public.leads (organization_id, contact_id, owner_id, interest, source, stage, score, estimated_value, qualification, next_action)
  values (target_org, selected_contact.id, lead_owner, nullif(trim(lead_interest),''), nullif(trim(lead_source),''), lead_stage, lead_score, lead_value, coalesce(lead_qualification,'{}'), nullif(trim(lead_next_action),''))
  returning * into created_lead;
  insert into public.lead_activities (organization_id, lead_id, actor_id, activity_type, body) values (target_org, created_lead.id, auth.uid(), 'CREATED', 'Lead created');
  insert into public.audit_events (organization_id, actor_id, event_type, entity_type, entity_id) values (target_org, auth.uid(), 'lead_created', 'lead', created_lead.id);
  insert into public.analytics_events (organization_id, event_name, actor_id, entity_type, entity_id) values (target_org, 'lead_created', auth.uid(), 'lead', created_lead.id);
  return created_lead;
end;
$$;

create or replace function public.transition_lead(target_lead uuid, target_org uuid, next_stage public.lead_stage)
returns public.leads language plpgsql security definer set search_path = public as $$
declare current_lead public.leads; changed_lead public.leads; event_name text;
begin
  select * into current_lead from public.leads where id = target_lead and organization_id = target_org;
  if current_lead.id is null or not public.can_access_owned_record(target_org, current_lead.owner_id) then raise exception 'lead not found or forbidden'; end if;
  update public.leads set stage = next_stage, updated_at = now() where id = target_lead and organization_id = target_org returning * into changed_lead;
  insert into public.lead_activities (organization_id, lead_id, actor_id, activity_type, body, metadata)
    values (target_org, target_lead, auth.uid(), 'STAGE_CHANGED', 'Stage changed', jsonb_build_object('from', current_lead.stage, 'to', next_stage));
  insert into public.audit_events (organization_id, actor_id, event_type, entity_type, entity_id, metadata)
    values (target_org, auth.uid(), 'lead_stage_changed', 'lead', target_lead, jsonb_build_object('from', current_lead.stage, 'to', next_stage));
  event_name := case next_stage when 'WON' then 'lead_won' when 'LOST' then 'lead_lost' when 'QUALIFIED' then 'lead_qualified' else 'lead_stage_changed' end;
  insert into public.analytics_events (organization_id, event_name, actor_id, entity_type, entity_id, properties)
    values (target_org, event_name, auth.uid(), 'lead', target_lead, jsonb_build_object('from', current_lead.stage, 'to', next_stage));
  return changed_lead;
end;
$$;

create or replace function public.assign_lead(target_lead uuid, target_org uuid, next_owner uuid)
returns public.leads language plpgsql security definer set search_path = public as $$
declare current_lead public.leads; changed_lead public.leads;
begin
  select * into current_lead from public.leads where id = target_lead and organization_id = target_org;
  if current_lead.id is null or not public.can_access_owned_record(target_org, current_lead.owner_id) then raise exception 'lead not found or forbidden'; end if;
  if next_owner is not null and not exists (select 1 from public.organization_members where organization_id = target_org and user_id = next_owner) then raise exception 'owner must be an organization member'; end if;
  if next_owner is distinct from auth.uid() and not public.has_org_role(target_org, array['OWNER','ADMIN','MANAGER']::public.member_role[]) then raise exception 'cannot assign another owner'; end if;
  update public.leads set owner_id = next_owner, updated_at = now() where id = target_lead and organization_id = target_org returning * into changed_lead;
  insert into public.lead_activities (organization_id, lead_id, actor_id, activity_type, body, metadata)
    values (target_org, target_lead, auth.uid(), 'ASSIGNED', 'Lead owner changed', jsonb_build_object('from', current_lead.owner_id, 'to', next_owner));
  insert into public.audit_events (organization_id, actor_id, event_type, entity_type, entity_id, metadata)
    values (target_org, auth.uid(), 'lead_assigned', 'lead', target_lead, jsonb_build_object('from', current_lead.owner_id, 'to', next_owner));
  insert into public.analytics_events (organization_id, event_name, actor_id, entity_type, entity_id, properties)
    values (target_org, 'lead_assigned', auth.uid(), 'lead', target_lead, jsonb_build_object('owner_id', next_owner));
  return changed_lead;
end;
$$;

create or replace function public.add_lead_note(target_lead uuid, target_org uuid, note_body text)
returns public.lead_activities language plpgsql security definer set search_path = public as $$
declare current_lead public.leads; activity public.lead_activities;
begin
  select * into current_lead from public.leads where id = target_lead and organization_id = target_org;
  if current_lead.id is null or not public.can_access_owned_record(target_org, current_lead.owner_id) then raise exception 'lead not found or forbidden'; end if;
  if nullif(trim(note_body), '') is null then raise exception 'note is required'; end if;
  insert into public.lead_activities (organization_id, lead_id, actor_id, activity_type, body)
    values (target_org, target_lead, auth.uid(), 'NOTE', trim(note_body)) returning * into activity;
  update public.leads set updated_at = now() where id = target_lead and organization_id = target_org;
  return activity;
end;
$$;

create or replace function public.schedule_lead_follow_up(target_lead uuid, target_org uuid, task_title text, task_due_at timestamptz, task_assignee uuid default null)
returns public.tasks language plpgsql security definer set search_path = public as $$
declare current_lead public.leads; created_task public.tasks; selected_assignee uuid := coalesce(task_assignee, auth.uid());
begin
  select * into current_lead from public.leads where id = target_lead and organization_id = target_org;
  if current_lead.id is null or not public.can_access_owned_record(target_org, current_lead.owner_id) then raise exception 'lead not found or forbidden'; end if;
  if task_due_at <= now() then raise exception 'follow-up must be in the future'; end if;
  if not exists (select 1 from public.organization_members where organization_id = target_org and user_id = selected_assignee) then raise exception 'assignee must be an organization member'; end if;
  if selected_assignee <> auth.uid() and not public.has_org_role(target_org, array['OWNER','ADMIN','MANAGER']::public.member_role[]) then raise exception 'cannot assign another user'; end if;
  insert into public.tasks (organization_id, lead_id, assigned_to, created_by, title, due_at)
    values (target_org, target_lead, selected_assignee, auth.uid(), coalesce(nullif(trim(task_title),''),'Lead follow-up'), task_due_at) returning * into created_task;
  insert into public.lead_activities (organization_id, lead_id, actor_id, activity_type, body, metadata)
    values (target_org, target_lead, auth.uid(), 'FOLLOW_UP', created_task.title, jsonb_build_object('task_id', created_task.id, 'due_at', task_due_at));
  return created_task;
end;
$$;

create or replace function public.archive_lead(target_lead uuid, target_org uuid)
returns public.leads language plpgsql security definer set search_path = public as $$
declare current_lead public.leads; changed_lead public.leads;
begin
  select * into current_lead from public.leads where id = target_lead and organization_id = target_org;
  if current_lead.id is null or not public.can_access_owned_record(target_org, current_lead.owner_id) then raise exception 'lead not found or forbidden'; end if;
  update public.leads set archived_at = now(), updated_at = now() where id = target_lead and organization_id = target_org returning * into changed_lead;
  insert into public.lead_activities (organization_id, lead_id, actor_id, activity_type, body) values (target_org, target_lead, auth.uid(), 'ARCHIVED', 'Lead archived');
  insert into public.audit_events (organization_id, actor_id, event_type, entity_type, entity_id) values (target_org, auth.uid(), 'lead_archived', 'lead', target_lead);
  return changed_lead;
end;
$$;

revoke all on function public.create_lead_with_contact(uuid,text,text,text,text,text,text,public.lead_stage,integer,numeric,uuid,text,text[],jsonb) from public;
revoke all on function public.transition_lead(uuid,uuid,public.lead_stage) from public;
revoke all on function public.assign_lead(uuid,uuid,uuid) from public;
revoke all on function public.add_lead_note(uuid,uuid,text) from public;
revoke all on function public.schedule_lead_follow_up(uuid,uuid,text,timestamptz,uuid) from public;
revoke all on function public.archive_lead(uuid,uuid) from public;
grant execute on function public.create_lead_with_contact(uuid,text,text,text,text,text,text,public.lead_stage,integer,numeric,uuid,text,text[],jsonb) to authenticated;
grant execute on function public.transition_lead(uuid,uuid,public.lead_stage) to authenticated;
grant execute on function public.assign_lead(uuid,uuid,uuid) to authenticated;
grant execute on function public.add_lead_note(uuid,uuid,text) to authenticated;
grant execute on function public.schedule_lead_follow_up(uuid,uuid,text,timestamptz,uuid) to authenticated;
grant execute on function public.archive_lead(uuid,uuid) to authenticated;

grant select, insert, update, delete on public.invitations, public.lead_activities, public.tasks, public.ai_configs, public.automation_runs, public.integrations, public.subscriptions, public.analytics_events to authenticated;
grant usage, select on sequence public.analytics_events_id_seq to authenticated;

-- Lead creation, ownership, stage transitions and archival must use the audited
-- command functions above. Ordinary edits remain available for descriptive fields.
revoke insert, delete, update on public.leads from authenticated;
grant select on public.leads to authenticated;
grant update (interest, source, score, estimated_value, qualification, next_action, updated_at) on public.leads to authenticated;
