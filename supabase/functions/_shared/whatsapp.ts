export type InboundWhatsApp={messageId:string;phone:string;text:string;phoneNumberId:string;receivedAt:string}

export function parseInbound(payload:unknown):InboundWhatsApp[]{
  if(!payload||typeof payload!=='object')return []
  const root=payload as {entry?:Array<{changes?:Array<{value?:{metadata?:{phone_number_id?:string};messages?:Array<{id?:string;from?:string;timestamp?:string;text?:{body?:string};type?:string}>}}>}>}
  return (root.entry??[]).flatMap(entry=>(entry.changes??[]).flatMap(change=>{
    const phoneNumberId=change.value?.metadata?.phone_number_id
    if(!phoneNumberId)return []
    return (change.value?.messages??[]).flatMap(message=>message.id&&message.from&&message.type==='text'&&message.text?.body?[{messageId:message.id,phone:message.from,text:message.text.body.trim().slice(0,8000),phoneNumberId,receivedAt:message.timestamp?new Date(Number(message.timestamp)*1000).toISOString():new Date().toISOString()}]:[])
  }))
}

function hex(bytes:ArrayBuffer){return [...new Uint8Array(bytes)].map(byte=>byte.toString(16).padStart(2,'0')).join('')}

export async function verifyMetaSignature(rawBody:string,signature:string|null,secret:string){
  if(!signature?.startsWith('sha256='))return false
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign'])
  const expected=`sha256=${hex(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(rawBody)))}`
  if(expected.length!==signature.length)return false
  let difference=0
  for(let index=0;index<expected.length;index++)difference|=expected.charCodeAt(index)^signature.charCodeAt(index)
  return difference===0
}
