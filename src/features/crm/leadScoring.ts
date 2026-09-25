import type {LeadDraft,WorkspaceLead} from './types'

export type ScoreFactor={label:string;points:number;reason:string}
export function scoreLead(lead:Partial<LeadDraft|WorkspaceLead>){
  const factors:ScoreFactor[]=[]
  const add=(label:string,points:number,reason:string)=>factors.push({label,points,reason})
  if(lead.email||lead.phone)add('Contactability',15,'Email or phone is available')
  if(lead.interest?.trim())add('Stated interest',20,'A specific need has been recorded')
  if(lead.value&&lead.value!=='Not set')add('Budget/value',20,'A budget or opportunity value is known')
  const fields=lead.customFields??{}
  if(Object.keys(fields).length)add('Qualification',Math.min(20,Object.keys(fields).length*7),'Qualification details are complete')
  if(lead.nextAction&&lead.nextAction!=='Make first contact')add('Next step',10,'A concrete next action is planned')
  if(lead.source&&lead.source!=='Manual')add('Inbound intent',10,`The lead arrived from ${lead.source}`)
  if(lead.owner&&lead.owner!=='Unassigned')add('Ownership',5,'A team member owns the follow-up')
  return {score:Math.min(100,factors.reduce((sum,factor)=>sum+factor.points,0)),factors}
}
