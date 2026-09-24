import { useCallback, useEffect, useState } from 'react'
import { createOrganization, listOrganizations } from '../../services/organizations'
import type { OrganizationSummary } from '../../services/organizations'

const ACTIVE_ORG_KEY='nexara-active-organization'

export function useOrganizations(enabled:boolean){
  const [organizations,setOrganizations]=useState<OrganizationSummary[]>([])
  const [activeId,setActiveIdState]=useState(()=>localStorage.getItem(ACTIVE_ORG_KEY))
  const [loading,setLoading]=useState(enabled)
  const [error,setError]=useState('')
  const refresh=useCallback(async()=>{
    if(!enabled){setOrganizations([]);setLoading(false);return}
    setLoading(true);setError('')
    try{
      const rows=await listOrganizations()
      setOrganizations(rows)
      setActiveIdState(current=>{
        const next=rows.some(row=>row.id===current)?current:rows[0]?.id??null
        if(next)localStorage.setItem(ACTIVE_ORG_KEY,next);else localStorage.removeItem(ACTIVE_ORG_KEY)
        return next
      })
    }catch(reason){setError(reason instanceof Error?reason.message:'Unable to load workspaces.')}
    finally{setLoading(false)}
  },[enabled])
  useEffect(()=>{void refresh()},[refresh])
  const setActiveId=(id:string)=>{if(organizations.some(row=>row.id===id)){localStorage.setItem(ACTIVE_ORG_KEY,id);setActiveIdState(id)}}
  const create=async(name:string)=>{const id=await createOrganization(name);await refresh();setActiveId(id);return id}
  return {organizations,activeOrganization:organizations.find(row=>row.id===activeId)??null,activeId,loading,error,refresh,setActiveId,create}
}
