-- Auth lifecycle helpers. Apply after 0001_initial_schema.sql.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.create_organization(org_name text)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare new_org uuid;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  insert into public.organizations (name) values (nullif(trim(org_name), '')) returning id into new_org;
  if new_org is null then raise exception 'organization name is required'; end if;
  insert into public.organization_members (organization_id, user_id, role)
  values (new_org, auth.uid(), 'OWNER');
  return new_org;
end;
$$;

revoke all on function public.create_organization(text) from public;
grant execute on function public.create_organization(text) to authenticated;
