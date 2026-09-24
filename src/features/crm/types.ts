export const leadStages = ['New', 'Qualified', 'Contacted', 'Meeting', 'Negotiation', 'Won', 'Lost'] as const
export type LeadStage = typeof leadStages[number]

export type TimelineEntry = {
  id: string
  kind: 'created' | 'stage' | 'assignment' | 'note' | 'follow-up'
  text: string
  at: string
}

export type WorkspaceLead = {
  id: string
  name: string
  email: string
  phone: string
  company: string
  interest: string
  source: string
  stage: LeadStage
  score: number
  value: string
  owner: string
  tags: string[]
  createdAt: string
  lastActivity: string
  nextAction: string
  notes: TimelineEntry[]
  archived?: boolean
}

export type WorkspaceContact = {
  id: string
  name: string
  email: string
  phone: string
  company: string
  tags: string[]
  type: 'Lead' | 'Prospect' | 'Customer'
  lastActivity: string
}

export type LeadDraft = Pick<WorkspaceLead, 'name' | 'email' | 'phone' | 'company' | 'interest' | 'source' | 'stage' | 'score' | 'value' | 'owner' | 'tags' | 'nextAction'>
export type ContactDraft = Pick<WorkspaceContact, 'name' | 'email' | 'phone' | 'company' | 'tags' | 'type'>
