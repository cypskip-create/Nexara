# Product expansion

Migration `0013_product_expansion.sql` adds tenant-isolated widget configuration, per-user notification preferences, centralized plan limits, operational notification triggers, auditable workspace deletion and the expanded automation command.

## Website widget

Owners and administrators configure branding, activation and exact HTTPS origins under Integrations. The generated snippet loads `public/nexara-widget.js` and submits to `widget-inquiry`. The function resolves the opaque widget key, requires an enabled configuration, validates the browser origin, rate-limits submissions, deduplicates contacts, creates a lead and stores the website conversation. When the workspace assistant and OpenAI provider are enabled it returns a bounded response grounded in active knowledge; otherwise it returns a safe handoff acknowledgement. Deploy it with:

```bash
supabase functions deploy widget-inquiry --project-ref lgfnnlrkedzrnvnchash
```

## Automations and notifications

Workflow triggers support lead creation, lead updates, stage changes and new conversations. These events are dispatched by the CRM and Inbox services. Database triggers create assignment, qualification, automation-failure and integration-failure notifications. User delivery preferences are stored separately from notification records.

## Data and performance

Settings provide profile updates, password changes, portable workspace exports and owner-only confirmed deletion. Lead lists paginate at 25 records and Inbox messages load in 50-message increments. For very large tenants, the next scaling step is RPC/cursor pagination so filtering and search are performed entirely by PostgreSQL rather than after the bounded workspace query.
