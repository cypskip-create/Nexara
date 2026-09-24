import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.57.4'

function required(name:string){const value=Deno.env.get(name);if(!value)throw new Error(`${name} is not configured.`);return value}

export function userClient(request:Request){
  const authorization=request.headers.get('Authorization')
  if(!authorization?.startsWith('Bearer '))throw new Error('Not authenticated.')
  return createClient(required('SUPABASE_URL'),required('SUPABASE_ANON_KEY'),{global:{headers:{Authorization:authorization}},auth:{persistSession:false}})
}

export function adminClient(){return createClient(required('SUPABASE_URL'),required('SUPABASE_SERVICE_ROLE_KEY'),{auth:{persistSession:false}})}

export async function requireUser(request:Request){
  const client=userClient(request)
  const {data,error}=await client.auth.getUser()
  if(error||!data.user)throw new Error('Not authenticated.')
  return {client,user:data.user}
}

export function requireSecret(name:string){return required(name)}
