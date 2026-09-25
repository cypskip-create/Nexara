import {corsHeaders,json,readJson} from '../_shared/http.ts'
import {adminClient,requireSecret} from '../_shared/supabase.ts'

const encode=(value:string)=>new TextEncoder().encode(value)
async function signature(secret:string,payload:string){const key=await crypto.subtle.importKey('raw',encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);return [...new Uint8Array(await crypto.subtle.sign('HMAC',key,encode(payload)))].map(value=>value.toString(16).padStart(2,'0')).join('')}

Deno.serve(async request=>{
  if(request.method==='OPTIONS')return new Response(null,{headers:corsHeaders})
  if(request.method!=='POST')return json({error:'Method not allowed.'},405)
  const internalSecret=requireSecret('AUTOMATION_CRON_SECRET')
  if(request.headers.get('x-cron-secret')!==internalSecret)return json({error:'Unauthorized.'},401)
  const signingSecret=requireSecret('WEBHOOK_SIGNING_SECRET')
  const body=await readJson<{organizationId:string;event:string;data:unknown}>(request),admin=adminClient()
  const {data:endpoints,error}=await admin.from('webhook_endpoints').select('*').eq('organization_id',body.organizationId).eq('enabled',true).contains('events',[body.event])
  if(error)return json({error:'Unable to load webhook endpoints.'},500)
  const results=[]
  for(const endpoint of endpoints??[]){
    const eventId=crypto.randomUUID(),payload=JSON.stringify({id:eventId,type:body.event,created_at:new Date().toISOString(),data:body.data})
    const {data:delivery}=await admin.from('webhook_deliveries').insert({organization_id:body.organizationId,endpoint_id:endpoint.id,event_type:body.event,event_id:eventId,status:'PENDING'}).select().single()
    try{
      const response=await fetch(endpoint.url,{method:'POST',headers:{'content-type':'application/json','x-nexara-event':body.event,'x-nexara-signature':`sha256=${await signature(`${signingSecret}:${body.organizationId}`,payload)}`},body:payload})
      await admin.from('webhook_deliveries').update({status:response.ok?'SUCCEEDED':'FAILED',response_status:response.status,error_code:response.ok?null:'NON_SUCCESS_RESPONSE',delivered_at:new Date().toISOString()}).eq('id',delivery.id)
      results.push({endpointId:endpoint.id,status:response.status})
    }catch{
      await admin.from('webhook_deliveries').update({status:'FAILED',error_code:'NETWORK_ERROR',delivered_at:new Date().toISOString()}).eq('id',delivery.id)
      results.push({endpointId:endpoint.id,status:0})
    }
  }
  return json({delivered:results.length,results})
})
