export type NotificationKind = 'QUALIFIED_LEAD' | 'ASSIGNMENT' | 'FOLLOW_UP' | 'AUTOMATION_FAILURE' | 'INTEGRATION_FAILURE'
export type NotificationEvent = { organizationId: string; userId: string; kind: NotificationKind; title: string; body?: string }

export function notificationCopy(event: NotificationEvent) {
  return { ...event, title: event.title.trim(), body: event.body?.trim() }
}

export function canNotify(event: NotificationEvent) {
  return Boolean(event.organizationId && event.userId && event.title.trim())
}
