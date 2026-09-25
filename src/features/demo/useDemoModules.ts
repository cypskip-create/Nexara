import {useEffect,useState} from 'react'

export type DemoMessage={id:string;from:'customer'|'ai'|'human'|'note';text:string;at:string}
export type DemoConversation={id:string;contactId:string;channel:string;status:'OPEN'|'CLOSED';humanTakeover:boolean;messages:DemoMessage[]}
export type DemoKnowledge={id:string;title:string;type:'FAQ'|'PRODUCT'|'SERVICE'|'POLICY'|'GENERAL';content:string;status:'ACTIVE'|'DRAFT'}
export type DemoAutomation={id:string;name:string;status:'ACTIVE'|'PAUSED';trigger:string;minimum:number;action:'notify_owner'|'create_task'|'set_stage';delayHours:number}
export type DemoRun={id:string;automationId:string;leadName:string;status:'SUCCEEDED'|'SKIPPED';at:string;detail:string}
export type DemoModulesState={conversations:DemoConversation[];knowledge:DemoKnowledge[];automations:DemoAutomation[];runs:DemoRun[];assistant:{name:string;welcome:string;tone:string;questions:string[];enabled:boolean};settings:{name:string;industry:string;website:string;phone:string;timezone:string}}

const key='nexara-demo-modules-v1'
const at='2026-09-23T10:45:00.000Z'
const seed:DemoModulesState={
  conversations:[
    {id:'demo-conversation-james',contactId:'contact-lead-james',channel:'Website',status:'OPEN',humanTakeover:false,messages:[{id:'j1',from:'customer',text:"I'm looking for a 3-bedroom apartment in Kilimani.",at},{id:'j2',from:'ai',text:'Welcome! What budget range are you considering?',at},{id:'j3',from:'customer',text:'Around KSh 18–22M, and I would like to move within three months.',at}]},
    {id:'demo-conversation-aisha',contactId:'contact-lead-aisha',channel:'WhatsApp',status:'OPEN',humanTakeover:false,messages:[{id:'a1',from:'customer',text:'Can I schedule a viewing?',at}]},
    {id:'demo-conversation-brian',contactId:'contact-lead-brian',channel:'Referral',status:'CLOSED',humanTakeover:true,messages:[{id:'b1',from:'customer',text:'Thanks for the details.',at}]},
  ],
  knowledge:[{id:'k1',title:'Kilimani apartments',type:'PRODUCT',content:'Modern 3-bedroom apartments from KSh 18M with flexible viewing times.',status:'ACTIVE'},{id:'k2',title:'Viewing and booking FAQ',type:'FAQ',content:'Viewings can be requested through the sales team. Availability is confirmed by an agent.',status:'ACTIVE'},{id:'k3',title:'About Acacia Properties',type:'GENERAL',content:'Acacia Properties is a fictional company used in the LeadFlow demo.',status:'ACTIVE'}],
  automations:[],runs:[],
  assistant:{name:'Nexara Concierge',welcome:'Hi there! How can I help you today?',tone:'Friendly',questions:['What are you interested in?','What budget range should we consider?','When do you plan to purchase?'],enabled:false},
  settings:{name:'Acacia Properties',industry:'Real estate',website:'https://acaciaproperties.example',phone:'+254 700 000 000',timezone:'Africa/Nairobi'},
}
function read():DemoModulesState{try{const value=JSON.parse(localStorage.getItem(key)??'null') as DemoModulesState|null;return value?.conversations&&value.knowledge&&value.automations&&value.assistant&&value.settings?{...value,automations:value.automations.map(item=>({...item,trigger:item.trigger??'LEAD_CREATED'}))}:seed}catch{return seed}}
export function useDemoModules(){const [state,setState]=useState<DemoModulesState>(read);useEffect(()=>{localStorage.setItem(key,JSON.stringify(state))},[state]);return {state,update:(change:(current:DemoModulesState)=>DemoModulesState)=>setState(current=>{const next=change(current);localStorage.setItem(key,JSON.stringify(next));return next})}}
export const demoId=()=>crypto.randomUUID()
