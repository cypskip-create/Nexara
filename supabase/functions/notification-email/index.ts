import {escapeHtml,sendEmail} from '../_shared/email.ts'
import {corsHeaders,errorResponse,json,readJson} from '../_shared/http.ts'
import {requireUser} from '../_shared/supabase.ts'

Deno.serve(async request=>{
  if(request.method==='OPTIONS')return new Response(null,{headers:corsHeaders})
  if(request.method!=='POST')return json({error:'Method not allowed.'},405)
  try{
    const {client,user}=await requireUser(request)
    const {notificationId}=await readJson<{notificationId:string}>(request)
    const {data,error}=await client.from('notifications').select('*').eq('id',notificationId).eq('user_id',user.id).single()
    if(error||!data)throw new Error('Notification not found.')
    if(!user.email)throw new Error('Your account does not have an email address.')
    const result=await sendEmail({to:user.email,subject:data.title,idempotencyKey:`notification-${data.id}`,html:`<h1>${escapeHtml(data.title)}</h1><p>${escapeHtml(data.body??'Open Nexara to review this update.')}</p>`})
    return json({sent:true,id:result.id})
  }catch(reason){return errorResponse(reason,'Unable to email the notification.')}
})
