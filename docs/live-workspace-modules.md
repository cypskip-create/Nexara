# Live workspace modules

Migration `0010_live_workspace_modules.sql` completes four authenticated workspace modules: Inbox, Knowledge Base, AI Assistant configuration and Integrations.

## Inbox

- Conversations, messages and per-user read markers are stored in PostgreSQL and streamed through Supabase Realtime.
- Conversation creation, message sending and read markers use tenant-checked database functions.
- Human replies are associated with the signed-in profile and add a lead timeline activity when a related lead exists.
- WhatsApp conversations continue through the server-side Meta adapter; other channels record replies in the shared workspace.

## Knowledge Base and AI Assistant

- Knowledge entries support search, source/type metadata, editing and recoverable archival.
- AI configuration stores the assistant identity, tone, instructions, qualification fields and enabled state per organization.
- Existing role policies limit configuration changes to workspace managers while all members can read active workspace data.

## Integrations

The integration page reads persisted provider status and calls the authenticated `integration-check` Edge Function. Only owners and admins can run checks or disable integrations. The function records safe readiness metadata but never returns provider secret values.

Provider secrets are configured in Supabase, not in browser variables. WhatsApp requires `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_APP_SECRET`, `WHATSAPP_PHONE_NUMBER_ID` and `WHATSAPP_VERIFY_TOKEN`. Transactional email requires `RESEND_API_KEY` and `EMAIL_FROM`. Website capture is available through `public-inquiry`; outbound webhooks remain setup-required until a destination and signing policy are implemented.

## Deployment

Apply migrations, then deploy both functions affected by this release:

```bash
npx supabase db push --project-ref lgfnnlrkedzrnvnchash
npx supabase functions deploy integration-check whatsapp-send --project-ref lgfnnlrkedzrnvnchash
```

Run `npm run typecheck`, `npm run lint`, `npm test` and `npm run build` before release.
