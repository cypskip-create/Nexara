import {requireSecret} from './supabase.ts'

export function escapeHtml(value:string){return value.replace(/[&<>"']/g,character=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]??character))}

export async function sendEmail(input:{to:string;subject:string;html:string;idempotencyKey:string}){
  const response=await fetch('https://api.resend.com/emails',{
    method:'POST',
    headers:{Authorization:`Bearer ${requireSecret('RESEND_API_KEY')}`,'Content-Type':'application/json','Idempotency-Key':input.idempotencyKey},
    body:JSON.stringify({from:requireSecret('EMAIL_FROM'),to:[input.to],subject:input.subject,html:input.html}),
  })
  const payload=await response.json().catch(()=>({}))
  if(!response.ok)throw new Error(`Email provider rejected the request (${response.status}).`)
  return payload as {id?:string}
}
