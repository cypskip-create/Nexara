import { supabase } from '../lib/supabase'

export type LeadRecord = {
  id?: string
  organization_id: string
  contact_id?: string | null
  owner_id?: string | null
  interest?: string | null
  source?: string | null
  stage?: 'NEW' | 'QUALIFIED' | 'CONTACTED' | 'MEETING' | 'NEGOTIATION' | 'WON' | 'LOST'
  score?: number
  estimated_value?: number | null
  qualification?: Record<string, unknown>
}

export async function listLeads(organizationId: string) {
  if (!supabase) throw new Error('Supabase is not configured')
  return supabase.from('leads').select('*, contacts(*), profiles:owner_id(full_name)').eq('organization_id', organizationId).order('created_at', { ascending: false })
}

export async function createLead(input: LeadRecord) {
  if (!supabase) throw new Error('Supabase is not configured')
  return supabase.from('leads').insert({ ...input, organization_id: input.organization_id }).select().single()
}

export async function moveLead(leadId: string, organizationId: string, stage: LeadRecord['stage']) {
  if (!supabase) throw new Error('Supabase is not configured')
  return supabase.from('leads').update({ stage, updated_at: new Date().toISOString() }).eq('id', leadId).eq('organization_id', organizationId).select().single()
}
