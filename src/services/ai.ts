export type QualificationResult = {
  summary: string
  score: number
  scoreReasons: string[]
  answers: Record<string, string>
  nextAction: 'FOLLOW_UP' | 'HUMAN_HANDOFF' | 'ASK_QUESTION' | 'NONE'
}

export function validateQualificationResult(value: unknown): QualificationResult {
  if (!value || typeof value !== 'object') throw new Error('AI response must be an object')
  const result = value as Record<string, unknown>
  if (typeof result.summary !== 'string' || !result.summary.trim()) throw new Error('AI response is missing a summary')
  if (typeof result.score !== 'number' || result.score < 0 || result.score > 100) throw new Error('AI score must be between 0 and 100')
  if (!Array.isArray(result.scoreReasons) || result.scoreReasons.some((reason) => typeof reason !== 'string')) throw new Error('AI score reasons are invalid')
  if (!result.answers || typeof result.answers !== 'object' || Array.isArray(result.answers)) throw new Error('AI answers must be a key-value object')
  const allowedActions = ['FOLLOW_UP', 'HUMAN_HANDOFF', 'ASK_QUESTION', 'NONE']
  if (typeof result.nextAction !== 'string' || !allowedActions.includes(result.nextAction)) throw new Error('AI next action is invalid')
  return { summary: result.summary.trim(), score: Math.round(result.score), scoreReasons: result.scoreReasons as string[], answers: result.answers as Record<string, string>, nextAction: result.nextAction as QualificationResult['nextAction'] }
}

export async function qualifyConversation(_conversationId: string): Promise<QualificationResult> {
  throw new Error('AI provider is not configured. Add a server-side AI adapter before enabling live qualification.')
}
