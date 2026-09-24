-- Idempotent team operations and realtime collaboration for the next product modules.
create unique index if not exists invitations_pending_email_unique
  on public.invitations (organization_id,email)
  where accepted_at is null;

do $$
declare table_name text;
begin
  foreach table_name in array array['notifications','automations','automation_runs','invitations'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname='supabase_realtime' and schemaname='public' and tablename=table_name
    ) then
      execute format('alter publication supabase_realtime add table public.%I',table_name);
    end if;
  end loop;
end $$;

create or replace function public.accept_invitation(invite_token text)
returns uuid language plpgsql security definer set search_path=public,extensions as $$
declare selected_invitation public.invitations; normalized_email text;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  normalized_email:=lower(coalesce(auth.jwt()->>'email',''));
  select * into selected_invitation from public.invitations
    where token_hash=encode(digest(invite_token,'sha256'),'hex') and accepted_at is null and expires_at>now()
    for update;
  if selected_invitation.id is null then raise exception 'invitation is invalid or expired'; end if;
  if selected_invitation.email<>normalized_email then raise exception 'invitation email does not match signed-in user'; end if;
  insert into public.organization_members(organization_id,user_id,role)
    values(selected_invitation.organization_id,auth.uid(),selected_invitation.role)
    on conflict(organization_id,user_id) do update set role=excluded.role;
  update public.invitations set accepted_at=now() where id=selected_invitation.id;
  insert into public.audit_events(organization_id,actor_id,event_type,entity_type,entity_id)
    values(selected_invitation.organization_id,auth.uid(),'invitation_accepted','invitation',selected_invitation.id);
  return selected_invitation.organization_id;
end $$;

revoke all on function public.accept_invitation(text) from public;
grant execute on function public.accept_invitation(text) to authenticated;
