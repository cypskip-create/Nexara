import type { DatabaseLeadStage, Json, LeadActivityRow, LeadRow, TaskRow } from '../types/database'
import { requireSupabase, throwServiceError } from './api'

export type LeadCreateInput={organizationId:string;name:string;email?:string|null;phone?:string|null;company?:string|null;interest?:string|null;source?:string;stage?:DatabaseLeadStage;score?:number;estimatedValue?:number|null;ownerId?:string|null;nextAction?:string|null;tags?:string[];qualification?:Json}

export async function listLeads(organizationId:string,includeArchived=false):Promise<LeadRow[]> {
  let query=requireSupabase().from('leads').select('*').eq('organization_id',organizationId).order('created_at',{ascending:false}).limit(100)
  if(!includeArchived)query=query.is('archived_at',null)
  const {data,error}=await query
  if(error)throwServiceError(error,'Unable to load leads.')
  return data??[]
}

export async function createLead(input:LeadCreateInput):Promise<LeadRow> {
  const name=input.name.trim()
  if(!name)throw new Error('Lead name is required.')
  const score=input.score??0
  if(!Number.isInteger(score)||score<0||score>100)throw new Error('Lead score must be a whole number from 0 to 100.')
  const {data,error}=await requireSupabase().rpc('create_lead_with_contact',{
    target_org:input.organizationId,contact_name:name,contact_email:input.email?.trim().toLowerCase()||null,
    contact_phone:input.phone?.trim()||null,contact_company:input.company?.trim()||null,lead_interest:input.interest?.trim()||null,
    lead_source:input.source??'Manual',lead_stage:input.stage??'NEW',lead_score:score,lead_value:input.estimatedValue??null,
    lead_owner:input.ownerId??null,lead_next_action:input.nextAction?.trim()||null,lead_tags:input.tags??[],lead_qualification:input.qualification??{},
  })
  if(error)throwServiceError(error,'Unable to create the lead.')
  return data
}

export async function moveLead(leadId:string,organizationId:string,stage:DatabaseLeadStage):Promise<LeadRow> {
  const {data,error}=await requireSupabase().rpc('transition_lead',{target_lead:leadId,target_org:organizationId,next_stage:stage})
  if(error)throwServiceError(error,'Unable to move the lead.')
  return data
}

export async function assignLead(leadId:string,organizationId:string,ownerId:string|null):Promise<LeadRow> {
  const {data,error}=await requireSupabase().rpc('assign_lead',{target_lead:leadId,target_org:organizationId,next_owner:ownerId})
  if(error)throwServiceError(error,'Unable to assign the lead.')
  return data
}

export async function addLeadNote(leadId:string,organizationId:string,body:string):Promise<LeadActivityRow> {
  if(!body.trim())throw new Error('Note text is required.')
  const {data,error}=await requireSupabase().rpc('add_lead_note',{target_lead:leadId,target_org:organizationId,note_body:body.trim()})
  if(error)throwServiceError(error,'Unable to add the note.')
  return data
}

export async function scheduleFollowUp(leadId:string,organizationId:string,title:string,dueAt:string,assigneeId?:string|null):Promise<TaskRow> {
  if(Number.isNaN(Date.parse(dueAt))||new Date(dueAt)<=new Date())throw new Error('Choose a valid future follow-up time.')
  const {data,error}=await requireSupabase().rpc('schedule_lead_follow_up',{target_lead:leadId,target_org:organizationId,task_title:title.trim()||'Lead follow-up',task_due_at:new Date(dueAt).toISOString(),task_assignee:assigneeId??null})
  if(error)throwServiceError(error,'Unable to schedule the follow-up.')
  return data
}

export async function archiveLead(leadId:string,organizationId:string):Promise<LeadRow> {
  const {data,error}=await requireSupabase().rpc('archive_lead',{target_lead:leadId,target_org:organizationId})
  if(error)throwServiceError(error,'Unable to archive the lead.')
  return data
}

export async function listLeadActivity(leadId:string,organizationId:string):Promise<LeadActivityRow[]> {
  const {data,error}=await requireSupabase().from('lead_activities').select('*').eq('organization_id',organizationId).eq('lead_id',leadId).order('created_at',{ascending:false}).limit(100)
  if(error)throwServiceError(error,'Unable to load lead activity.')
  return data??[]
}
