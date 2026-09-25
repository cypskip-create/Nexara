import type { MemberRole, OrganizationRow } from '../types/database'
import { requireSupabase, throwServiceError } from './api'

export type OrganizationSummary = OrganizationRow & { role:string }
export type OrganizationMember = { userId:string; role:MemberRole; name:string }

export async function listOrganizations():Promise<OrganizationSummary[]> {
  const client=requireSupabase()
  const {data:memberships,error:membershipError}=await client.from('organization_members').select('*').order('created_at')
  if(membershipError)throwServiceError(membershipError,'Unable to load your workspace memberships.')
  if(!memberships?.length)return []
  const roles=new Map(memberships.map(membership=>[membership.organization_id,membership.role]))
  const {data,error}=await client.from('organizations').select('*').in('id',[...roles.keys()]).order('created_at')
  if(error)throwServiceError(error,'Unable to load your workspaces.')
  return (data??[]).map(organization=>({...organization,role:roles.get(organization.id)??'AGENT'}))
}

export async function createOrganization(name:string):Promise<string> {
  const normalized=name.trim()
  if(normalized.length<2)throw new Error('Organization name must contain at least two characters.')
  const {data,error}=await requireSupabase().rpc('create_organization',{org_name:normalized})
  if(error)throwServiceError(error,'Unable to create the workspace.')
  return data
}

export async function listOrganizationMembers(organizationId:string):Promise<OrganizationMember[]> {
  const client=requireSupabase()
  const {data:memberships,error:membershipError}=await client.from('organization_members').select('*').eq('organization_id',organizationId).order('created_at')
  if(membershipError)throwServiceError(membershipError,'Unable to load workspace members.')
  if(!memberships?.length)return []
  const {data:profiles,error:profileError}=await client.from('profiles').select('*').in('id',memberships.map(member=>member.user_id))
  if(profileError)throwServiceError(profileError,'Unable to load member profiles.')
  const names=new Map((profiles??[]).map(profile=>[profile.id,profile.full_name]))
  return memberships.map(member=>({userId:member.user_id,role:member.role,name:names.get(member.user_id)?.trim()||'Workspace member'}))
}

export async function updateOnboarding(organizationId:string,step:number,completed=false):Promise<OrganizationRow> {
  if(step<1||step>7)throw new Error('Onboarding step must be between 1 and 7.')
  const {data,error}=await requireSupabase().from('organizations').update({onboarding_step:step,onboarding_completed_at:completed?new Date().toISOString():null}).eq('id',organizationId).select().single()
  if(error)throwServiceError(error,'Unable to save onboarding progress.')
  return data
}

export type OrganizationSettingsInput={name:string;industry:string;website:string;phone:string;country:string;timezone:string}
export async function saveOrganizationSettings(organizationId:string,input:OrganizationSettingsInput):Promise<OrganizationRow>{
  const {data,error}=await requireSupabase().rpc('update_organization_settings',{target_org:organizationId,organization_name:input.name,organization_industry:input.industry,organization_website:input.website,organization_phone:input.phone,organization_country:input.country,organization_timezone:input.timezone})
  if(error)throwServiceError(error,'Unable to save organization settings.')
  return data
}
