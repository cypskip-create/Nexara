import {expect,test} from '@playwright/test'
import {readFile} from 'node:fs/promises'
import {resolve} from 'node:path'

const root=resolve(import.meta.dirname,'..')
test.beforeEach(async({page})=>{await page.goto('/#app');await page.evaluate(()=>{sessionStorage.setItem('nexara-demo-mode','true');localStorage.removeItem('nexara-demo-workspace-v2');localStorage.removeItem('nexara-demo-modules-v1')});await page.reload()})

test('lead capture supports major acquisition platforms',async({page})=>{
  await page.locator('.sidebar nav').getByRole('button',{name:'Leads'}).click()
  await page.getByRole('button',{name:'Add lead'}).click()
  const dialog=page.getByRole('dialog',{name:'Add a lead'})
  await dialog.getByLabel('Full name').fill('Nadia Kimani')
  await dialog.getByLabel('Interest').fill('Corporate healthcare plan')
  await dialog.getByLabel('Source').selectOption('LinkedIn')
  await dialog.getByRole('button',{name:'Create lead'}).click()
  await expect(page.locator('.crm-leads-table')).toContainText('Nadia Kimani')
  await expect(page.locator('.crm-leads-table')).toContainText('LinkedIn')
})

test('demo integrations explain universal platform compatibility',async({page})=>{
  await page.locator('.sidebar nav').getByRole('button',{name:'Integrations'}).click()
  await expect(page.getByRole('heading',{name:'Connect every customer source'})).toBeVisible()
  for(const platform of ['Instagram','LinkedIn','Google Ads','Shopify','Calendly','Zapier','Make','n8n','Custom API'])await expect(page.getByText(platform,{exact:true})).toBeVisible()
  await page.getByRole('button',{name:'See how it works'}).click()
  await expect(page.locator('.demo-setup-guide')).toContainText('revocable source key')
})

test('landing exposes broad industry playbooks',async({page})=>{
  await page.goto('/')
  await page.getByRole('button',{name:/Healthcare/}).click()
  await expect(page.locator('.lf-industry-preview')).toContainText('Appointment requested')
  await page.getByRole('button',{name:/SaaS/}).click()
  await expect(page.locator('.lf-industry-preview')).toContainText('Demo booked')
  await page.getByRole('button',{name:/Recruitment/}).click()
  await expect(page.locator('.lf-industry-preview')).toContainText('Hiring brief accepted')
})

test('universal source ingestion is tenant-scoped and stores only hashed keys',async()=>{
  const [sql,ingest,http]=await Promise.all([readFile(resolve(root,'supabase/migrations/0015_omnichannel_industry_platform.sql'),'utf8'),readFile(resolve(root,'supabase/functions/source-ingest/index.ts'),'utf8'),readFile(resolve(root,'supabase/functions/_shared/http.ts'),'utf8')])
  expect(sql).toContain('alter table public.lead_sources enable row level security')
  expect(sql).toContain("encode(digest(token,'sha256'),'hex')")
  expect(sql).toContain("public.has_org_role(target_org,array['OWNER','ADMIN']")
  expect(ingest).toContain("request.headers.get('x-nexara-source-key')")
  expect(ingest).toContain("source.secret_hash!==await hash(token)")
  expect(ingest).toContain("organization_id:source.organization_id")
  expect(http).toContain('x-nexara-source-key')
})
