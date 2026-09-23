-- Tenant-owned operational entities for Inbox, Knowledge, Automations and auditability.
create table public.pipeline_stages (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null, position integer not null default 0, color text, created_at timestamptz not null default now(), unique (organization_id, name)
);
create table public.conversations (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  contact_id uuid references public.contacts(id) on delete set null, channel text not null check (channel in ('WEBSITE', 'WHATSAPP', 'EMAIL', 'API')),
  status text not null default 'OPEN' check (status in ('OPEN', 'CLOSED', 'SNOOZED')), assigned_to uuid references public.profiles(id) on delete set null,
  last_message_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.messages (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade, sender_type text not null check (sender_type in ('CUSTOMER', 'AI', 'HUMAN', 'SYSTEM')),
  body text not null, external_id text, created_at timestamptz not null default now()
);
create table public.knowledge_items (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null, item_type text not null check (item_type in ('FAQ', 'PRODUCT', 'SERVICE', 'POLICY', 'GENERAL', 'DOCUMENT')),
  content text not null, status text not null default 'ACTIVE' check (status in ('ACTIVE', 'DRAFT', 'ARCHIVED')),
  metadata jsonb not null default '{}', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.automations (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null, status text not null default 'DRAFT' check (status in ('DRAFT', 'ACTIVE', 'PAUSED', 'ERROR')),
  trigger_type text not null, created_by uuid references public.profiles(id) on delete set null, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.automation_steps (
  id uuid primary key default gen_random_uuid(), automation_id uuid not null references public.automations(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade, step_type text not null check (step_type in ('CONDITION', 'ACTION')),
  position integer not null default 0, config jsonb not null default '{}', created_at timestamptz not null default now()
);
create table public.notifications (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade, kind text not null, title text not null, body text, read_at timestamptz,
  created_at timestamptz not null default now()
);
create table public.audit_events (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null, event_type text not null, entity_type text, entity_id uuid, metadata jsonb not null default '{}', created_at timestamptz not null default now()
);

create index conversations_org_last_message_idx on public.conversations(organization_id, last_message_at desc);
create index messages_conversation_created_idx on public.messages(conversation_id, created_at);
create index knowledge_org_type_idx on public.knowledge_items(organization_id, item_type);
create index notifications_user_read_idx on public.notifications(user_id, read_at);
create index audit_events_org_created_idx on public.audit_events(organization_id, created_at desc);

alter table public.pipeline_stages enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.knowledge_items enable row level security;
alter table public.automations enable row level security;
alter table public.automation_steps enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_events enable row level security;

create policy "members can manage pipeline stages" on public.pipeline_stages for all using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
create policy "members can manage conversations" on public.conversations for all using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
create policy "members can manage messages" on public.messages for all using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
create policy "members can manage knowledge" on public.knowledge_items for all using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
create policy "members can manage automations" on public.automations for all using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
create policy "members can manage automation steps" on public.automation_steps for all using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
create policy "members can read own notifications" on public.notifications for select using (user_id = auth.uid() and public.is_org_member(organization_id));
create policy "members can update own notifications" on public.notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "members can read audit events" on public.audit_events for select using (public.is_org_member(organization_id));
