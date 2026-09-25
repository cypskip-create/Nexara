import {corsHeaders,errorResponse,json,readJson} from '../_shared/http.ts'
import {adminClient,requireSecret} from '../_shared/supabase.ts'

type Inquiry={type:'CONTACT'|'DEMO';name:string;email:string;phone?:string;company?:string;interest?:string;message:string;website?:string}
const hex=(bytes:ArrayBuffer)=>[...new Uint8Array(bytes)].map(value=>value.toString(16).padStart(2,'0')).join('')

Deno.serve(async request=>{
  if(request.method==='OPTIONS')return new Response(null,{headers:corsHeaders})
  if(request.method!=='POST')return json({error:'Method not allowed.'},405)
  try{
    const body=await readJson<Inquiry>(request,16_000)
    if(body.website)return json({received:true})
    const name=body.name?.trim(),email=body.email?.trim().toLowerCase(),message=body.message?.trim()
    if(!['CONTACT','DEMO'].includes(body.type)||!name||name.length>120||!email||!/^\S+@\S+\.\S+$/.test(email)||!message||message.length>3000)throw new Error('Complete the required enquiry fields.')
    const ip=request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()??'unknown'
    const hashSecret=Deno.env.get('INQUIRY_HASH_SECRET')??requireSecret('SUPABASE_SERVICE_ROLE_KEY')
    const ipHash=hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(`${hashSecret}:${ip}`)))
    const admin=adminClient()
    const since=new Date(Date.now()-3600000).toISOString()
    const {count}=await admin.from('website_inquiries').select('id',{count:'exact',head:true}).eq('ip_hash',ipHash).gte('created_at',since)
    if((count??0)>=5)return json({error:'Too many requests. Please try again later.'},429)
    const {error}=await admin.from('website_inquiries').insert({inquiry_type:body.type,name,email,phone:body.phone?.trim()||null,company:body.company?.trim()||null,interest:body.interest?.trim()||null,message,ip_hash:ipHash,user_agent:request.headers.get('user-agent')?.slice(0,500)??null})
    if(error)throw error
    return json({received:true},201)
  }catch(reason){return errorResponse(reason,'Unable to save your enquiry.')}
})
