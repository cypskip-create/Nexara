import { requireSupabase, throwServiceError } from './api'
import { validateQualificationResult } from './provider-validation'
import type { QualificationResult } from './provider-validation'

export { validateQualificationResult }
export type { QualificationResult }

export async function qualifyConversation(conversationId: string): Promise<QualificationResult> {
  const {data,error}=await requireSupabase().functions.invoke('ai-qualify',{body:{conversationId}})
  if(error)throwServiceError(error,'Unable to qualify the conversation.')
  return validateQualificationResult(data?.qualification)
}
