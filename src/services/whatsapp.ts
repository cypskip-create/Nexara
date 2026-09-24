import { requireSupabase, throwServiceError } from './api'
export { parseWhatsAppInbound, verifyWhatsAppWebhook } from './provider-validation'
export type { WhatsAppInboundMessage } from './provider-validation'

export async function sendWhatsAppMessage(conversationId:string,text:string){
  const body=text.trim()
  if(!body)throw new Error('Message text is required.')
  const {data,error}=await requireSupabase().functions.invoke('whatsapp-send',{body:{conversationId,text:body}})
  if(error)throwServiceError(error,'Unable to send the WhatsApp message.')
  return data.message as {id:string;body:string;external_id:string;created_at:string}
}

// The access token and verification token must be supplied only by a server-side webhook handler.
