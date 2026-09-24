# Backend foundation

The production data path targets Supabase PostgreSQL and Supabase Auth. Demo mode remains browser-local until a project URL and anonymous key are configured; it is intentionally isolated from production records.

## Migration order

Apply migrations in filename order with the Supabase CLI or dashboard migration runner:

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

Migration `0004_secure_product_backend.sql` adds the operational backend foundation:

- invitations, lead activities, tasks, AI configuration, automation runs, integrations, subscriptions and analytics events;
- same-organization foreign keys for lead/contact, conversation/contact, message/conversation and automation/step relationships;
- immutable `organization_id` protection;
- role-aware RLS for owner, admin, manager and agent access;
- protection against removing or demoting the final organization owner;
- automatic default pipeline stages, AI configuration and a 14-day trial record when a workspace is created;
- transactional lead commands that create audit, timeline and analytics records together with the CRM change.

## Trust boundaries

The browser receives only the Supabase project URL and anonymous key. RLS is the authorization boundary. Provider secrets and the service-role key must be used only by server-side functions or deployment secrets and must never use a `VITE_` prefix.

The CRM service layer calls database functions for operations that span multiple records. The functions repeat authorization checks before running under `security definer`, validate organization membership and do not accept arbitrary SQL or executable automation code.

## Verification

`tests/backend-contract.spec.ts` guards critical migration and service invariants in CI. A live tenant-isolation test still requires a linked disposable Supabase project or local Supabase CLI. Before production deployment:

1. Apply all migrations to a clean disposable database.
2. Create users in two organizations for every role.
3. Verify cross-organization reads, writes and foreign-key associations fail.
4. Verify agents can access only assigned or unassigned leads/conversations.
5. Verify admins cannot remove or demote the final owner.
6. Run the full application test suite against that environment.

The current development machine does not have the Supabase CLI installed, so migrations have not been executed against a live PostgreSQL instance in this repository session.
