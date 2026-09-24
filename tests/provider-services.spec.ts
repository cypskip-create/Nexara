import {expect,test} from '@playwright/test'
import {parseWhatsAppInbound,validateQualificationResult} from '../src/services/provider-validation'

test('qualification output accepts the strict product contract',()=>{
  expect(validateQualificationResult({summary:'Ready for handoff',score:84,scoreReasons:['Budget confirmed'],answers:{budget:'KSh 20M'},nextAction:'HUMAN_HANDOFF'})).toEqual({summary:'Ready for handoff',score:84,scoreReasons:['Budget confirmed'],answers:{budget:'KSh 20M'},nextAction:'HUMAN_HANDOFF'})
  expect(()=>validateQualificationResult({summary:'Invalid',score:101,scoreReasons:[],answers:{},nextAction:'NONE'})).toThrow(/between 0 and 100/)
})

test('WhatsApp parser accepts text messages and ignores unsupported events',()=>{
  const payload={entry:[{changes:[{value:{messages:[
    {id:'wamid.1',from:'254700000001',timestamp:'1700000000',type:'text',text:{body:'I need a viewing'}},
    {id:'wamid.2',from:'254700000001',timestamp:'1700000001',type:'image'},
  ]}}]}]}
  expect(parseWhatsAppInbound(payload)).toEqual([{phone:'254700000001',messageId:'wamid.1',text:'I need a viewing',receivedAt:'2023-11-14T22:13:20.000Z'}])
  expect(parseWhatsAppInbound({entry:[]})).toEqual([])
})
