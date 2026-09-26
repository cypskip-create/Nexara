-- Production identity and rule-based pipeline progression.
alter table public.profiles add column if not exists username text;

create unique index if not exists profiles_username_unique
  on public.profiles(lower(username)) where username is not null;

alter table public.profiles drop constraint if exists profiles_username_format;
alter table public.profiles add constraint profiles_username_format
  check(username is null or username ~ '^[a-z0-9][a-z0-9._-]{2,31}$');

create or replace function public.update_current_profile(profile_full_name text, profile_username text)
returns public.profiles language plpgsql security definer set search_path=public as $$
declare normalized_username text; updated_profile public.profiles;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if length(trim(coalesce(profile_full_name,''))) not between 2 and 100 then raise exception 'full name must contain 2 to 100 characters'; end if;
  normalized_username:=lower(trim(coalesce(profile_username,'')));
  if normalized_username !~ '^[a-z0-9][a-z0-9._-]{2,31}$' then raise exception 'username must contain 3 to 32 letters, numbers, dots, dashes or underscores'; end if;
  insert into public.profiles(id,full_name,username,updated_at)
  values(auth.uid(),trim(profile_full_name),normalized_username,now())
  on conflict(id) do update set full_name=excluded.full_name,username=excluded.username,updated_at=now()
  returning * into updated_profile;
  return updated_profile;
exception when unique_violation then
  raise exception 'username is already in use';
end $$;

revoke all on function public.update_current_profile(text,text) from public;
grant execute on function public.update_current_profile(text,text) to authenticated;

create or replace function public.create_automation_workflow_v3(target_org uuid,workflow_name text,workflow_trigger text,workflow_conditions jsonb,workflow_actions jsonb)
returns public.automations language plpgsql security definer set search_path=public as $$
declare created public.automations; item jsonb; position_number integer:=0;
begin
  if not public.has_org_role(target_org,array['OWNER','ADMIN','MANAGER']::public.member_role[]) then raise exception 'forbidden'; end if;
  if workflow_name is null or length(trim(workflow_name)) not between 3 and 120 then raise exception 'invalid workflow name'; end if;
  if workflow_trigger not in('LEAD_CREATED','STAGE_CHANGED','LEAD_UPDATED','CONVERSATION_STARTED') then raise exception 'unsupported trigger'; end if;
  if jsonb_typeof(workflow_conditions)<>'array' or jsonb_array_length(workflow_conditions)>5 then raise exception 'invalid conditions'; end if;
  if jsonb_typeof(workflow_actions)<>'array' or jsonb_array_length(workflow_actions) not between 1 and 5 then raise exception 'invalid actions'; end if;
  for item in select * from jsonb_array_elements(workflow_conditions) loop if item->>'type' not in('score_gte','stage_is','source_is','owner_unassigned') then raise exception 'unsupported condition'; end if; end loop;
  for item in select * from jsonb_array_elements(workflow_actions) loop if item->>'type' not in('assign_owner','set_stage','advance_stage','create_task','notify_owner') then raise exception 'unsupported action'; end if; end loop;
  insert into public.automations(organization_id,name,trigger_type,status,created_by) values(target_org,trim(workflow_name),workflow_trigger,'ACTIVE',auth.uid()) returning * into created;
  for item in select * from jsonb_array_elements(workflow_conditions) loop insert into public.automation_steps(automation_id,organization_id,step_type,position,config) values(created.id,target_org,'CONDITION',position_number,item); position_number:=position_number+1; end loop;
  for item in select * from jsonb_array_elements(workflow_actions) loop insert into public.automation_steps(automation_id,organization_id,step_type,position,config) values(created.id,target_org,'ACTION',position_number,item); position_number:=position_number+1; end loop;
  insert into public.audit_events(organization_id,actor_id,event_type,entity_type,entity_id,metadata) values(target_org,auth.uid(),'automation_created','automation',created.id,jsonb_build_object('trigger',workflow_trigger,'conditions',jsonb_array_length(workflow_conditions),'actions',jsonb_array_length(workflow_actions)));
  return created;
end $$;

revoke all on function public.create_automation_workflow_v3(uuid,text,text,jsonb,jsonb) from public;
grant execute on function public.create_automation_workflow_v3(uuid,text,text,jsonb,jsonb) to authenticated;
