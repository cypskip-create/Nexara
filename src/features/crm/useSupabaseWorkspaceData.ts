import { useCallback, useEffect, useMemo, useState } from 'react'
import { createContact, listContacts, updateContact as saveContact } from '../../services/contacts'
import { addLeadNote, archiveLead, assignLead, createLead, listLeads, listWorkspaceActivity, moveLead as transitionLead, scheduleFollowUp, updateLeadFields } from '../../services/leads'
import { listOrganizationMembers } from '../../services/organizations'
import { completeTask as markTaskComplete, listTasks } from '../../services/tasks'
import type { ContactRow, DatabaseLeadStage, LeadActivityRow, LeadRow, TaskRow } from '../../types/database'
import type { ContactDraft, LeadDraft, LeadStage, OwnerOption, TimelineEntry, WorkspaceContact, WorkspaceLead, WorkspaceTask } from './types'

const stageToDatabase:Record<LeadStage,DatabaseLeadStage>={New:'NEW',Qualified:'QUALIFIED',Contacted:'CONTACTED',Meeting:'MEETING',Negotiation:'NEGOTIATION',Won:'WON',Lost:'LOST'}
const stageFromDatabase:Record<DatabaseLeadStage,LeadStage>={NEW:'New',QUALIFIED:'Qualified',CONTACTED:'Contacted',MEETING:'Meeting',NEGOTIATION:'Negotiation',WON:'Won',LOST:'Lost'}
const eventKinds:Record<LeadActivityRow['activity_type'],TimelineEntry['kind']>={CREATED:'created',NOTE:'note',STAGE_CHANGED:'stage',ASSIGNED:'assignment',FOLLOW_UP:'follow-up',AUTOMATION:'note',MESSAGE:'note',ARCHIVED:'note'}

function money(value:number|null){return value===null?'Not set':new Intl.NumberFormat('en-KE',{style:'currency',currency:'KES',maximumFractionDigits:0}).format(value)}
function numericValue(value:string){
  const match=value.replaceAll(',','').match(/[\d.]+/)
  if(!match)return null
  const amount=Number(match[0])
  if(!Number.isFinite(amount))return null
  return /m\b/i.test(value)?amount*1_000_000:/k\b/i.test(value)?amount*1_000:amount
}
function activityLabel(date:string){
  const elapsed=Date.now()-new Date(date).getTime()
  if(elapsed<60_000)return 'Just now'
  if(elapsed<3_600_000)return `${Math.floor(elapsed/60_000)} min ago`
  if(elapsed<86_400_000)return `${Math.floor(elapsed/3_600_000)} hours ago`
  return new Date(date).toLocaleDateString()
}

