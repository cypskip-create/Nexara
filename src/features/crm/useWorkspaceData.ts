import { useEffect, useMemo, useRef, useState } from 'react'
import type { ContactDraft, LeadDraft, LeadStage, OwnerOption, TimelineEntry, WorkspaceContact, WorkspaceLead, WorkspaceTask } from './types'

const STORAGE_KEY = 'nexara-demo-workspace-v2'
const now = () => new Date().toISOString()
const id = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`

const seedLeads: WorkspaceLead[] = [
  { id:'lead-james', name:'James Mwangi', email:'james@example.com', phone:'+254 712 345 678', company:'Individual buyer', interest:'3-bedroom apartment · Kilimani', source:'Website', stage:'Qualified', score:86, value:'KSh 18–22M', owner:'Cyprian', ownerId:'Cyprian', tags:['High intent','Kilimani'], customFields:{'Preferred move':'December',Financing:'Pre-approved'}, createdAt:'2026-09-22T07:30:00.000Z', lastActivity:'2 min ago', nextAction:'Arrange a viewing', notes:[{id:'event-james',kind:'created',text:'Lead created from website conversation',at:'2026-09-22T07:30:00.000Z'}] },
  { id:'lead-aisha', name:'Aisha Njeri', email:'aisha@example.com', phone:'+254 722 456 789', company:'Njeri Holdings', interest:'Townhouse · Lavington', source:'WhatsApp', stage:'Contacted', score:72, value:'KSh 28M', owner:'Cyprian', ownerId:'Cyprian', tags:['Townhouse'], customFields:{}, createdAt:'2026-09-21T09:10:00.000Z', lastActivity:'1 hour ago', nextAction:'Confirm Saturday viewing', notes:[{id:'event-aisha',kind:'created',text:'Lead created from WhatsApp enquiry',at:'2026-09-21T09:10:00.000Z'}] },
  { id:'lead-brian', name:'Brian Otieno', email:'brian@example.com', phone:'+254 733 567 890', company:'Otieno Consulting', interest:'Serviced apartment · Westlands', source:'Referral', stage:'New', score:54, value:'KSh 12M', owner:'Unassigned', tags:['Referral'], customFields:{}, createdAt:'2026-09-20T11:45:00.000Z', lastActivity:'Yesterday', nextAction:'Make first contact', notes:[{id:'event-brian',kind:'created',text:'Lead added from a referral',at:'2026-09-20T11:45:00.000Z'}] },
]

const seedContacts: WorkspaceContact[] = seedLeads.map(lead => ({ id:`contact-${lead.id}`, name:lead.name, email:lead.email, phone:lead.phone, company:lead.company, tags:lead.tags, type:lead.stage === 'Won' ? 'Customer' : 'Lead', lastActivity:lead.lastActivity }))
type StoredWorkspace = { version:2; leads:WorkspaceLead[]; contacts:WorkspaceContact[] }

function loadWorkspace(): StoredWorkspace {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return { version:2, leads:seedLeads, contacts:seedContacts }
    const parsed = JSON.parse(stored) as StoredWorkspace
    if (parsed.version !== 2 || !Array.isArray(parsed.leads) || !Array.isArray(parsed.contacts)) throw new Error('Unsupported demo workspace')
    return {...parsed,leads:parsed.leads.map(lead=>({...lead,customFields:lead.customFields??{}}))}
  } catch {
    return { version:2, leads:seedLeads, contacts:seedContacts }
  }
}

export function useWorkspaceData() {
  const [data,setData]=useState<StoredWorkspace>(loadWorkspace)
  const [tasks,setTasks]=useState<WorkspaceTask[]>([{id:'demo-task-aisha',leadId:'lead-aisha',leadName:'Aisha Njeri',title:'Confirm Saturday viewing',description:'Follow up on the requested townhouse viewing.',dueAt:new Date(Date.now()+3_600_000).toISOString(),status:'Open',assignee:'Cyprian'}])
  const dataRef=useRef(data)
  useEffect(()=>localStorage.setItem(STORAGE_KEY,JSON.stringify(data)),[data])
  const commit=(change:(current:StoredWorkspace)=>StoredWorkspace)=>{
    const next=change(dataRef.current)
    dataRef.current=next
    localStorage.setItem(STORAGE_KEY,JSON.stringify(next))
    setData(next)
  }
  const activeLeads=useMemo(()=>data.leads.filter(lead=>!lead.archived),[data.leads])
  const append=(kind:TimelineEntry['kind'],text:string):TimelineEntry=>({id:id(),kind,text,at:now()})

  const addLead=(draft:LeadDraft)=>{
    const leadId=id()
    const lead:WorkspaceLead={...draft,id:leadId,createdAt:now(),lastActivity:'Just now',notes:[append('created',`Lead created from ${draft.source}`)]}
    commit(current=>({...current,leads:[lead,...current.leads],contacts:current.contacts.some(contact=>contact.email&&contact.email===lead.email)?current.contacts:[{id:id(),name:lead.name,email:lead.email,phone:lead.phone,company:lead.company,tags:lead.tags,type:'Lead',lastActivity:'Just now'},...current.contacts]}))
    return leadId
  }
  const updateLead=(leadId:string,changes:Partial<WorkspaceLead>,eventText?:string)=>commit(current=>({...current,leads:current.leads.map(lead=>lead.id===leadId?{...lead,...changes,lastActivity:'Just now',notes:eventText?[...lead.notes,append(changes.stage?'stage':'assignment',eventText)]:lead.notes}:lead)}))
  const moveLead=(leadId:string,stage:LeadStage)=>updateLead(leadId,{stage},`Stage changed to ${stage}`)
  const addNote=(leadId:string,text:string,kind:TimelineEntry['kind']='note')=>commit(current=>({...current,leads:current.leads.map(lead=>lead.id===leadId?{...lead,lastActivity:'Just now',notes:[...lead.notes,append(kind,text)]}:lead)}))
  const addFollowUp=(leadId:string,dueAt:string)=>addNote(leadId,`Follow-up scheduled for ${new Date(dueAt).toLocaleString()}`,'follow-up')
  const archiveLeads=(leadIds:string[])=>commit(current=>({...current,leads:current.leads.map(lead=>leadIds.includes(lead.id)?{...lead,archived:true}:lead)}))
  const addContact=(draft:ContactDraft)=>commit(current=>({...current,contacts:[{...draft,id:id(),lastActivity:'Just now'},...current.contacts]}))
  const updateContact=(contactId:string,changes:Partial<WorkspaceContact>)=>commit(current=>({...current,contacts:current.contacts.map(contact=>contact.id===contactId?{...contact,...changes,lastActivity:'Just now'}:contact)}))
  const resetDemo=()=>commit(()=>({version:2,leads:seedLeads,contacts:seedContacts}))
  const completeTask=(taskId:string)=>setTasks(current=>current.map(task=>task.id===taskId?{...task,status:'Completed'}:task))
  const owners:OwnerOption[]=['Cyprian','Sarah','David'].map(owner=>({id:owner,label:owner}))
  return {leads:activeLeads,archivedLeads:data.leads.filter(lead=>lead.archived),contacts:data.contacts,tasks,owners,loading:false,error:'',refresh:async()=>{},addLead,updateLead,moveLead,addNote,addFollowUp,archiveLeads,addContact,updateContact,completeTask,resetDemo}
}
