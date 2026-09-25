export const heroSteps = ['Enquiry received', 'AI asks the right questions', 'Details captured', 'Lead created', 'Qualified', 'Added to pipeline', 'Assigned to Sarah']
export const qualification = [['Interest', '3-bedroom apartment'], ['Budget', 'KSh 18M–22M'], ['Location', 'Kilimani'], ['Timeline', '3 months'], ['Contact', 'James Mwangi · demo contact']]
export const industries = {
  'Real Estate': ['Property preference', 'Budget', 'Viewing', 'Agent'],
  Automotive: ['Vehicle', 'Budget', 'Financing', 'Salesperson'],
  Logistics: ['Origin & destination', 'Cargo', 'Timing', 'Quote'],
  Education: ['Course', 'Entry requirements', 'Intake', 'Admissions'],
  Travel: ['Destination', 'Dates', 'Budget', 'Itinerary'],
  'Professional Services': ['Service', 'Scope', 'Deadline', 'Consultation'],
  'Other SMEs': ['Customer need', 'Requirements', 'Timeline', 'Your team'],
}
export const journey = [
  ['Customer', 'Someone has a need. Meet them on the channels they already use.'],
  ['Conversation', 'Capture the enquiry and keep the context together.'],
  ['AI qualification', 'Ask the questions your team uses to understand fit.'],
  ['Lead', 'Turn answers into a structured record with a clear next step.'],
  ['Pipeline', 'See the opportunity’s current stage and owner.'],
  ['Automation', 'Use explicit rules to schedule the next action.'],
  ['Salesperson', 'Hand over the conversation with its context intact.'],
  ['Customer won', 'Record the outcome when your team closes the deal.'],
  ['Analytics', 'Review sources, qualification and conversion to improve the process.'],
]
export const faqs = [
  ['What is LeadFlow?', 'LeadFlow brings lead capture, AI qualification, CRM, follow-up and analytics into one workspace. The public walkthrough uses a fictional business, Acacia Properties, to show the intended journey.'],
  ['Is LeadFlow just a chatbot?', 'No. Conversations are the starting point. Lead records, ownership, pipeline stages, follow-up and reporting help a team work the opportunity after the chat.'],
  ['How does AI qualification work?', 'The intended assistant asks approved questions and structures the answers into a lead record. The demonstrations on this page are scripted; live provider-backed AI is not enabled in this preview.'],
  ['Can I choose what questions LeadFlow asks?', 'Lead records support persistent custom qualification fields alongside structured AI output, so teams can retain the details their sales process needs.'],
  ['Can my team take over conversations?', 'Human handoff is part of the workflow. Try the inbox demonstration here to see the transition. Live channel delivery and takeover still require production integration.'],
  ['Does LeadFlow work with WhatsApp?', 'Secure inbound and outbound WhatsApp Cloud API functions are implemented. A workspace administrator must configure Meta credentials before messages can be delivered.'],
  ['Can LeadFlow work on my website?', 'Yes. Administrators can brand an embeddable enquiry widget, restrict it to approved website origins and copy an installation snippet. Its secure capture endpoint creates the contact and lead inside the correct workspace.'],
  ['Can multiple employees use LeadFlow?', 'Owners and administrators can invite teammates by email and manage owner, admin, manager and agent roles. Invite links are hashed, expire after seven days and require a matching signed-in email.'],
  ['Can I customize my sales pipeline?', 'You can explore stage changes in the demo workspace. Organization-specific stage configuration is planned; the demonstration uses a fixed set of stages.'],
  ['Can I automate follow-ups?', 'Yes. The workflow studio supports event triggers, multiple conditions and sequenced actions such as team alerts, task creation, assignment and stage updates. Dry runs validate a workflow without changing customer records, and every execution is recorded.'],
  ['What happens if the AI does not know an answer?', 'The intended behavior is to acknowledge uncertainty and offer a human handoff. Try the price question in the scripted assistant demo to see this behavior.'],
  ['Is my business data separated from other companies?', 'Workspace data uses tenant identifiers, row-level security and role-aware database commands. Executable isolation tests cover memberships, profiles and cross-workspace access.'],
  ['Which businesses can use LeadFlow?', 'The initial focus is Kenyan real-estate teams. Configurable qualification and workflows are designed to support other SMEs; try the industry examples above.'],
  ['Can I cancel my subscription?', 'No payment or subscription is created by this preview. Published prices are proposed monthly plans; cancellation and billing terms will be available before paid subscriptions launch.'],
  ['Do I need technical knowledge?', 'The workspace is designed for business teams. Production channel setup may require help from an administrator or implementation partner. You can explore the demo without credentials.'],
]
export const demoLeads = [
  { name:'James Mwangi', interest:'3-bedroom apartment · Kilimani', source:'Website', stage:'Qualified', score:86, value:'KSh 18–22M', owner:'Sarah' },
  { name:'Aisha Njeri', interest:'Townhouse · Lavington', source:'WhatsApp', stage:'Contacted', score:72, value:'KSh 28M', owner:'Sarah' },
  { name:'Brian Otieno', interest:'Serviced apartment · Westlands', source:'Referral', stage:'Won', score:80, value:'KSh 12M', owner:'David' },
  { name:'Wanjiku Kamau', interest:'Office space · Nairobi', source:'Email', stage:'New', score:45, value:'Not set', owner:'Unassigned' },
]
