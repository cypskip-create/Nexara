# Billing and public enquiry setup

Migration `0009_billing_dedupe_public_inquiries.sql` adds a non-destructive normalized contact-identity registry, a service-only website enquiry table, Stripe webhook idempotency, and subscription realtime updates. Existing duplicate contact rows remain intact; the registry selects the oldest matching record for future creates and prevents new email or normalized-phone collisions.

## Public enquiries

Deploy `public-inquiry` without JWT verification. A dedicated long random `INQUIRY_HASH_SECRET` is recommended for hashing requester IP addresses used by rate limiting; when absent, the server-only Supabase service-role secret provides the salt. Neither value may be exposed through a `VITE_` variable. Set `APP_ORIGIN` before deploying the public site so browser requests receive the correct CORS origin.

## Stripe

Deploy `billing` with JWT verification and `stripe-webhook` without JWT verification. Configure:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_STARTER`
- `STRIPE_PRICE_GROWTH`
- `STRIPE_PRICE_PRO`
- `APP_ORIGIN`

Register the deployed `stripe-webhook` URL in Stripe for `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, and `customer.subscription.deleted`. Billing changes are limited to workspace owners and administrators. The webhook verifies Stripe signatures, rejects stale signatures, stores event IDs for idempotency, and synchronizes the local subscription record.
