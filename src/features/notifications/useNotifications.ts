import {useCallback,useEffect,useState} from 'react'
import {supabase} from '../../lib/supabase'
import {listNotifications,markAllNotificationsRead,markNotificationRead} from '../../services/notifications'
import type {NotificationRow} from '../../types/database'

export function useNotifications(organizationId:string|undefined,enabled:boolean){
  const [items,setItems]=useState<NotificationRow[]>([])
  const refresh=useCallback(async()=>{if(!enabled||!organizationId){setItems([]);return}setItems(await listNotifications(organizationId))},[enabled,organizationId])
  useEffect(()=>{void refresh()},[refresh])
  useEffect(()=>{if(!enabled||!organizationId||!supabase)return;const client=supabase;const channel=client.channel(`notifications:${organizationId}`).on('postgres_changes',{event:'*',schema:'public',table:'notifications',filter:`organization_id=eq.${organizationId}`},()=>void refresh()).subscribe();return()=>{void client.removeChannel(channel)}},[enabled,organizationId,refresh])
  const read=async(id:string)=>{await markNotificationRead(id);await refresh()}
  const readAll=async()=>{if(!organizationId)return;await markAllNotificationsRead(organizationId);await refresh()}
  return {items,unread:items.filter(item=>!item.read_at).length,read,readAll,refresh}
}
