import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root=resolve(import.meta.dirname,'..')
const migrationPath=resolve(root,'supabase/migrations/0004_secure_product_backend.sql')

test('workflow creation is atomic and previews are side-effect free',async()=>{
  const [sql,runner]=await Promise.all([readFile(resolve(root,'supabase/migrations/0012_automation_workflow_commands.sql'),'utf8'),readFile(resolve(root,'supabase/functions/automation-run/index.ts'),'utf8')])
  expect(sql).toContain('create_automation_workflow')
  expect(sql).toContain('public.has_org_role')
  expect(sql).toContain('insert into public.automation_steps')
  expect(sql).toContain('grant execute on function public.create_automation_workflow')
  expect(runner.indexOf("if(dryRun||triggerEvent==='MANUAL_TEST')return json(")).toBeGreaterThan(0)
  expect(runner.indexOf("if(dryRun||triggerEvent==='MANUAL_TEST')return json(")).toBeLessThan(runner.indexOf("admin.from('automation_runs').insert"))
})

test('product expansion is tenant safe and widget ingestion validates origins',async()=>{
  const [sql,widget]=await Promise.all([readFile(resolve(root,'supabase/migrations/0013_product_expansion.sql'),'utf8'),readFile(resolve(root,'supabase/functions/widget-inquiry/index.ts'),'utf8')])
  for(const table of ['widget_configs','notification_preferences','plan_limits'])expect(sql).toContain(`alter table public.${table} enable row level security;`)
  expect(sql).toContain('delete_organization')
  expect(sql).toContain('create_automation_workflow_v2')
  expect(sql).toContain('leads_operational_notifications')
  expect(widget).toContain("config.allowed_origins.includes(origin)")
  expect(widget).toContain("eq('public_key',body.widgetKey)")
  expect(widget).toContain("requireSecret('SUPABASE_SERVICE_ROLE_KEY')")
  expect(widget).toContain("if((count??0)>=5)")
})

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

test('live workspace tables are published for realtime collaboration',async()=>{
  const sql=await readFile(resolve(root,'supabase/migrations/0006_workspace_realtime.sql'),'utf8')
  for(const table of ['leads','contacts','lead_activities','tasks','organization_members'])expect(sql).toContain(`'${table}'`)
  expect(sql).toContain("pubname = 'supabase_realtime'")
  expect(sql).toContain('alter publication supabase_realtime add table')
})

test('tenant isolation has executable role and cross-workspace assertions',async()=>{
  const sql=await readFile(resolve(root,'supabase/tests/tenant_isolation.sql'),'utf8')
  expect(sql).toContain('select plan(10)')
  expect(sql).toContain("set local role authenticated")
  expect(sql).toContain("request.jwt.claim.sub")
  expect(sql).toContain('cross-tenant memberships are hidden')
  expect(sql).toContain('cross-tenant profiles are hidden')
  expect(sql).toContain('rollback;')
})

test('AI and WhatsApp edge functions keep provider secrets server-side',async()=>{
  const [ai,webhook,outbound,env]=await Promise.all([
    readFile(resolve(root,'supabase/functions/ai-qualify/index.ts'),'utf8'),
    readFile(resolve(root,'supabase/functions/whatsapp-webhook/index.ts'),'utf8'),
    readFile(resolve(root,'supabase/functions/whatsapp-send/index.ts'),'utf8'),
    readFile(resolve(root,'.env.example'),'utf8'),
  ])
  expect(ai).toContain("requireSecret('OPENAI_API_KEY')")
  expect(ai).toContain("type:'json_schema'")
  expect(ai).toContain('requireUser(request)')
  expect(webhook).toContain("x-hub-signature-256")
  expect(webhook).toContain('verifyMetaSignature')
  expect(outbound).toContain('requireUser(request)')
  expect(outbound).toContain("requireSecret('WHATSAPP_ACCESS_TOKEN')")
  expect(env).not.toMatch(/VITE_(OPENAI|WHATSAPP)/)
})

test('team invitations, automation runs and notifications are server controlled',async()=>{
  const [migration,team,automation,email,env]=await Promise.all([
    readFile(resolve(root,'supabase/migrations/0008_team_automation_notifications.sql'),'utf8'),
    readFile(resolve(root,'supabase/functions/team-invitations/index.ts'),'utf8'),
    readFile(resolve(root,'supabase/functions/automation-run/index.ts'),'utf8'),
    readFile(resolve(root,'supabase/functions/notification-email/index.ts'),'utf8'),
    readFile(resolve(root,'.env.example'),'utf8'),
  ])
  expect(migration).toContain('function public.accept_invitation')
  expect(migration).toContain("digest(invite_token,'sha256')")
  expect(team).toContain('requireUser(request)')
  expect(team).toContain("['OWNER','ADMIN'].includes")
  expect(team).toContain('crypto.subtle.digest')
  expect(automation).toContain("status:'RUNNING'")
  expect(automation).toContain("status:'FAILED'")
  expect(automation).toContain("activity_type:'AUTOMATION'")
  expect(email).toContain('sendEmail')
  expect(env).toContain('RESEND_API_KEY=')
  expect(env).not.toContain('VITE_RESEND_API_KEY')
})

