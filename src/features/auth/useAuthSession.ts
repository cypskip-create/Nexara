import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'

export function useAuthSession(){
  const [session,setSession]=useState<Session|null>(null)
  const [loading,setLoading]=useState(Boolean(supabase))
  useEffect(()=>{
    if(!supabase){setLoading(false);return}
    let mounted=true
    supabase.auth.getSession().then(({data})=>{if(mounted){setSession(data.session);setLoading(false)}})
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,nextSession)=>{setSession(nextSession);setLoading(false)})
    return()=>{mounted=false;subscription.unsubscribe()}
  },[])
  return {session,user:session?.user??null,loading}
}
