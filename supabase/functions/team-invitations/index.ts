import {escapeHtml,sendEmail} from '../_shared/email.ts'
import {corsHeaders,errorResponse,json,readJson} from '../_shared/http.ts'
import {adminClient,requireUser} from '../_shared/supabase.ts'

type Role='OWNER'|'ADMIN'|'MANAGER'|'AGENT'
type Input={action:'invite'|'update-role'|'revoke';organizationId:string;email?:string;role?:Role;userId?:string;invitationId?:string}
const roles:Role[]=['OWNER','ADMIN','MANAGER','AGENT']
const hex=(bytes:ArrayBuffer)=>[...new Uint8Array(bytes)].map(value=>value.toString(16).padStart(2,'0')).join('')

Deno.serve(async request=>{
  if(request.method==='OPTIONS')return new Response(null,{headers:corsHeaders})
  if(request.method!=='POST')return json({error:'Method not allowed.'},405)
  try{
    const {client,user}=await requireUser(request)
    const body=await readJson<Input>(request)
    const {data:membership,error:membershipError}=await client.from('organization_members').select('role').eq('organization_id',body.organizationId).eq('user_id',user.id).single()
    if(membershipError||!membership||!['OWNER','ADMIN'].includes(membership.role))throw new Error('Authorization requires an owner or admin role.')
    const admin=adminClient()

    if(body.action==='invite'){
      const email=body.email?.trim().toLowerCase()??''
      const role=body.role??'AGENT'
      if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new Error('Enter a valid email address.')
      if(!roles.includes(role))throw new Error('Choose a valid role.')
      if(role==='OWNER'&&membership.role!=='OWNER')throw new Error('Only an owner can invite another owner.')
      const token=`${crypto.randomUUID()}${crypto.randomUUID()}`
      const tokenHash=hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token)))
      await admin.from('invitations').delete().eq('organization_id',body.organizationId).eq('email',email).is('accepted_at',null)
      const {data:invitation,error}=await admin.from('invitations').insert({organization_id:body.organizationId,email,role,token_hash:tokenHash,invited_by:user.id,expires_at:new Date(Date.now()+7*86400000).toISOString()}).select().single()
      if(error)throw error
      const {data:organization}=await admin.from('organizations').select('name').eq('id',body.organizationId).single()
      const origin=Deno.env.get('APP_ORIGIN')??'http://localhost:5173'
      const link=`${origin}/?invite=${encodeURIComponent(token)}#app`
      await sendEmail({to:email,subject:`Join ${organization?.name??'a Nexara workspace'}`,idempotencyKey:`invite-${invitation.id}`,html:`<h1>You are invited</h1><p>You have been invited to join <strong>${escapeHtml(organization?.name??'a Nexara workspace')}</strong> as ${escapeHtml(role.toLowerCase())}.</p><p><a href="${escapeHtml(link)}">Accept invitation</a></p><p>This link expires in seven days.</p>`})
      return json({invitation})
    }

    if(body.action==='update-role'){
      if(!body.userId||!body.role||!roles.includes(body.role))throw new Error('A member and valid role are required.')
      const {data:target,error:targetError}=await admin.from('organization_members').select('role').eq('organization_id',body.organizationId).eq('user_id',body.userId).single()
      if(targetError||!target)throw new Error('Member not found.')
      if((target.role==='OWNER'||body.role==='OWNER')&&membership.role!=='OWNER')throw new Error('Only an owner can change owner access.')
      const {error}=await admin.from('organization_members').update({role:body.role}).eq('organization_id',body.organizationId).eq('user_id',body.userId)
      if(error)throw error
      return json({updated:true})
    }

    if(!body.invitationId)throw new Error('Invitation is required.')
    const {error}=await admin.from('invitations').delete().eq('id',body.invitationId).eq('organization_id',body.organizationId).is('accepted_at',null)
    if(error)throw error
    return json({revoked:true})
  }catch(reason){return errorResponse(reason,'Unable to manage the team invitation.')}
})
