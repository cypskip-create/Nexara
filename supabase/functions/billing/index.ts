import {corsHeaders,errorResponse,json,readJson} from '../_shared/http.ts'
import {requireSecret,requireUser} from '../_shared/supabase.ts'

type Plan='STARTER'|'GROWTH'|'PRO'
const priceKeys:Record<Plan,string>={STARTER:'STRIPE_PRICE_STARTER',GROWTH:'STRIPE_PRICE_GROWTH',PRO:'STRIPE_PRICE_PRO'}
async function stripe(path:string,params:URLSearchParams){const response=await fetch(`https://api.stripe.com/v1/${path}`,{method:'POST',headers:{Authorization:`Bearer ${requireSecret('STRIPE_SECRET_KEY')}`,'Content-Type':'application/x-www-form-urlencoded'},body:params});const payload=await response.json();if(!response.ok)throw new Error(payload?.error?.message??'Billing provider rejected the request.');return payload as {url?:string}}

Deno.serve(async request=>{
  if(request.method==='OPTIONS')return new Response(null,{headers:corsHeaders})
  if(request.method!=='POST')return json({error:'Method not allowed.'},405)
  try{
    const {client,user}=await requireUser(request)
    const body=await readJson<{action:'checkout'|'portal';organizationId:string;plan?:Plan}>(request)
    const {data:membership,error:membershipError}=await client.from('organization_members').select('role').eq('organization_id',body.organizationId).eq('user_id',user.id).single()
    if(membershipError||!membership||!['OWNER','ADMIN'].includes(membership.role))throw new Error('Authorization requires an owner or admin role.')
    const {data:subscription}=await client.from('subscriptions').select('*').eq('organization_id',body.organizationId).maybeSingle()
    const origin=requireSecret('APP_ORIGIN')
    if(body.action==='portal'){
      if(!subscription?.provider_customer_id)throw new Error('Start a subscription before opening the billing portal.')
      const result=await stripe('billing_portal/sessions',new URLSearchParams({customer:subscription.provider_customer_id,return_url:`${origin}/#app`}))
      return json({url:result.url})
    }
    const plan=body.plan??'STARTER'
    if(!priceKeys[plan])throw new Error('Choose a valid plan.')
    const params=new URLSearchParams({'mode':'subscription','line_items[0][price]':requireSecret(priceKeys[plan]),'line_items[0][quantity]':'1','success_url':`${origin}/#app`,'cancel_url':`${origin}/#app`,'client_reference_id':body.organizationId,'metadata[organization_id]':body.organizationId,'metadata[plan]':plan,'subscription_data[metadata][organization_id]':body.organizationId,'subscription_data[metadata][plan]':plan,'allow_promotion_codes':'true'})
    if(subscription?.provider_customer_id)params.set('customer',subscription.provider_customer_id);else if(user.email)params.set('customer_email',user.email)
    const result=await stripe('checkout/sessions',params)
    return json({url:result.url})
  }catch(reason){return errorResponse(reason,'Unable to start billing.')}
})
