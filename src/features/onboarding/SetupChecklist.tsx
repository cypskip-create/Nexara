import type {WorkspaceLead} from '../crm/types'
import {useEffect,useState} from 'react'
import {requireSupabase} from '../../services/api'

type Props={leads:WorkspaceLead[];knowledgeCount:number;automationCount:number;assistantReady:boolean;isDemo:boolean;organizationId?:string;onNavigate:(page:string)=>void}
export function SetupChecklist({leads,knowledgeCount,automationCount,assistantReady,isDemo,organizationId,onNavigate}:Props){
  const [live,setLive]=useState({knowledge:knowledgeCount,automations:automationCount,assistant:assistantReady,source:isDemo,team:isDemo})
  useEffect(()=>{if(!organizationId)return;const client=requireSupabase();void Promise.all([client.from('knowledge_items').select('id',{count:'exact',head:true}).eq('organization_id',organizationId),client.from('automations').select('id',{count:'exact',head:true}).eq('organization_id',organizationId),client.from('ai_configs').select('enabled').eq('organization_id',organizationId).maybeSingle(),client.from('integrations').select('id',{count:'exact',head:true}).eq('organization_id',organizationId).eq('status','CONNECTED'),client.from('organization_members').select('user_id',{count:'exact',head:true}).eq('organization_id',organizationId)]).then(([knowledge,automations,assistant,source,team])=>setLive({knowledge:knowledge.count??0,automations:automations.count??0,assistant:Boolean(assistant.data?.enabled),source:(source.count??0)>0,team:(team.count??0)>1}))},[organizationId])
  const dismissed=localStorage.getItem('nexara-setup-dismissed')==='true'
  if(dismissed)return null
  const items=[
    {label:'Add business information',done:true,page:'Settings'},
    {label:'Configure AI assistant',done:live.assistant,page:'AI Assistant'},
    {label:'Add knowledge',done:live.knowledge>0,page:'Knowledge'},
    {label:'Connect a lead source',done:live.source,page:'Integrations'},
    {label:'Add your first lead',done:leads.length>0,page:'Leads'},
    {label:'Create an automation',done:live.automations>0,page:'Automations'},
    {label:'Invite a teammate',done:live.team,page:'Team'},
  ]
  const complete=items.filter(item=>item.done).length
  return <section className="card setup-checklist"><div className="card-head"><div><p className="eyebrow">Getting started</p><h2>Launch your workspace</h2><p>{complete} of {items.length} steps complete</p></div><button className="text-btn" onClick={()=>{localStorage.setItem('nexara-setup-dismissed','true');location.reload()}}>Dismiss</button></div><div className="setup-progress"><i style={{width:`${complete/items.length*100}%`}}/></div><div className="setup-items">{items.map(item=><button key={item.label} className={item.done?'done':''} onClick={()=>onNavigate(item.page)}><span>{item.done?'✓':'○'}</span>{item.label}<b>→</b></button>)}</div></section>
}