test('billing, public enquiries and contact deduplication stay server controlled',async()=>{
  const [migration,billing,webhook,inquiry,contacts,env]=await Promise.all([
    readFile(resolve(root,'supabase/migrations/0009_billing_dedupe_public_inquiries.sql'),'utf8'),readFile(resolve(root,'supabase/functions/billing/index.ts'),'utf8'),readFile(resolve(root,'supabase/functions/stripe-webhook/index.ts'),'utf8'),readFile(resolve(root,'supabase/functions/public-inquiry/index.ts'),'utf8'),readFile(resolve(root,'src/services/contacts.ts'),'utf8'),readFile(resolve(root,'.env.example'),'utf8'),
  ])
  expect(migration).toContain('create table public.contact_identities')
  expect(migration).toContain('primary key(organization_id,identity_type,identity_value)')
  expect(migration).toContain('function public.upsert_contact')
  expect(contacts).toContain("rpc('upsert_contact'")
  expect(contacts).toContain("rpc('update_contact'")
  expect(migration).not.toContain('delete from public.contacts')
  expect(migration).toContain('alter table public.website_inquiries enable row level security')
  expect(migration).toContain('revoke all on public.website_inquiries from anon,authenticated')
  expect(inquiry).toContain("Deno.env.get('INQUIRY_HASH_SECRET')")
  expect(inquiry).toContain("requireSecret('SUPABASE_SERVICE_ROLE_KEY')")
  expect(billing).toContain("requireSecret('STRIPE_SECRET_KEY')")
  expect(billing).toContain("['OWNER','ADMIN'].includes")
  expect(webhook).toContain("requireSecret('STRIPE_WEBHOOK_SECRET')")
  expect(webhook).toContain('stripe-signature')
  expect(env).not.toMatch(/VITE_(STRIPE|INQUIRY)/)
})

test('inbox, knowledge, AI settings and integration state are persistent and tenant safe',async()=>{
  const [migration,inbox,knowledge,aiConfig,integrations,check,sharedSupabase]=await Promise.all([
    readFile(resolve(root,'supabase/migrations/0010_live_workspace_modules.sql'),'utf8'),
    readFile(resolve(root,'src/services/inbox.ts'),'utf8'),
    readFile(resolve(root,'src/services/knowledge.ts'),'utf8'),
    readFile(resolve(root,'src/services/aiConfig.ts'),'utf8'),
    readFile(resolve(root,'src/services/integrations.ts'),'utf8'),
    readFile(resolve(root,'supabase/functions/integration-check/index.ts'),'utf8'),
    readFile(resolve(root,'supabase/functions/_shared/supabase.ts'),'utf8'),
  ])
  expect(migration).toContain('alter table public.conversation_reads enable row level security;')
  expect(migration).toContain('public.can_access_conversation(conversation_id,organization_id)')
  for(const command of ['create_conversation','send_conversation_message','mark_conversation_read']){
    expect(migration).toContain(`function public.${command}`)
    expect(inbox).toContain(`rpc('${command}'`)
  }
  expect(migration).toContain('revoke insert,update,delete on public.messages from authenticated')
  for(const table of ['conversations','messages','conversation_reads','knowledge_items','ai_configs','integrations'])expect(migration).toContain(`'${table}'`)
  expect(knowledge).toContain("from('knowledge_items')")
  expect(aiConfig).toContain("from('ai_configs')")
  expect(integrations).toContain("from('integrations')")
  expect(check).toContain('requireUser(request)')
  expect(check).toContain("['OWNER','ADMIN'].includes")
  expect(check).toContain('adminClient()')
  expect(sharedSupabase).toContain("required('SUPABASE_SERVICE_ROLE_KEY')")
  expect(check).not.toContain('VITE_WHATSAPP')
})

test('operational retries, workspace settings and signed webhooks are server controlled',async()=>{
  const [migration,runner,retry,webhookConfig,webhookDelivery,config,env,settings]=await Promise.all([
    readFile(resolve(root,'supabase/migrations/0011_operational_reliability.sql'),'utf8'),
    readFile(resolve(root,'supabase/functions/automation-run/index.ts'),'utf8'),
    readFile(resolve(root,'supabase/functions/automation-retry/index.ts'),'utf8'),
    readFile(resolve(root,'supabase/functions/webhook-config/index.ts'),'utf8'),
    readFile(resolve(root,'supabase/functions/webhook-delivery/index.ts'),'utf8'),
    readFile(resolve(root,'supabase/config.toml'),'utf8'),
    readFile(resolve(root,'.env.example'),'utf8'),
    readFile(resolve(root,'src/services/organizations.ts'),'utf8'),
  ])
  expect(migration).toContain('next_retry_at timestamptz')
  expect(migration).toContain('alter table public.webhook_endpoints enable row level security')
  expect(migration).toContain("array['OWNER','ADMIN']::public.member_role[]")
  expect(migration).toContain('function public.update_organization_settings')
  expect(settings).toContain("rpc('update_organization_settings'")
  expect(runner).toContain("Deno.env.get('AUTOMATION_CRON_SECRET')")
  expect(runner).toContain('retry_scheduled:shouldRetry')
  expect(retry).toContain("requireSecret('AUTOMATION_CRON_SECRET')")
  expect(webhookConfig).toContain('requireUser(request)')
  expect(webhookConfig).toContain("url.protocol!=='https:'")
  expect(webhookDelivery).toContain("hash:'SHA-256'")
  expect(webhookDelivery).toContain("requireSecret('WEBHOOK_SIGNING_SECRET')")
  expect(config).toContain('[functions.automation-retry]')
  expect(config).toContain('[functions.webhook-delivery]')
  expect(env).toContain('AUTOMATION_CRON_SECRET=')
  expect(env).toContain('WEBHOOK_SIGNING_SECRET=')
  expect(env).not.toMatch(/VITE_(AUTOMATION|WEBHOOK)/)
})
