import {corsHeaders,errorResponse,json,readJson} from '../_shared/http.ts'
import {adminClient,requireUser} from '../_shared/supabase.ts'

type Step={step_type:'CONDITION'|'ACTION';position:number;config:Record<string,unknown>}
type Lead={id:string;organization_id:string;owner_id:string|null;stage:string;source:string|null;score:number;contact_id:string|null}

function conditionPasses(config:Record<string,unknown>,lead:Lead){
  if(config.type==='score_gte')return lead.score>=Number(config.value??0)
  if(config.type==='stage_is')return lead.stage===String(config.value??'')
  if(config.type==='source_is')return lead.source===String(config.value??'')
  if(config.type==='owner_unassigned')return lead.owner_id===null
  return false
}

Deno.serve(async request=>{
  if(request.method==='OPTIONS')return new Response(null,{headers:corsHeaders})
  if(request.method!=='POST')return json({error:'Method not allowed.'},405)
  let runId:string|undefined
  const admin=adminClient()
  try{
    const internalSecret=Deno.env.get('AUTOMATION_CRON_SECRET')
    const internal=Boolean(internalSecret)&&request.headers.get('x-automation-secret')===internalSecret
    const auth=internal?null:await requireUser(request)
    const client=internal?admin:auth!.client
    const userId=auth?.user.id??null
    const {automationId,leadId,triggerEvent='MANUAL_TEST',attempt=1,retryOf}=await readJson<{automationId:string;leadId:string;triggerEvent?:string;attempt?:number;retryOf?:string}>(request)
    if(attempt<1||attempt>3)throw new Error('Invalid automation attempt.')
    const {data:automation,error:automationError}=await client.from('automations').select('*').eq('id',automationId).single()
    if(automationError||!automation)throw new Error('Automation not found.')
    if(automation.status!=='ACTIVE')throw new Error('Automation is not active.')
    const {data:lead,error:leadError}=await client.from('leads').select('*').eq('id',leadId).eq('organization_id',automation.organization_id).single()
    if(leadError||!lead)throw new Error('Lead not found.')
    const {data:steps,error:stepError}=await client.from('automation_steps').select('*').eq('automation_id',automationId).order('position')
    if(stepError)throw stepError
    const {data:run,error:runError}=await admin.from('automation_runs').insert({organization_id:automation.organization_id,automation_id:automationId,lead_id:leadId,status:'RUNNING',trigger_event:triggerEvent,input:{leadId},attempt,max_attempts:3,retry_of:retryOf??null}).select().single()
    if(runError)throw runError
    runId=run.id
    const typedLead=lead as Lead
    const typedSteps=(steps??[]) as Step[]
    if(typedSteps.filter(step=>step.step_type==='CONDITION').some(step=>!conditionPasses(step.config,typedLead))){
      await admin.from('automation_runs').update({status:'SKIPPED',output:{reason:'Conditions did not match.'},finished_at:new Date().toISOString()}).eq('id',runId)
      return json({status:'SKIPPED',runId})
    }
    const completed:string[]=[]
    for(const step of typedSteps.filter(item=>item.step_type==='ACTION')){
      const config=step.config
      if(config.type==='assign_owner'){
        const ownerId=String(config.ownerId??'')||null
        const {error}=await admin.from('leads').update({owner_id:ownerId,updated_at:new Date().toISOString()}).eq('id',leadId).eq('organization_id',automation.organization_id)
        if(error)throw error;completed.push('assign_owner')
      }else if(config.type==='set_stage'){
        const {error}=await admin.from('leads').update({stage:String(config.stage??'QUALIFIED'),updated_at:new Date().toISOString()}).eq('id',leadId).eq('organization_id',automation.organization_id)
        if(error)throw error;completed.push('set_stage')
      }else if(config.type==='create_task'){
        const {error}=await admin.from('tasks').insert({organization_id:automation.organization_id,lead_id:leadId,created_by:userId,assigned_to:typedLead.owner_id,title:String(config.title??'Automation follow-up'),description:'Created by an automation',due_at:new Date(Date.now()+Number(config.delayHours??24)*3600000).toISOString()})
        if(error)throw error;completed.push('create_task')
      }else if(config.type==='notify_owner'&&typedLead.owner_id){
        const {error}=await admin.from('notifications').insert({organization_id:automation.organization_id,user_id:typedLead.owner_id,kind:'AUTOMATION',title:String(config.title??automation.name),body:String(config.body??'A lead matched your automation.')})
        if(error)throw error;completed.push('notify_owner')
      }
    }
    await admin.from('lead_activities').insert({organization_id:automation.organization_id,lead_id:leadId,actor_id:userId,activity_type:'AUTOMATION',body:`Automation “${automation.name}” completed.`,metadata:{automation_id:automationId,run_id:runId,actions:completed,attempt}})
    await admin.from('automation_runs').update({status:'SUCCEEDED',output:{actions:completed},finished_at:new Date().toISOString()}).eq('id',runId)
    return json({status:'SUCCEEDED',runId,actions:completed})
  }catch(reason){
    if(runId){
      const {data:run}=await admin.from('automation_runs').select('attempt,max_attempts').eq('id',runId).single()
      const shouldRetry=Boolean(run&&run.attempt<run.max_attempts)
      await admin.from('automation_runs').update({status:'FAILED',error_code:'EXECUTION_FAILED',output:{message:reason instanceof Error?reason.message:'Execution failed.',retry_scheduled:shouldRetry},next_retry_at:shouldRetry?new Date(Date.now()+Math.pow(2,Number(run?.attempt??1))*60000).toISOString():null,finished_at:new Date().toISOString()}).eq('id',runId)
    }
    return errorResponse(reason,'Unable to run the automation.')
  }
})
