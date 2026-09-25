-- Product expansion: embeddable widget, preferences, limits, data controls and richer workflows.
alter table public.organizations add column if not exists logo_url text;

create table public.widget_configs(
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  public_key uuid not null unique default gen_random_uuid(),
  enabled boolean not null default false,
  brand_name text not null default 'Nexara Assistant',
  welcome_message text not null default 'Hi! How can we help?',
  primary_color text not null default '#6d5dfc' check(primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  allowed_origins text[] not null default '{}',
  updated_at timestamptz not null default now()
);
create table public.notification_preferences(
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  in_app boolean not null default true,
  email_qualified_lead boolean not null default true,
  email_assignment boolean not null default true,
  email_follow_up boolean not null default true,
  email_automation_failure boolean not null default true,
  email_integration_failure boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key(organization_id,user_id)
);
create table public.plan_limits(
  plan text primary key check(plan in('STARTER','GROWTH','PRO')),
  members integer not null,
  monthly_leads integer not null,
  active_automations integer not null,
  knowledge_items integer not null
);
insert into public.plan_limits values ('STARTER',2,100,3,25),('GROWTH',5,500,15,250),('PRO',25,5000,100,2500) on conflict(plan) do update set members=excluded.members,monthly_leads=excluded.monthly_leads,active_automations=excluded.active_automations,knowledge_items=excluded.knowledge_items;

alter table public.widget_configs enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.plan_limits enable row level security;
create policy widget_manage on public.widget_configs for all using(public.has_org_role(organization_id,array['OWNER','ADMIN']::public.member_role[])) with check(public.has_org_role(organization_id,array['OWNER','ADMIN']::public.member_role[]));
create policy notification_preferences_own on public.notification_preferences for all using(user_id=auth.uid() and public.is_org_member(organization_id)) with check(user_id=auth.uid() and public.is_org_member(organization_id));
create policy plan_limits_read on public.plan_limits for select using(true);
grant select,insert,update,delete on public.widget_configs to authenticated;
grant select,insert,update,delete on public.notification_preferences to authenticated;
grant select on public.plan_limits to authenticated,anon;

create or replace function public.delete_organization(target_org uuid,confirmation text) returns void language plpgsql security definer set search_path=public as $$
declare org_name text;
begin
  if not public.has_org_role(target_org,array['OWNER']::public.member_role[]) then raise exception 'only an owner can delete a workspace'; end if;
  select name into org_name from public.organizations where id=target_org;
  if confirmation is distinct from org_name then raise exception 'workspace name does not match'; end if;
  insert into public.audit_events(organization_id,actor_id,event_type,entity_type,entity_id) values(target_org,auth.uid(),'organization_deleted','organization',target_org);
  delete from public.organizations where id=target_org;
end $$;
revoke all on function public.delete_organization(uuid,text) from public;
grant execute on function public.delete_organization(uuid,text) to authenticated;

create or replace function public.delete_automation_workflow(target_org uuid,target_automation uuid) returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.has_org_role(target_org,array['OWNER','ADMIN','MANAGER']::public.member_role[]) then raise exception 'forbidden'; end if;
  delete from public.automations where id=target_automation and organization_id=target_org;
  insert into public.audit_events(organization_id,actor_id,event_type,entity_type,entity_id) values(target_org,auth.uid(),'automation_deleted','automation',target_automation);
end $$;
revoke all on function public.delete_automation_workflow(uuid,uuid) from public;
grant execute on function public.delete_automation_workflow(uuid,uuid) to authenticated;

create or replace function public.create_automation_workflow_v2(target_org uuid,workflow_name text,workflow_trigger text,minimum_score integer,action_type text,delay_hours integer default 24)
returns public.automations language plpgsql security definer set search_path=public as $$
declare created public.automations;
begin
  if not public.has_org_role(target_org,array['OWNER','ADMIN','MANAGER']::public.member_role[]) then raise exception 'forbidden'; end if;
  if workflow_name is null or length(trim(workflow_name)) not between 3 and 120 then raise exception 'invalid workflow name'; end if;
  if workflow_trigger not in('LEAD_CREATED','STAGE_CHANGED','LEAD_UPDATED','CONVERSATION_STARTED') then raise exception 'unsupported trigger'; end if;
  if minimum_score is null or minimum_score not between 0 and 100 then raise exception 'invalid score threshold'; end if;
  if action_type not in('notify_owner','create_task','set_stage') then raise exception 'unsupported action'; end if;
  insert into public.automations(organization_id,name,trigger_type,status,created_by) values(target_org,trim(workflow_name),workflow_trigger,'ACTIVE',auth.uid()) returning * into created;
  insert into public.automation_steps(automation_id,organization_id,step_type,position,config) values
    (created.id,target_org,'CONDITION',0,jsonb_build_object('type','score_gte','value',minimum_score)),
    (created.id,target_org,'ACTION',1,case action_type when 'create_task' then jsonb_build_object('type',action_type,'title',trim(workflow_name),'delayHours',delay_hours) when 'set_stage' then jsonb_build_object('type',action_type,'stage','QUALIFIED') else jsonb_build_object('type',action_type,'title',trim(workflow_name)) end);
  insert into public.audit_events(organization_id,actor_id,event_type,entity_type,entity_id,metadata) values(target_org,auth.uid(),'automation_created','automation',created.id,jsonb_build_object('trigger',workflow_trigger));
  return created;
end $$;
revoke all on function public.create_automation_workflow_v2(uuid,text,text,integer,text,integer) from public;
grant execute on function public.create_automation_workflow_v2(uuid,text,text,integer,text,integer) to authenticated;

create or replace function public.emit_lead_notifications() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.owner_id is not null and new.owner_id is distinct from old.owner_id then insert into public.notifications(organization_id,user_id,kind,title,body) values(new.organization_id,new.owner_id,'ASSIGNMENT','A lead was assigned to you','Open the lead to review its next action.'); end if;
  if new.stage='QUALIFIED' and old.stage is distinct from 'QUALIFIED' then
    insert into public.notifications(organization_id,user_id,kind,title,body) select new.organization_id,user_id,'QUALIFIED_LEAD','A lead is now qualified','Review the qualification and plan the next step.' from public.organization_members where organization_id=new.organization_id and role in('OWNER','ADMIN','MANAGER');
  end if;
  return new;
end $$;
drop trigger if exists leads_operational_notifications on public.leads;
create trigger leads_operational_notifications after update of owner_id,stage on public.leads for each row execute function public.emit_lead_notifications();

create or replace function public.emit_failure_notifications() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if tg_table_name='automation_runs' and new.status='FAILED' and old.status is distinct from 'FAILED' then
    insert into public.notifications(organization_id,user_id,kind,title,body) select new.organization_id,user_id,'AUTOMATION_FAILURE','Automation needs attention',coalesce(new.error_code,'Execution failed') from public.organization_members where organization_id=new.organization_id and role in('OWNER','ADMIN','MANAGER');
  elsif tg_table_name='integrations' and new.status='ERROR' and old.status is distinct from 'ERROR' then
    insert into public.notifications(organization_id,user_id,kind,title,body) select new.organization_id,user_id,'INTEGRATION_FAILURE','Integration needs attention',coalesce(new.last_error_code,'Connection failed') from public.organization_members where organization_id=new.organization_id and role in('OWNER','ADMIN');
  end if;
  return new;
end $$;
drop trigger if exists automation_failure_notifications on public.automation_runs;
create trigger automation_failure_notifications after update of status on public.automation_runs for each row execute function public.emit_failure_notifications();
drop trigger if exists integration_failure_notifications on public.integrations;
create trigger integration_failure_notifications after update of status on public.integrations for each row execute function public.emit_failure_notifications();

do $$ declare table_name text; begin
  foreach table_name in array array['widget_configs','notification_preferences'] loop
    if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=table_name) then execute format('alter publication supabase_realtime add table public.%I',table_name); end if;
  end loop;
end $$;
