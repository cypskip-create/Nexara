import type {SubscriptionRow} from '../types/database'
import {requireSupabase,throwServiceError} from './api'
export type BillingPlan='STARTER'|'GROWTH'|'PRO'
export const planLimits:Record<BillingPlan,{users:number;monthlyLeads:number;automations:number}>={STARTER:{users:2,monthlyLeads:100,automations:3},GROWTH:{users:5,monthlyLeads:500,automations:15},PRO:{users:25,monthlyLeads:5000,automations:100}}
export function isWithinLimit(plan:BillingPlan,resource:keyof typeof planLimits.STARTER,current:number){return current<planLimits[plan][resource]}
export async function getSubscription(organizationId:string):Promise<SubscriptionRow|null>{const {data,error}=await requireSupabase().from('subscriptions').select('*').eq('organization_id',organizationId).maybeSingle();if(error)throwServiceError(error,'Unable to load billing.');return data}
async function billing(body:Record<string,unknown>){const {data,error}=await requireSupabase().functions.invoke('billing',{body});if(error)throwServiceError(error,'Unable to open billing.');if(!data?.url)throw new Error('Billing provider did not return a destination.');window.location.assign(data.url)}
export const startCheckout=(organizationId:string,plan:BillingPlan)=>billing({action:'checkout',organizationId,plan})
export const openBillingPortal=(organizationId:string)=>billing({action:'portal',organizationId})
