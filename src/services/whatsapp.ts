export type WhatsAppInboundMessage = { phone: string; messageId: string; text: string; receivedAt: string }

export function verifyWhatsAppWebhook(mode: string | null, token: string | null, challenge: string | null, expectedToken: string): string | null {
  if (!expectedToken || mode !== 'subscribe' || token !== expectedToken) return null
  return challenge
}

export function parseWhatsAppInbound(payload: unknown): WhatsAppInboundMessage[] {
  if (!payload || typeof payload !== 'object') return []
  const root = payload as { entry?: Array<{ changes?: Array<{ value?: { messages?: Array<{ id?: string; from?: string; timestamp?: string; text?: { body?: string } }> } }> }> }
  return (root.entry ?? []).flatMap((entry) => (entry.changes ?? []).flatMap((change) => (change.value?.messages ?? []).flatMap((message) => {
    if (!message.id || !message.from || !message.text?.body) return []
    return [{ phone: message.from, messageId: message.id, text: message.text.body, receivedAt: message.timestamp ? new Date(Number(message.timestamp) * 1000).toISOString() : new Date().toISOString() }]
  })))
}

// The access token and verification token must be supplied only by a server-side webhook handler.
