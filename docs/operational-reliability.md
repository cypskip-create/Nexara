# Operational reliability

Migration `0011_operational_reliability.sql` adds retry metadata to automation runs, tenant-isolated webhook endpoints and delivery history, plus an audited organization-settings command.

Failed automation runs schedule exponential retries up to three attempts. Invoke `automation-retry` from a trusted scheduler with `x-cron-secret`; both it and the internal path in `automation-run` require `AUTOMATION_CRON_SECRET`.

Owners and admins can configure HTTPS webhook destinations in the application. `webhook-delivery` derives an organization-specific HMAC key from `WEBHOOK_SIGNING_SECRET` and sends `x-nexara-signature: sha256=…` with a unique event ID. Provider secrets are never returned to the browser.

Before enabling production scheduling or delivery, configure strong independent values for `AUTOMATION_CRON_SECRET` and `WEBHOOK_SIGNING_SECRET` in Supabase Edge Function secrets.
