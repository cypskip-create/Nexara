import {useCallback,useEffect,useState} from 'react'
import {requireSupabase} from '../../services/api'
import type {ProfileRow} from '../../types/database'

export function useUserProfile(userId:string|undefined,enabled:boolean){
  const [profile,setProfile]=useState<ProfileRow|null>(null)
  const refresh=useCallback(async()=>{
    if(!enabled||!userId){setProfile(null);return}
    const {data,error}=await requireSupabase().from('profiles').select('*').eq('id',userId).single()
    if(!error)setProfile(data)
  },[enabled,userId])
  useEffect(()=>{void refresh()},[refresh])
  return {profile,refresh}
}
