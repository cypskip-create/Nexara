import {json} from '../_shared/http.ts'
import {adminClient,requireSecret} from '../_shared/supabase.ts'

const hex=(bytes:ArrayBuffer)=>[...new Uint8Array(bytes)].map(value=>value.toString(16).padStart(2,'0')).join('')
async function validSignature(body:string,header:string){const parts=header.split(',').map(part=>part.split('=',2));const timestamp=Number(parts.find(([key])=>key==='t')?.[1]);const signatures=parts.filter(([key])=>key==='v1').map(([,value])=>value);if(!timestamp||Math.abs(Date.now()/1000-timestamp)>300)return false;const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(requireSecret('STRIPE_WEBHOOK_SECRET')),{name:'HMAC',hash:'SHA-256'},false,['sign']);const expected=hex(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(`${timestamp}.${body}`)));return signatures.some(signature=>{if(expected.length!==signature.length)return false;let difference=0;for(let i=0;i<expected.length;i++)difference|=expected.charCodeAt(i)^signature.charCodeAt(i);return difference===0})}
function status(value:string){if(['active','trialing'].includes(value))return value.toUpperCase();if(value==='past_due')return 'PAST_DUE';if(['canceled','unpaid'].includes(value))return 'CANCELLED';return 'INCOMPLETE'}

Deno.serve(async request=>{
  if(request.method!=='POST')return json({error:'Method not allowed.'},405)
  const raw=await request.text(),signature=request.headers.get('stripe-signature')??''
  if(!await validSignature(raw,signature))return json({error:'Invalid signature.'},401)
  const admin=adminClient();let eventId=''
  try{
    const event=JSON.parse(raw) as {id:string;type:string;data:{object:Record<string,unknown>}}
    eventId=event.id
    const {error:eventError}=await admin.from('stripe_events').insert({id:event.id,event_type:event.type})
    if(eventError?.code==='23505')return json({received:true,duplicate:true})
    if(eventError)throw eventError
    const object=event.data.object
    if(event.type==='checkout.session.completed'){
      const metadata=object.metadata as Record<string,string>|undefined,organizationId=metadata?.organization_id??String(object.client_reference_id??'')
      if(organizationId)await admin.from('subscriptions').upsert({organization_id:organizationId,plan:metadata?.plan??'STARTER',status:'ACTIVE',provider:'STRIPE',provider_customer_id:String(object.customer??''),provider_subscription_id:String(object.subscription??''),updated_at:new Date().toISOString()},{onConflict:'organization_id'})
    }
    if(event.type.startsWith('customer.subscription.')){
      const metadata=object.metadata as Record<string,string>|undefined,organizationId=metadata?.organization_id
      if(organizationId)await admin.from('subscriptions').upsert({organization_id:organizationId,plan:metadata?.plan??'STARTER',status:status(String(object.status??'')),provider:'STRIPE',provider_customer_id:String(object.customer??''),provider_subscription_id:String(object.id??''),current_period_ends_at:object.current_period_end?new Date(Number(object.current_period_end)*1000).toISOString():null,updated_at:new Date().toISOString()},{onConflict:'organization_id'})
    }
    return json({received:true})
  }catch{if(eventId)await admin.from('stripe_events').delete().eq('id',eventId);return json({error:'Webhook processing failed.'},500)}
})
