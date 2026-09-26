export type IndustryProfile={qualification:string[];workflow:string[];outcome:string;example:string}

export const industryProfiles:Record<string,IndustryProfile>={
  'Real Estate':{qualification:['Property type','Location','Budget','Move timeline'],workflow:['Match property','Schedule viewing','Assign agent'],outcome:'Viewing booked',example:'3-bedroom home in Kilimani'},
  Automotive:{qualification:['Vehicle type','Budget','Financing','Purchase timeline'],workflow:['Recommend vehicle','Book test drive','Assign salesperson'],outcome:'Test drive booked',example:'Commercial pickup with financing'},
  Healthcare:{qualification:['Service needed','Location','Preferred date','Insurance / payment'],workflow:['Triage request','Confirm availability','Assign care coordinator'],outcome:'Appointment requested',example:'Dental consultation next week'},
  Education:{qualification:['Programme','Current qualification','Intake','Funding'],workflow:['Check eligibility','Share programme','Assign admissions'],outcome:'Application started',example:'January data-science intake'},
  'Financial Services':{qualification:['Service','Income / turnover band','Timeline','Consent'],workflow:['Assess fit','Request documents','Assign advisor'],outcome:'Consultation booked',example:'SME working-capital enquiry'},
  Insurance:{qualification:['Cover type','Asset / person','Coverage amount','Renewal date'],workflow:['Collect risk details','Prepare quote','Assign advisor'],outcome:'Quote requested',example:'Fleet insurance renewal'},
  'Professional Services':{qualification:['Service','Scope','Deadline','Budget'],workflow:['Clarify scope','Prepare proposal','Assign consultant'],outcome:'Discovery call booked',example:'Annual audit engagement'},
  Legal:{qualification:['Matter type','Jurisdiction','Urgency','Conflict details'],workflow:['Triage matter','Run conflict check','Assign counsel'],outcome:'Consultation requested',example:'Commercial contract review'},
  Logistics:{qualification:['Origin & destination','Cargo','Timing','Service level'],workflow:['Check route','Prepare quote','Assign operator'],outcome:'Shipment quote sent',example:'Nairobi to Kampala pallet delivery'},
  Travel:{qualification:['Destination','Dates','Travellers','Budget'],workflow:['Design itinerary','Confirm availability','Assign travel advisor'],outcome:'Itinerary requested',example:'Family holiday to Zanzibar'},
  Hospitality:{qualification:['Stay / event type','Dates','Guests','Preferences'],workflow:['Check availability','Prepare offer','Assign host'],outcome:'Reservation requested',example:'Corporate retreat for 30 guests'},
  'E-commerce & Retail':{qualification:['Product','Quantity','Delivery location','Purchase timing'],workflow:['Confirm stock','Recover cart / quote','Assign support'],outcome:'Order assisted',example:'Bulk office equipment order'},
  Construction:{qualification:['Project type','Location','Scope','Start date'],workflow:['Assess project','Arrange site visit','Assign estimator'],outcome:'Site visit booked',example:'Commercial fit-out project'},
  'Home Services':{qualification:['Service needed','Location','Urgency','Property details'],workflow:['Triage job','Estimate visit','Assign technician'],outcome:'Service visit booked',example:'Emergency plumbing repair'},
  SaaS:{qualification:['Use case','Team size','Current stack','Decision timeline'],workflow:['Score account','Book demo','Assign account executive'],outcome:'Demo booked',example:'CRM for a 25-person sales team'},
  'Marketing & Creative':{qualification:['Service','Campaign goal','Channels','Budget'],workflow:['Capture brief','Plan discovery','Assign strategist'],outcome:'Strategy call booked',example:'Multi-channel launch campaign'},
  Recruitment:{qualification:['Role / talent need','Seniority','Location','Hiring timeline'],workflow:['Qualify vacancy','Build shortlist','Assign recruiter'],outcome:'Hiring brief accepted',example:'Senior finance manager search'},
  Nonprofit:{qualification:['Programme','Support type','Location','Availability'],workflow:['Understand intent','Route enquiry','Assign coordinator'],outcome:'Supporter connected',example:'Corporate partnership enquiry'},
  'Other / Custom':{qualification:['Customer need','Requirements','Timeline','Budget / value'],workflow:['Qualify request','Set next action','Assign owner'],outcome:'Next step agreed',example:'A customer-specific opportunity'},
}

export const industryNames=Object.keys(industryProfiles)
export const customerSources=['Manual','Website','Website widget','WhatsApp','Email','Phone call','Walk-in','Referral','Instagram','Facebook','Messenger','LinkedIn','TikTok','X / Twitter','YouTube','Google Ads','Google Business Profile','Meta Lead Ads','TikTok Lead Ads','Marketplace / directory','Shopify','WooCommerce','Calendly','Typeform','Jotform','Event / webinar','Partner','Zapier','Make','n8n','Custom API']
