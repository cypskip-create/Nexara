import {corsHeaders,errorResponse,json,readJson} from '../_shared/http.ts'
import {adminClient,requireUser} from '../_shared/supabase.ts'

const allowedEvents=['lead.created','lead.qualified','lead.stage_changed','lead.won','lead.lost','automation.failed']
function safeUrl(value:string){const url=new URL(value);if(url.protocol!=='https:')throw new Error('Webhook URLs must use HTTPS.');return url.toString()}

Deno.serve(async request=>{
  if(request.method==='OPTIONS')return new Response(null,{headers:corsHeaders})
  if(request.method!=='POST')return json({error:'Method not allowed.'},405)
  try{
    const {client,user}=await requireUser(request)
    const body=await readJson<{organizationId:string;url:string;events:string[];enabled?:boolean}>(request)
    const {data:membership}=await client.from('organization_members').select('role').eq('organization_id',body.organizationId).eq('user_id',user.id).single()
    if(!membership||!['OWNER','ADMIN'].includes(membership.role))throw new Error('Authorization requires an owner or admin role.')
    const events=[...new Set(body.events)].filter(event=>allowedEvents.includes(event))
    if(!events.length)throw new Error('Select at least one supported event.')
    const admin=adminClient(),url=safeUrl(body.url)
    const {data:endpoint,error}=await admin.from('webhook_endpoints').upsert({organization_id:body.organizationId,url,events,enabled:body.enabled??true,created_by:user.id,updated_at:new Date().toISOString()},{onConflict:'organization_id,url'}).select().single()
    if(error)throw error
    const secretReady=Boolean(Deno.env.get('WEBHOOK_SIGNING_SECRET'))
    await admin.from('integrations').upsert({organization_id:body.organizationId,provider:'WEBHOOK',status:secretReady?'CONNECTED':'SETUP_REQUIRED',public_config:{endpoint_count:1,events,signing_ready:secretReady},last_error_code:secretReady?null:'MISSING_SIGNING_SECRET',connected_at:secretReady?new Date().toISOString():null,updated_at:new Date().toISOString()},{onConflict:'organization_id,provider'})
    return json({endpoint,signingReady:secretReady})
  }catch(reason){return errorResponse(reason,'Unable to save webhook endpoint.')}
})
