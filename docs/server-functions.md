# Server functions

Nexara keeps AI and messaging credentials in Supabase Edge Function secrets. None of these values may use a `VITE_` prefix.

## Functions

- `ai-qualify` requires an authenticated user, verifies conversation access through RLS, sends a bounded transcript to the OpenAI Responses API with a strict JSON schema, and persists the resulting score and qualification.
- `whatsapp-webhook` is public only because Meta must reach it. It verifies `x-hub-signature-256`, resolves the connected workspace by phone-number ID, deduplicates provider message IDs, and persists inbound contacts, conversations, and messages.
- `whatsapp-send` requires an authenticated user and an RLS-visible WhatsApp conversation. The destination comes from that conversation's contact and cannot be supplied by the browser.

## Required production secrets

Set `APP_ORIGIN`, `OPENAI_API_KEY`, `OPENAI_MODEL`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET`, and `WHATSAPP_GRAPH_API_VERSION` in the Edge Function environment. Supabase provides its own URL, anonymous key, and service-role key to deployed functions.

The WhatsApp integration row must be `CONNECTED` and its `public_config` must contain the matching `phone_number_id`. Provider tokens belong only in function secrets, never `public_config`.

## Verification

Run `supabase test db` against a disposable local database for the pgTAP tenant-isolation suite. Provider sandbox credentials are required for end-to-end OpenAI and WhatsApp delivery tests.