export function useSupabaseWorkspaceData(organizationId:string|undefined,enabled:boolean){
  const [rows,setRows]=useState<LeadRow[]>([])
  const [contactRows,setContactRows]=useState<ContactRow[]>([])
  const [activityRows,setActivityRows]=useState<LeadActivityRow[]>([])
  const [taskRows,setTaskRows]=useState<TaskRow[]>([])
  const [owners,setOwners]=useState<OwnerOption[]>([])
  const [loading,setLoading]=useState(false)
  const [error,setError]=useState('')

  const refresh=useCallback(async()=>{
    if(!enabled||!organizationId){setRows([]);setContactRows([]);setActivityRows([]);setTaskRows([]);setOwners([]);setError('');return}
    setLoading(true);setError('')
    try{
      const [nextLeads,nextContacts,nextActivity,nextTasks,members]=await Promise.all([listLeads(organizationId,true),listContacts(organizationId),listWorkspaceActivity(organizationId),listTasks(organizationId),listOrganizationMembers(organizationId)])
      setRows(nextLeads);setContactRows(nextContacts);setActivityRows(nextActivity);setTaskRows(nextTasks);setOwners(members.map(member=>({id:member.userId,label:member.name})))
    }catch(reason){setError(reason instanceof Error?reason.message:'Unable to load workspace data.')}
    finally{setLoading(false)}
  },[enabled,organizationId])

  useEffect(()=>{void refresh()},[refresh])

  const contactsById=useMemo(()=>new Map(contactRows.map(contact=>[contact.id,contact])),[contactRows])
  const ownerNames=useMemo(()=>new Map(owners.map(owner=>[owner.id,owner.label])),[owners])
  const activitiesByLead=useMemo(()=>{
    const grouped=new Map<string,TimelineEntry[]>()
    for(const activity of activityRows){
      const current=grouped.get(activity.lead_id)??[]
      current.push({id:activity.id,kind:eventKinds[activity.activity_type],text:activity.body??activity.activity_type.replaceAll('_',' ').toLowerCase(),at:activity.created_at})
      grouped.set(activity.lead_id,current)
    }
    return grouped
  },[activityRows])

  const mappedLeads=useMemo<WorkspaceLead[]>(()=>rows.map(lead=>{
    const contact=lead.contact_id?contactsById.get(lead.contact_id):undefined
    return {id:lead.id,contactId:lead.contact_id,name:contact?.name??'Unnamed lead',email:contact?.email??'',phone:contact?.phone??'',company:contact?.company??'',interest:lead.interest??'No interest recorded',source:lead.source??'Manual',stage:stageFromDatabase[lead.stage],score:lead.score,value:money(lead.estimated_value),owner:lead.owner_id?ownerNames.get(lead.owner_id)??'Workspace member':'Unassigned',ownerId:lead.owner_id,tags:contact?.tags??[],createdAt:lead.created_at,lastActivity:activityLabel(lead.updated_at),nextAction:lead.next_action??'Make first contact',notes:activitiesByLead.get(lead.id)??[],archived:Boolean(lead.archived_at)}
  }),[activitiesByLead,contactsById,ownerNames,rows])
  const leads=useMemo(()=>mappedLeads.filter(lead=>!lead.archived),[mappedLeads])
  const contacts=useMemo<WorkspaceContact[]>(()=>contactRows.map(contact=>{
    const related=rows.filter(lead=>lead.contact_id===contact.id&&!lead.archived_at)
    return {id:contact.id,name:contact.name,email:contact.email??'',phone:contact.phone??'',company:contact.company??'',tags:contact.tags,type:related.some(lead=>lead.stage==='WON')?'Customer':related.length?'Lead':'Prospect',lastActivity:activityLabel(contact.updated_at)}
  }),[contactRows,rows])
  const tasks=useMemo<WorkspaceTask[]>(()=>taskRows.map(task=>({id:task.id,leadId:task.lead_id,leadName:task.lead_id?mappedLeads.find(lead=>lead.id===task.lead_id)?.name??'Lead':'General task',title:task.title,description:task.description??'',dueAt:task.due_at,status:task.status==='OPEN'?'Open':task.status==='COMPLETED'?'Completed':'Cancelled',assignee:task.assigned_to?ownerNames.get(task.assigned_to)??'Workspace member':'Unassigned'})),[mappedLeads,ownerNames,taskRows])

  const run=async<T,>(operation:()=>Promise<T>)=>{setError('');try{const result=await operation();await refresh();return result}catch(reason){const message=reason instanceof Error?reason.message:'The workspace update failed.';setError(message);throw reason}}
  const addLead=(draft:LeadDraft)=>run(async()=>{const created=await createLead({organizationId:organizationId!,name:draft.name,email:draft.email,phone:draft.phone,company:draft.company,interest:draft.interest,source:draft.source,stage:stageToDatabase[draft.stage],score:draft.score,estimatedValue:numericValue(draft.value),ownerId:draft.ownerId||null,nextAction:draft.nextAction,tags:draft.tags});return created.id})
  const updateLead=async(leadId:string,changes:Partial<WorkspaceLead>)=>run(async()=>{
    const current=mappedLeads.find(lead=>lead.id===leadId)
    if(!current)throw new Error('Lead not found.')
    if(changes.stage!==undefined&&changes.stage!==current.stage)await transitionLead(leadId,organizationId!,stageToDatabase[changes.stage])
    if((changes.ownerId!==undefined?changes.ownerId:null)!==current.ownerId&&(changes.ownerId!==undefined||changes.owner!==undefined))await assignLead(leadId,organizationId!,changes.ownerId||null)
    if(changes.interest!==undefined||changes.source!==undefined||changes.score!==undefined||changes.value!==undefined||changes.nextAction!==undefined)await updateLeadFields(leadId,organizationId!,{interest:changes.interest,source:changes.source,score:changes.score,estimatedValue:changes.value===undefined?undefined:numericValue(changes.value),nextAction:changes.nextAction})
    if(current.contactId&&(changes.name!==undefined||changes.email!==undefined||changes.phone!==undefined||changes.company!==undefined||changes.tags!==undefined))await saveContact(current.contactId,organizationId!,{name:changes.name??current.name,email:changes.email??current.email,phone:changes.phone??current.phone,company:changes.company??current.company,tags:changes.tags??current.tags})
  })
  const moveLead=(leadId:string,stage:LeadStage)=>run(()=>transitionLead(leadId,organizationId!,stageToDatabase[stage]))
  const addNote=(leadId:string,text:string)=>run(()=>addLeadNote(leadId,organizationId!,text))
  const addFollowUp=(leadId:string,dueAt:string)=>run(()=>scheduleFollowUp(leadId,organizationId!,'Lead follow-up',dueAt))
  const archiveLeads=(leadIds:string[])=>run(()=>Promise.all(leadIds.map(leadId=>archiveLead(leadId,organizationId!))))
  const addContact=(draft:ContactDraft)=>run(()=>createContact(organizationId!,draft))
  const updateContact=(contactId:string,changes:Partial<WorkspaceContact>)=>run(()=>{const current=contacts.find(contact=>contact.id===contactId);if(!current)throw new Error('Contact not found.');return saveContact(contactId,organizationId!,{name:changes.name??current.name,email:changes.email??current.email,phone:changes.phone??current.phone,company:changes.company??current.company,tags:changes.tags??current.tags})})
  const completeTask=(taskId:string)=>run(()=>markTaskComplete(taskId,organizationId!))

  return {leads,archivedLeads:mappedLeads.filter(lead=>lead.archived),contacts,tasks,owners,loading,error,refresh,addLead,updateLead,moveLead,addNote,addFollowUp,archiveLeads,addContact,updateContact,completeTask,resetDemo:()=>{}}
}
