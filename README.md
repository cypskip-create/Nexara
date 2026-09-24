# Nexara LeadFlow

Nexara LeadFlow is a multi-tenant lead capture, qualification, CRM, automation and analytics platform for SMEs. This repository is the initial production-oriented foundation: it includes a polished responsive workspace shell, demo dashboard, lead table, quick-create lead flow, theme switching, intentional empty states, and a documented path to Supabase-backed services.

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

## Public product experience

The homepage is an interactive conversation-to-customer walkthrough, separate from the
demo workspace at `/#app`. It includes finite product animations, a sticky transformation
story, scripted AI questions, CRM/pipeline/inbox demonstrations, the real analytics
workbench with isolated sample records, industry examples, pricing and accessible FAQs.

See [landing experience notes](docs/landing-experience.md) for architecture, motion,
accessibility, testing and launch prerequisites. Marketing demonstrations do not call
live AI providers, send messages, create subscriptions or modify workspace data.

## Environment

Copy `.env.example` to `.env.local`. Only `VITE_APP_URL` is needed for the current demo shell. Supabase, AI, WhatsApp and future billing values are intentionally empty until their accounts and server-side endpoints are configured. Never expose service-role or provider secrets through `VITE_` variables.

## Product implementation plan

1. Add Supabase migrations for organizations, memberships, profiles, contacts, leads, pipeline stages, conversations, messages, knowledge, automations, notifications, audit events and billing records.
2. Add Supabase Auth and server-side authorization/RLS tests before connecting live data.
3. Move demo state behind repositories/services, preserving the current empty/loading/error states.
4. Implement onboarding, inbox, pipeline drag/drop, AI configuration, automations and analytics as separate feature modules.
5. Add official WhatsApp Cloud API webhook handling and provider adapters only after credentials are available.

## Demo data

The current Acacia Properties workspace is clearly labelled demo data. It is local UI state only and does not represent a live customer or production integration.

## Repository

This project is intentionally created as a fresh Git repository. Commit the initial foundation after reviewing it:

```bash
git add .
git commit -m "chore: scaffold Nexara LeadFlow workspace"
```
