-- Professional operations: prioritized work queues and multi-step automation definitions.
alter table public.tasks add column if not exists priority text not null default 'NORMAL' check(priority in('LOW','NORMAL','HIGH','URGENT'));
create index if not exists tasks_org_status_priority_due_idx on public.tasks(organization_id,status,priority,due_at);

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
  for item in select * from jsonb_array_elements(workflow_actions) loop if item->>'type' not in('assign_owner','set_stage','create_task','notify_owner') then raise exception 'unsupported action'; end if; end loop;
  insert into public.automations(organization_id,name,trigger_type,status,created_by) values(target_org,trim(workflow_name),workflow_trigger,'ACTIVE',auth.uid()) returning * into created;
  for item in select * from jsonb_array_elements(workflow_conditions) loop insert into public.automation_steps(automation_id,organization_id,step_type,position,config) values(created.id,target_org,'CONDITION',position_number,item); position_number:=position_number+1; end loop;
  for item in select * from jsonb_array_elements(workflow_actions) loop insert into public.automation_steps(automation_id,organization_id,step_type,position,config) values(created.id,target_org,'ACTION',position_number,item); position_number:=position_number+1; end loop;
  insert into public.audit_events(organization_id,actor_id,event_type,entity_type,entity_id,metadata) values(target_org,auth.uid(),'automation_created','automation',created.id,jsonb_build_object('trigger',workflow_trigger,'conditions',jsonb_array_length(workflow_conditions),'actions',jsonb_array_length(workflow_actions)));
  return created;
end $$;
revoke all on function public.create_automation_workflow_v3(uuid,text,text,jsonb,jsonb) from public;
grant execute on function public.create_automation_workflow_v3(uuid,text,text,jsonb,jsonb) to authenticated;
