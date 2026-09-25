export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]
export type MemberRole = 'OWNER' | 'ADMIN' | 'MANAGER' | 'AGENT'
export type DatabaseLeadStage = 'NEW' | 'QUALIFIED' | 'CONTACTED' | 'MEETING' | 'NEGOTIATION' | 'WON' | 'LOST'

type Organization = { id:string; name:string; industry:string|null; website:string|null; phone:string|null; country:string|null; timezone:string|null; onboarding_step:number; onboarding_completed_at:string|null; created_at:string; updated_at:string }
type Profile = { id:string; full_name:string|null; avatar_url:string|null; created_at:string; updated_at:string }
type Membership = { organization_id:string; user_id:string; role:MemberRole; created_at:string }
type Contact = { id:string; organization_id:string; name:string; email:string|null; phone:string|null; company:string|null; tags:string[]; created_at:string; updated_at:string }
type Lead = { id:string; organization_id:string; contact_id:string|null; owner_id:string|null; interest:string|null; source:string|null; stage:DatabaseLeadStage; score:number; estimated_value:number|null; qualification:Json; next_action:string|null; archived_at:string|null; created_at:string; updated_at:string }
type LeadActivity = { id:string; organization_id:string; lead_id:string; actor_id:string|null; activity_type:'CREATED'|'NOTE'|'STAGE_CHANGED'|'ASSIGNED'|'FOLLOW_UP'|'AUTOMATION'|'MESSAGE'|'ARCHIVED'; body:string|null; metadata:Json; created_at:string }
type Task = { id:string; organization_id:string; lead_id:string|null; assigned_to:string|null; created_by:string|null; title:string; description:string|null; status:'OPEN'|'COMPLETED'|'CANCELLED'; due_at:string|null; completed_at:string|null; created_at:string; updated_at:string }
type Invitation = { id:string; organization_id:string; email:string; role:MemberRole; token_hash:string; invited_by:string; expires_at:string; accepted_at:string|null; created_at:string }
type Automation = { id:string; organization_id:string; name:string; status:'DRAFT'|'ACTIVE'|'PAUSED'|'ERROR'; trigger_type:string; created_by:string|null; created_at:string; updated_at:string }
type AutomationStep = { id:string; automation_id:string; organization_id:string; step_type:'CONDITION'|'ACTION'; position:number; config:Json; created_at:string }
type AutomationRun = { id:string; organization_id:string; automation_id:string; lead_id:string|null; status:'RUNNING'|'SUCCEEDED'|'FAILED'|'SKIPPED'; trigger_event:string; input:Json; output:Json; error_code:string|null; started_at:string; finished_at:string|null }
type Notification = { id:string; organization_id:string; user_id:string; kind:string; title:string; body:string|null; read_at:string|null; created_at:string }
type Subscription = { id:string; organization_id:string; plan:'STARTER'|'GROWTH'|'PRO'; status:'TRIALING'|'ACTIVE'|'PAST_DUE'|'CANCELLED'|'INCOMPLETE'; billing_interval:'MONTHLY'|'YEARLY'; provider:string|null; provider_customer_id:string|null; provider_subscription_id:string|null; trial_ends_at:string|null; current_period_ends_at:string|null; created_at:string; updated_at:string }

type Table<Row, Insert = Partial<Row>, Update = Partial<Insert>> = { Row:Row; Insert:Insert; Update:Update; Relationships:[] }

export interface Database {
  public: {
    Tables: {
      organizations: Table<Organization, Pick<Organization,'name'> & Partial<Organization>>
      profiles: Table<Profile, Pick<Profile,'id'> & Partial<Profile>>
      organization_members: Table<Membership, Membership>
      contacts: Table<Contact, Pick<Contact,'organization_id'|'name'> & Partial<Contact>>
      leads: Table<Lead, Pick<Lead,'organization_id'> & Partial<Lead>>
      lead_activities: Table<LeadActivity, Pick<LeadActivity,'organization_id'|'lead_id'|'activity_type'> & Partial<LeadActivity>>
      tasks: Table<Task, Pick<Task,'organization_id'|'title'> & Partial<Task>>
      invitations: Table<Invitation, Pick<Invitation,'organization_id'|'email'|'token_hash'|'invited_by'|'expires_at'> & Partial<Invitation>>
      automations: Table<Automation, Pick<Automation,'organization_id'|'name'|'trigger_type'> & Partial<Automation>>
      automation_steps: Table<AutomationStep, Pick<AutomationStep,'automation_id'|'organization_id'|'step_type'> & Partial<AutomationStep>>
      automation_runs: Table<AutomationRun, Pick<AutomationRun,'organization_id'|'automation_id'|'status'|'trigger_event'> & Partial<AutomationRun>>
      notifications: Table<Notification, Pick<Notification,'organization_id'|'user_id'|'kind'|'title'> & Partial<Notification>>
      subscriptions: Table<Subscription, Pick<Subscription,'organization_id'> & Partial<Subscription>>
    }
    Views: Record<string, never>
    Functions: {
      create_organization: { Args:{ org_name:string }; Returns:string }
      create_lead_with_contact: { Args:{ target_org:string; contact_name:string; contact_email?:string|null; contact_phone?:string|null; contact_company?:string|null; lead_interest?:string|null; lead_source?:string|null; lead_stage?:DatabaseLeadStage; lead_score?:number; lead_value?:number|null; lead_owner?:string|null; lead_next_action?:string|null; lead_tags?:string[]; lead_qualification?:Json }; Returns:Lead }
      transition_lead: { Args:{ target_lead:string; target_org:string; next_stage:DatabaseLeadStage }; Returns:Lead }
      assign_lead: { Args:{ target_lead:string; target_org:string; next_owner:string|null }; Returns:Lead }
      add_lead_note: { Args:{ target_lead:string; target_org:string; note_body:string }; Returns:LeadActivity }
      schedule_lead_follow_up: { Args:{ target_lead:string; target_org:string; task_title:string; task_due_at:string; task_assignee?:string|null }; Returns:Task }
      archive_lead: { Args:{ target_lead:string; target_org:string }; Returns:Lead }
      accept_invitation: { Args:{ invite_token:string }; Returns:string }
      upsert_contact: { Args:{ target_org:string; contact_name:string; contact_email?:string|null; contact_phone?:string|null; contact_company?:string|null; contact_tags?:string[] }; Returns:Contact }
      update_contact: { Args:{ target_contact:string; target_org:string; contact_name:string; contact_email?:string|null; contact_phone?:string|null; contact_company?:string|null; contact_tags?:string[] }; Returns:Contact }
    }
    Enums: { member_role:MemberRole; lead_stage:DatabaseLeadStage }
    CompositeTypes: Record<string, never>
  }
}

export type OrganizationRow = Organization
export type ContactRow = Contact
export type LeadRow = Lead
export type LeadActivityRow = LeadActivity
export type TaskRow = Task
export type InvitationRow = Invitation
export type AutomationRow = Automation
export type AutomationStepRow = AutomationStep
export type AutomationRunRow = AutomationRun
export type NotificationRow = Notification
export type SubscriptionRow = Subscription
