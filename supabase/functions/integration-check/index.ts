import {corsHeaders,errorResponse,json,readJson} from '../_shared/http.ts'
import {adminClient,requireUser} from '../_shared/supabase.ts'

type Provider='WHATSAPP'|'WEBSITE'|'EMAIL'|'WEBHOOK'
const required:Record<Provider,string[]>={WHATSAPP:['WHATSAPP_ACCESS_TOKEN','WHATSAPP_APP_SECRET','WHATSAPP_PHONE_NUMBER_ID','WHATSAPP_VERIFY_TOKEN'],WEBSITE:[],EMAIL:['RESEND_API_KEY','EMAIL_FROM'],WEBHOOK:['WEBHOOK_SIGNING_SECRET']}

Deno.serve(async request=>{
  if(request.method==='OPTIONS')return new Response(null,{headers:corsHeaders})
  if(request.method!=='POST')return json({error:'Method not allowed.'},405)
  try{
    const {client,user}=await requireUser(request)
    const {organizationId,provider}=await readJson<{organizationId:string;provider:Provider}>(request)
    if(!required[provider])throw new Error('Unsupported integration provider.')
    const {data:membership,error}=await client.from('organization_members').select('role').eq('organization_id',organizationId).eq('user_id',user.id).single()
    if(error||!membership||!['OWNER','ADMIN'].includes(membership.role))throw new Error('Authorization requires an owner or admin role.')
    const missing=required[provider].filter(name=>!Deno.env.get(name))
    const admin=adminClient()
    const {count:endpointCount}=provider==='WEBHOOK'?await admin.from('webhook_endpoints').select('*',{count:'exact',head:true}).eq('organization_id',organizationId).eq('enabled',true):{count:0}
    const connected=provider==='WEBSITE'||missing.length===0&&(provider!=='WEBHOOK'||Boolean(endpointCount))
    const status=connected?'CONNECTED':'SETUP_REQUIRED'
    const publicConfig=provider==='WEBSITE'?{capture_endpoint:'public-inquiry',ready:true}:provider==='WEBHOOK'?{ready:connected,endpoint_count:endpointCount??0,signing_ready:missing.length===0}:provider==='WHATSAPP'?{phone_number_id:Deno.env.get('WHATSAPP_PHONE_NUMBER_ID')??null,configured_fields:required[provider].filter(name=>!missing.includes(name)).length,required_fields:required[provider].length}:{configured_fields:required[provider].filter(name=>!missing.includes(name)).length,required_fields:required[provider].length}
    const {data:integration,error:updateError}=await admin.from('integrations').upsert({organization_id:organizationId,provider,status,public_config:publicConfig,connected_at:connected?new Date().toISOString():null,last_error_code:missing.length?'MISSING_SERVER_CONFIGURATION':provider==='WEBHOOK'&&!endpointCount?'DESTINATION_REQUIRED':null,updated_at:new Date().toISOString()},{onConflict:'organization_id,provider'}).select().single()
    if(updateError)throw updateError
    return json({integration,missing:missing.map(name=>name.replace(/^(WHATSAPP_|RESEND_)/,''))})
  }catch(reason){return errorResponse(reason,'Unable to check integration readiness.')}
})
