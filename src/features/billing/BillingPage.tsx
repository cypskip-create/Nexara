import {useEffect,useState} from 'react'
import {getSubscription,openBillingPortal,startCheckout} from '../../services/billing'
import type {BillingPlan} from '../../services/billing'
import type {SubscriptionRow} from '../../types/database'

const plans:{id:BillingPlan;name:string;price:string;features:string[]}[]=[
  {id:'STARTER',name:'Starter',price:'KSh 3,000',features:['2 members','100 leads / month','3 automations']},
  {id:'GROWTH',name:'Growth',price:'KSh 7,500',features:['5 members','500 leads / month','15 automations']},
  {id:'PRO',name:'Pro',price:'KSh 15,000',features:['25 members','5,000 leads / month','100 automations']},
]
export function BillingPage({organizationId,demo,canManage,notify}:{organizationId?:string;demo:boolean;canManage:boolean;notify:(message:string)=>void}){
  const [subscription,setSubscription]=useState<SubscriptionRow|null>(null),[loading,setLoading]=useState(!demo)
  const [previewPlan,setPreviewPlan]=useState<BillingPlan|null>(null)
  useEffect(()=>{if(demo||!organizationId)return;void getSubscription(organizationId).then(setSubscription).catch(reason=>notify(reason instanceof Error?reason.message:'Unable to load billing')).finally(()=>setLoading(false))},[demo,notify,organizationId])
  const action=async(plan:BillingPlan)=>{if(demo){setPreviewPlan(plan);return}if(!organizationId)return;try{await startCheckout(organizationId,plan)}catch(reason){notify(reason instanceof Error?reason.message:'Unable to start checkout')}}
  return <><div className="page-heading"><div><p className="eyebrow">Workspace subscription</p><h1>Billing</h1><p className="subheading">Choose a plan, review subscription status, and manage invoices securely through Stripe.</p></div>{subscription?.provider_customer_id&&canManage&&<button className="btn secondary" onClick={async()=>{try{await openBillingPortal(organizationId!)}catch(reason){notify(reason instanceof Error?reason.message:'Unable to open billing portal')}}}>Manage billing →</button>}</div>
    {loading?<div className="card billing-status">Loading subscription…</div>:<div className="card billing-status"><div><span>Current plan</span><strong>{demo?'Preview':subscription?.plan??'STARTER'}</strong></div><div><span>Status</span><strong>{demo?'NO CHARGE':subscription?.status??'TRIALING'}</strong></div><div><span>Renewal</span><strong>{subscription?.current_period_ends_at?new Date(subscription.current_period_ends_at).toLocaleDateString():'Not scheduled'}</strong></div></div>}
    {!canManage&&!demo&&<div className="integration-notice"><span>ⓘ</span><div><strong>Billing is restricted</strong><p>Only workspace owners and administrators can change the subscription.</p></div></div>}
    <div className="billing-plans">{plans.map(plan=><article className={subscription?.plan===plan.id||demo&&previewPlan===plan.id?'card billing-plan selected':'card billing-plan'} key={plan.id}><span>{subscription?.plan===plan.id?'CURRENT PLAN':'MONTHLY'}</span><h2>{plan.name}</h2><strong>{plan.price}<small>/ month</small></strong><ul>{plan.features.map(feature=><li key={feature}>✓ {feature}</li>)}</ul><button className="btn primary" disabled={!demo&&!canManage||subscription?.plan===plan.id&&subscription.status==='ACTIVE'} onClick={()=>void action(plan.id)}>{subscription?.plan===plan.id?'Current plan':demo&&previewPlan===plan.id?'Selected preview':demo?'Preview plan':'Choose plan'}</button></article>)}</div>{demo&&previewPlan&&<div className="card billing-status" role="status"><div><span>Plan preview</span><strong>{plans.find(plan=>plan.id===previewPlan)?.name}</strong></div><div><span>Monthly price</span><strong>{plans.find(plan=>plan.id===previewPlan)?.price}</strong></div><div><span>Checkout</span><strong>Sign in to subscribe</strong></div></div>}<p className="data-note">{demo?'Preview mode: no checkout or subscription is created.':'Checkout and payment details are hosted by Stripe; provider keys must be configured server-side.'}</p></>
}
