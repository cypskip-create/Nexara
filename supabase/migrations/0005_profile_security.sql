-- Close the remaining public-table RLS gap reported by Supabase Security Advisor.
alter table public.profiles enable row level security;

create or replace function public.shares_organization_with(target_user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.organization_members mine
    join public.organization_members theirs on theirs.organization_id = mine.organization_id
    where mine.user_id = auth.uid() and theirs.user_id = target_user
  );
$$;

revoke all on function public.shares_organization_with(uuid) from public;
grant execute on function public.shares_organization_with(uuid) to authenticated;

create policy profiles_select on public.profiles for select
  using (id = auth.uid() or public.shares_organization_with(id));
create policy profiles_insert on public.profiles for insert
  with check (id = auth.uid());
create policy profiles_update on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid());

grant select, insert, update on public.profiles to authenticated;
