import type { ContactRow } from '../types/database'
import { requireSupabase, throwServiceError } from './api'

export type ContactInput={name:string;email?:string|null;phone?:string|null;company?:string|null;tags?:string[]}
const normalize=(input:ContactInput)=>({name:input.name.trim(),email:input.email?.trim().toLowerCase()||null,phone:input.phone?.trim()||null,company:input.company?.trim()||null,tags:[...new Set((input.tags??[]).map(tag=>tag.trim()).filter(Boolean))]})

export async function listContacts(organizationId:string,search=''):Promise<ContactRow[]> {
  const client=requireSupabase()
  let query=client.from('contacts').select('*').eq('organization_id',organizationId).order('updated_at',{ascending:false}).limit(100)
  const term=search.trim().replaceAll(/[,%()]/g,'')
  if(term)query=query.or(`name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%,company.ilike.%${term}%`)
  const {data,error}=await query
  if(error)throwServiceError(error,'Unable to load contacts.')
  return data??[]
}

export async function createContact(organizationId:string,input:ContactInput):Promise<ContactRow> {
  const contact=normalize(input)
  if(!contact.name)throw new Error('Contact name is required.')
  const {data,error}=await requireSupabase().rpc('upsert_contact',{target_org:organizationId,contact_name:contact.name,contact_email:contact.email,contact_phone:contact.phone,contact_company:contact.company,contact_tags:contact.tags})
  if(error)throwServiceError(error,'Unable to create the contact.')
  return data
}

export async function updateContact(contactId:string,organizationId:string,input:ContactInput):Promise<ContactRow> {
  const contact=normalize(input)
  if(!contact.name)throw new Error('Contact name is required.')
  const {data,error}=await requireSupabase().rpc('update_contact',{target_contact:contactId,target_org:organizationId,contact_name:contact.name,contact_email:contact.email,contact_phone:contact.phone,contact_company:contact.company,contact_tags:contact.tags})
  if(error)throwServiceError(error,'Unable to update the contact.')
  return data
}
