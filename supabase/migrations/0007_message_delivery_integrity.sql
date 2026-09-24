-- Provider message IDs are idempotency keys. One channel event must never create
-- duplicate messages when a provider retries webhook delivery.
create unique index if not exists messages_org_external_id_unique
  on public.messages (organization_id, external_id)
  where external_id is not null;

do $$
declare table_name text;
begin
  foreach table_name in array array['conversations','messages'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname='supabase_realtime' and schemaname='public' and tablename=table_name
    ) then
      execute format('alter publication supabase_realtime add table public.%I',table_name);
    end if;
  end loop;
end $$;
