import {requireSupabase,throwServiceError} from './api'
export type PublicInquiry={type:'CONTACT'|'DEMO';name:string;email:string;phone:string;company:string;interest:string;message:string;website:string}
export async function submitPublicInquiry(input:PublicInquiry){const {data,error}=await requireSupabase().functions.invoke('public-inquiry',{body:input});if(error)throwServiceError(error,'Unable to submit your enquiry.');return data as {received:boolean}}
