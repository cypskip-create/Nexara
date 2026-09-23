export type Plan = 'STARTER' | 'GROWTH' | 'PRO'
export type Subscription = { plan: Plan; status: 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED'; interval: 'MONTHLY' | 'YEARLY'; trialEndsAt?: string; renewsAt?: string }

export const planLimits: Record<Plan, { users: number; monthlyLeads: number; automations: number }> = {
  STARTER: { users: 2, monthlyLeads: 100, automations: 3 },
  GROWTH: { users: 5, monthlyLeads: 500, automations: 15 },
  PRO: { users: 25, monthlyLeads: 5000, automations: 100 },
}

export function isWithinLimit(plan: Plan, resource: keyof typeof planLimits.STARTER, current: number) {
  return current < planLimits[plan][resource]
}

export function billingProviderState() {
  return import.meta.env.VITE_BILLING_PROVIDER_KEY ? 'configured-server-side' : 'not-configured'
}
