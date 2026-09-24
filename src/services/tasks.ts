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
