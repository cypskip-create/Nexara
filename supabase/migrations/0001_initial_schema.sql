-- Nexara LeadFlow: initial multi-tenant schema foundation.
-- Apply through Supabase migrations; do not run destructive seed SQL against production.
create extension if not exists "pgcrypto";

create type public.member_role as enum ('OWNER', 'ADMIN', 'MANAGER', 'AGENT');
create type public.lead_stage as enum ('NEW', 'QUALIFIED', 'CONTACTED', 'MEETING', 'NEGOTIATION', 'WON', 'LOST');

create table public.organizations (
  id uuid primary key default gen_random_uuid(), name text not null, industry text, website text,
  phone text, country text default 'KE', timezone text default 'Africa/Nairobi', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade, full_name text, avatar_url text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade, user_id uuid not null references public.profiles(id) on delete cascade,
  role public.member_role not null default 'AGENT', created_at timestamptz not null default now(), primary key (organization_id, user_id)
);
create table public.contacts (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null, email text, phone text, company text, tags text[] not null default '{}', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.leads (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  contact_id uuid references public.contacts(id) on delete set null, owner_id uuid references public.profiles(id) on delete set null,
  interest text, source text, stage public.lead_stage not null default 'NEW', score integer not null default 0 check (score between 0 and 100), estimated_value numeric, qualification jsonb not null default '{}', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index leads_org_stage_idx on public.leads(organization_id, stage);
create index contacts_org_idx on public.contacts(organization_id);

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.contacts enable row level security;
alter table public.leads enable row level security;

create or replace function public.is_org_member(target_org uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.organization_members where organization_id = target_org and user_id = auth.uid());
$$;
create policy "members can read their organizations" on public.organizations for select using (public.is_org_member(id));
create policy "members can read memberships" on public.organization_members for select using (user_id = auth.uid() or public.is_org_member(organization_id));
create policy "members can manage contacts" on public.contacts for all using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
create policy "members can manage leads" on public.leads for all using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
