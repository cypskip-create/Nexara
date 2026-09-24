import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root=resolve(import.meta.dirname,'..')
const migrationPath=resolve(root,'supabase/migrations/0004_secure_product_backend.sql')

test('all new tenant-owned tables enable row-level security',async()=>{
  const [sql,profileSecurity]=await Promise.all([readFile(migrationPath,'utf8'),readFile(resolve(root,'supabase/migrations/0005_profile_security.sql'),'utf8')])
  const tables=['invitations','lead_activities','tasks','ai_configs','automation_runs','integrations','subscriptions','analytics_events']
  for(const table of tables)expect(sql).toContain(`alter table public.${table} enable row level security;`)
  expect(profileSecurity).toContain('alter table public.profiles enable row level security;')
  expect(profileSecurity).toContain('public.shares_organization_with(id)')
})

test('tenant relationships and organization identifiers are protected',async()=>{
  const sql=await readFile(migrationPath,'utf8')
  expect(sql).toContain('leads_contact_same_organization')
  expect(sql).toContain('messages_conversation_same_organization')
  expect(sql).toContain('automation_steps_parent_same_organization')
  expect(sql).toContain('tasks_lead_same_organization')
  expect(sql).toContain("raise exception 'organization_id is immutable'")
  expect(sql).toContain("raise exception 'organization must retain at least one owner'")
})

test('privileged CRM changes use authorized auditable database commands',async()=>{
  const [sql,service]=await Promise.all([readFile(migrationPath,'utf8'),readFile(resolve(root,'src/services/leads.ts'),'utf8')])
  for(const command of ['create_lead_with_contact','transition_lead','assign_lead','add_lead_note','schedule_lead_follow_up','archive_lead']){
    expect(sql).toContain(`function public.${command}`)
    expect(sql).toContain(`grant execute on function public.${command}`)
    expect(service).toContain(`rpc('${command}'`)
  }
  expect(sql).toContain("insert into public.audit_events")
  expect(sql).toContain("insert into public.analytics_events")
})

test('legacy all-member mutation policies are removed',async()=>{
  const sql=await readFile(migrationPath,'utf8')
  expect(sql).not.toMatch(/create policy "members can manage/)
  expect(sql).toContain("array['OWNER','ADMIN','MANAGER']::public.member_role[]")
  expect(sql).toContain('public.can_access_owned_record(organization_id, owner_id)')
  expect(sql).toContain('revoke insert, delete, update on public.leads from authenticated')
})
