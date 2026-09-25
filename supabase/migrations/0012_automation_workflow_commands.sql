-- Save a complete workflow atomically so an active rule never lacks its steps.
create or replace function public.create_automation_workflow(target_org uuid,workflow_name text,minimum_score integer,action_type text,delay_hours integer default 24)
returns public.automations language plpgsql security definer set search_path=public as $$
declare created public.automations;
begin
  if not public.has_org_role(target_org,array['OWNER','ADMIN','MANAGER']::public.member_role[]) then raise exception 'forbidden'; end if;
  if workflow_name is null or length(trim(workflow_name))<3 or length(trim(workflow_name))>120 then raise exception 'workflow name must have 3 to 120 characters'; end if;
  if minimum_score is null or minimum_score<0 or minimum_score>100 then raise exception 'score threshold must be between 0 and 100'; end if;
  if action_type is null or action_type not in('notify_owner','create_task','set_stage') then raise exception 'unsupported action'; end if;
  if delay_hours is null or delay_hours<1 or delay_hours>720 then raise exception 'delay must be between 1 and 720 hours'; end if;
  insert into public.automations(organization_id,name,trigger_type,status,created_by) values(target_org,trim(workflow_name),'LEAD_CREATED','ACTIVE',auth.uid()) returning * into created;
  insert into public.automation_steps(automation_id,organization_id,step_type,position,config) values
    (created.id,target_org,'CONDITION',0,jsonb_build_object('type','score_gte','value',minimum_score)),
    (created.id,target_org,'ACTION',1,case action_type when 'create_task' then jsonb_build_object('type',action_type,'title',trim(workflow_name),'delayHours',delay_hours) when 'set_stage' then jsonb_build_object('type',action_type,'stage','QUALIFIED') else jsonb_build_object('type',action_type,'title',trim(workflow_name)) end);
  insert into public.audit_events(organization_id,actor_id,event_type,entity_type,entity_id) values(target_org,auth.uid(),'automation_created','automation',created.id);
  return created;
end $$;
revoke all on function public.create_automation_workflow(uuid,text,integer,text,integer) from public;
grant execute on function public.create_automation_workflow(uuid,text,integer,text,integer) to authenticated;
