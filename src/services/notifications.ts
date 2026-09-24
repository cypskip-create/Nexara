import type { NotificationRow } from '../types/database'
import { requireSupabase, throwServiceError } from './api'

export type NotificationKind = 'QUALIFIED_LEAD' | 'ASSIGNMENT' | 'FOLLOW_UP' | 'AUTOMATION_FAILURE' | 'INTEGRATION_FAILURE'
export type NotificationEvent = { organizationId: string; userId: string; kind: NotificationKind; title: string; body?: string }

export function notificationCopy(event: NotificationEvent) {
  return { ...event, title: event.title.trim(), body: event.body?.trim() }
}

export function canNotify(event: NotificationEvent) {
  return Boolean(event.organizationId && event.userId && event.title.trim())
}

export async function listNotifications(organizationId:string):Promise<NotificationRow[]>{
  const {data,error}=await requireSupabase().from('notifications').select('*').eq('organization_id',organizationId).order('created_at',{ascending:false}).limit(30)
  if(error)throwServiceError(error,'Unable to load notifications.')
  return data??[]
}
export async function markNotificationRead(id:string){const {error}=await requireSupabase().from('notifications').update({read_at:new Date().toISOString()}).eq('id',id);if(error)throwServiceError(error,'Unable to update notification.')}
export async function markAllNotificationsRead(organizationId:string){const {error}=await requireSupabase().from('notifications').update({read_at:new Date().toISOString()}).eq('organization_id',organizationId).is('read_at',null);if(error)throwServiceError(error,'Unable to update notifications.')}
export async function emailNotification(notificationId:string){const {data,error}=await requireSupabase().functions.invoke('notification-email',{body:{notificationId}});if(error)throwServiceError(error,'Unable to email notification.');return data}
