import type { TaskRow } from '../types/database'
import { requireSupabase, throwServiceError } from './api'

export async function listTasks(organizationId:string):Promise<TaskRow[]> {
  const {data,error}=await requireSupabase().from('tasks').select('*').eq('organization_id',organizationId).order('due_at',{ascending:true,nullsFirst:false}).limit(200)
  if(error)throwServiceError(error,'Unable to load follow-up tasks.')
  return data??[]
}

export async function completeTask(taskId:string,organizationId:string):Promise<TaskRow> {
  const completedAt=new Date().toISOString()
  const {data,error}=await requireSupabase().from('tasks').update({status:'COMPLETED',completed_at:completedAt,updated_at:completedAt}).eq('id',taskId).eq('organization_id',organizationId).eq('status','OPEN').select().single()
  if(error)throwServiceError(error,'Unable to complete the follow-up task.')
  return data
}

export type TaskInput={title:string;description:string;priority:'LOW'|'NORMAL'|'HIGH'|'URGENT';dueAt:string|null;leadId:string|null;assignedTo:string|null}
export async function createTask(organizationId:string,input:TaskInput):Promise<TaskRow>{
  const {data,error}=await requireSupabase().from('tasks').insert({organization_id:organizationId,title:input.title.trim(),description:input.description.trim()||null,priority:input.priority,due_at:input.dueAt,lead_id:input.leadId,assigned_to:input.assignedTo}).select().single()
  if(error)throwServiceError(error,'Unable to create the task.')
  return data
}
export async function updateTask(taskId:string,organizationId:string,input:TaskInput):Promise<TaskRow>{
  const {data,error}=await requireSupabase().from('tasks').update({title:input.title.trim(),description:input.description.trim()||null,priority:input.priority,due_at:input.dueAt,lead_id:input.leadId,assigned_to:input.assignedTo,updated_at:new Date().toISOString()}).eq('id',taskId).eq('organization_id',organizationId).select().single()
  if(error)throwServiceError(error,'Unable to update the task.')
  return data
}
export async function cancelTask(taskId:string,organizationId:string):Promise<TaskRow>{
  const {data,error}=await requireSupabase().from('tasks').update({status:'CANCELLED',updated_at:new Date().toISOString()}).eq('id',taskId).eq('organization_id',organizationId).eq('status','OPEN').select().single()
  if(error)throwServiceError(error,'Unable to cancel the task.')
  return data
}
