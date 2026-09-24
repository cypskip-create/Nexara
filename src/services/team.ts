import type { InvitationRow, MemberRole } from '../types/database'
import { requireSupabase, throwServiceError } from './api'
import { listOrganizationMembers } from './organizations'

export async function listTeam(organizationId:string){return listOrganizationMembers(organizationId)}
export async function listInvitations(organizationId:string):Promise<InvitationRow[]>{const {data,error}=await requireSupabase().from('invitations').select('*').eq('organization_id',organizationId).is('accepted_at',null).order('created_at',{ascending:false});if(error)throwServiceError(error,'Unable to load invitations.');return data??[]}
async function invoke(body:Record<string,unknown>){const {data,error}=await requireSupabase().functions.invoke('team-invitations',{body});if(error)throwServiceError(error,'Unable to update the team.');return data}
export const inviteMember=(organizationId:string,email:string,role:MemberRole)=>invoke({action:'invite',organizationId,email,role})
export const updateMemberRole=(organizationId:string,userId:string,role:MemberRole)=>invoke({action:'update-role',organizationId,userId,role})
export const revokeInvitation=(organizationId:string,invitationId:string)=>invoke({action:'revoke',organizationId,invitationId})
export async function acceptInvitation(token:string){const {data,error}=await requireSupabase().rpc('accept_invitation',{invite_token:token});if(error)throwServiceError(error,'Unable to accept invitation.');return data}
