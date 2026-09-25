import {corsHeaders,json} from '../_shared/http.ts'
import {adminClient,requireSecret} from '../_shared/supabase.ts'

Deno.serve(async request=>{
  if(request.method==='OPTIONS')return new Response(null,{headers:corsHeaders})
  if(request.method!=='POST')return json({error:'Method not allowed.'},405)
  const cronSecret=requireSecret('AUTOMATION_CRON_SECRET')
  if(request.headers.get('x-cron-secret')!==cronSecret)return json({error:'Unauthorized.'},401)
  const admin=adminClient()
  const {data:runs,error}=await admin.from('automation_runs').select('id,automation_id,lead_id,trigger_event,attempt,max_attempts').eq('status','FAILED').not('next_retry_at','is',null).lte('next_retry_at',new Date().toISOString()).order('next_retry_at').limit(25)
  if(error)return json({error:'Unable to load retry queue.'},500)
  const results=[]
  for(const run of runs??[]){
    if(!run.lead_id||run.attempt>=run.max_attempts)continue
    await admin.from('automation_runs').update({next_retry_at:null}).eq('id',run.id)
    const response=await fetch(`${requireSecret('SUPABASE_URL')}/functions/v1/automation-run`,{method:'POST',headers:{'content-type':'application/json','x-automation-secret':cronSecret},body:JSON.stringify({automationId:run.automation_id,leadId:run.lead_id,triggerEvent:run.trigger_event,attempt:run.attempt+1,retryOf:run.id})})
    results.push({runId:run.id,accepted:response.ok})
  }
  return json({processed:results.length,results})
})
