import {adminClient,requireSecret} from '../_shared/supabase.ts'
import {parseInbound,verifyMetaSignature} from '../_shared/whatsapp.ts'

const reply=(body:string,status=200)=>new Response(body,{status,headers:{'Content-Type':'text/plain','Cache-Control':'no-store'}})

Deno.serve(async request=>{
  if(request.method==='GET'){
    const url=new URL(request.url)
    const valid=url.searchParams.get('hub.mode')==='subscribe'&&url.searchParams.get('hub.verify_token')===requireSecret('WHATSAPP_VERIFY_TOKEN')
    return valid?reply(url.searchParams.get('hub.challenge')??''):reply('Forbidden',403)
  }
  if(request.method!=='POST')return reply('Method not allowed',405)
  try{
    const rawBody=await request.text()
    if(rawBody.length>1_000_000)return reply('Payload too large',413)
    if(!await verifyMetaSignature(rawBody,request.headers.get('x-hub-signature-256'),requireSecret('WHATSAPP_APP_SECRET')))return reply('Invalid signature',401)
    const inbound=parseInbound(JSON.parse(rawBody))
    const admin=adminClient()
    for(const message of inbound){
      if(!/^\d{7,20}$/.test(message.phone))continue
      const {data:integration}=await admin.from('integrations').select('organization_id').eq('provider','WHATSAPP').eq('status','CONNECTED').eq('public_config->>phone_number_id',message.phoneNumberId).maybeSingle()
      if(!integration)continue
      const {data:duplicate}=await admin.from('messages').select('id').eq('organization_id',integration.organization_id).eq('external_id',message.messageId).maybeSingle()
      if(duplicate)continue
      let {data:contact}=await admin.from('contacts').select('*').eq('organization_id',integration.organization_id).or(`phone.eq.${message.phone},phone.eq.+${message.phone}`).limit(1).maybeSingle()
      if(!contact){
        const created=await admin.from('contacts').insert({organization_id:integration.organization_id,name:`WhatsApp ${message.phone.slice(-4)}`,phone:`+${message.phone}`,tags:['WhatsApp']}).select().single()
        if(created.error)throw created.error
        contact=created.data
      }
      let {data:conversation}=await admin.from('conversations').select('*').eq('organization_id',integration.organization_id).eq('contact_id',contact.id).eq('channel','WHATSAPP').neq('status','CLOSED').order('updated_at',{ascending:false}).limit(1).maybeSingle()
      if(!conversation){
        const created=await admin.from('conversations').insert({organization_id:integration.organization_id,contact_id:contact.id,channel:'WHATSAPP',status:'OPEN',last_message_at:message.receivedAt}).select().single()
        if(created.error)throw created.error
        conversation=created.data
        await admin.from('analytics_events').insert({organization_id:integration.organization_id,event_name:'conversation_started',entity_type:'conversation',entity_id:conversation.id,properties:{channel:'WHATSAPP'}})
      }
      const inserted=await admin.from('messages').insert({organization_id:integration.organization_id,conversation_id:conversation.id,sender_type:'CUSTOMER',body:message.text,external_id:message.messageId,created_at:message.receivedAt})
      if(inserted.error&&inserted.error.code!=='23505')throw inserted.error
      await admin.from('conversations').update({last_message_at:message.receivedAt,updated_at:new Date().toISOString(),status:'OPEN'}).eq('id',conversation.id).eq('organization_id',integration.organization_id)
    }
    return reply('EVENT_RECEIVED')
  }catch(reason){
    console.error('whatsapp_webhook_failed',reason instanceof Error?reason.message:'unknown')
    return reply('Webhook processing failed',500)
  }
})
