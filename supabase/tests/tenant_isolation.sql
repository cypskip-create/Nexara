-- Run against a disposable Supabase database with: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

insert into auth.users (id,email,aud,role,encrypted_password,email_confirmed_at)
values
  ('10000000-0000-0000-0000-000000000001','owner-a@nexara.test','authenticated','authenticated','',now()),
  ('10000000-0000-0000-0000-000000000002','agent-a@nexara.test','authenticated','authenticated','',now()),
  ('20000000-0000-0000-0000-000000000001','owner-b@nexara.test','authenticated','authenticated','',now());

insert into public.organizations (id,name) values
  ('a0000000-0000-0000-0000-000000000001','Tenant A'),
  ('b0000000-0000-0000-0000-000000000001','Tenant B');
insert into public.organization_members (organization_id,user_id,role) values
  ('a0000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','OWNER'),
  ('a0000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000002','AGENT'),
  ('b0000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','OWNER');

set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',true);
select ok(public.is_org_member('a0000000-0000-0000-0000-000000000001'),'agent is a member of tenant A');
select isnt(public.is_org_member('b0000000-0000-0000-0000-000000000001'),true,'agent is not a member of tenant B');
select ok(public.has_org_role('a0000000-0000-0000-0000-000000000001',array['AGENT']::public.member_role[]),'agent role is recognized');
select isnt(public.has_org_role('a0000000-0000-0000-0000-000000000001',array['OWNER','ADMIN']::public.member_role[]),true,'agent has no admin role');
select ok(public.can_access_owned_record('a0000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000002'),'agent can access assigned records');
select ok(public.can_access_owned_record('a0000000-0000-0000-0000-000000000001',null),'agent can access unassigned records');
select isnt(public.can_access_owned_record('a0000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001'),true,'agent cannot access another owner record');
select is((select count(*) from public.organizations),1::bigint,'RLS exposes only tenant A');
select is((select count(*) from public.organization_members where organization_id='b0000000-0000-0000-0000-000000000001'),0::bigint,'cross-tenant memberships are hidden');
select is((select count(*) from public.profiles where id='20000000-0000-0000-0000-000000000001'),0::bigint,'cross-tenant profiles are hidden');

select * from finish();
rollback;
