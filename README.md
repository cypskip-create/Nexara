# Nexara LeadFlow

Nexara LeadFlow is a multi-tenant lead capture, qualification, CRM, automation and analytics platform for SMEs. The current product includes a polished responsive workspace, persistent browser-based demo CRM, lead and contact management, an interactive pipeline, lead activity timelines, global search, notifications, theme switching, analytics, and a motion-rich public landing experience.

## Stack

- React + TypeScript + Vite
- CSS design tokens with responsive light/dark UI
- Supabase target architecture (Auth, PostgreSQL, RLS, Storage)
- Server-side AI and WhatsApp integrations planned behind service boundaries

## Run locally

```bash
npm install
Copy-Item .env.example .env.local
npm run dev
```

Validate with `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build`.
Browser tests use installed Microsoft Edge and an isolated Vite server on port 5174.
Screenshots and failure traces are written to the ignored `test-results/` directory.

## Supabase backend

The repository includes reproducible migrations for authentication profiles, organizations, role-based memberships, tenant-isolated CRM data, inbox entities, knowledge, automations, audit events, tasks, AI configuration, integrations, subscriptions and analytics events. Privileged CRM workflows use transactional PostgreSQL functions so the record change, timeline entry, audit event and analytics event remain consistent.

See [backend foundation](docs/backend-foundation.md) for migration, authorization and production-verification guidance.

## Public product experience

The homepage is an interactive conversation-to-customer walkthrough, separate from the
demo workspace at `/#app`. It includes finite product animations, a sticky transformation
story, scripted AI questions, CRM/pipeline/inbox demonstrations, the real analytics
workbench with isolated sample records, industry examples, pricing and accessible FAQs.

See [landing experience notes](docs/landing-experience.md) for architecture, motion,
accessibility, testing and launch prerequisites. Marketing demonstrations do not call
live AI providers, send messages, create subscriptions or modify workspace data.

## Environment

Copy `.env.example` to `.env.local`. Demo mode only needs `VITE_APP_URL`; authenticated production mode also needs `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. AI, WhatsApp and billing secrets remain server-only until their adapters are configured. Never expose Supabase secret keys or provider credentials through `VITE_` variables.

## Product implementation plan

1. Run the migrations against a disposable Supabase project and complete live tenant-isolation tests.
2. Connect session/workspace state to the typed CRM services while retaining explicit demo mode.
3. Implement production inbox ingestion, AI execution and automation workers behind server-side endpoints.
4. Add team invitations and onboarding persistence to the authenticated application journey.
5. Add official WhatsApp Cloud API webhook handling and provider adapters only after credentials are available.

## Demo data

The current Acacia Properties workspace is clearly labelled demo data. Lead, contact, pipeline, note and follow-up changes persist in local browser storage so complete workflows can be tested safely. It does not represent a live customer or production integration; shared data still requires the Supabase adapter and credentials.

## CRM workflows available

- Create, search, filter, sort, assign, qualify and recoverably archive leads.
- Open a lead profile, edit its details, add notes and schedule follow-ups.
- Move opportunities through seven pipeline stages by drag and drop or accessible selectors.
- Create, edit, tag and search contacts, with related lead history.
- Open modules and leads through keyboard search (`Ctrl/Cmd + K`).
- Use the responsive mobile navigation, notification centre and persistent dark theme.

## Repository

The repository is maintained on the `master` branch at `cypskip-create/Nexara`.
