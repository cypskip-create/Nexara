# Team, automation and notification setup

Migration `0008_team_automation_notifications.sql` enables real-time updates and secure invitation acceptance. Deploy `team-invitations`, `automation-run`, and `notification-email` with JWT verification enabled.

Set these server-only function secrets:

- `APP_ORIGIN` — the public Nexara URL used in invitation links.
- `RESEND_API_KEY` — the Resend API key.
- `EMAIL_FROM` — a verified sender, for example `Nexara <notifications@example.com>`.

Invitation tokens are stored only as SHA-256 hashes, expire after seven days, and can only be accepted by a signed-in account whose email matches the invitation. Automation runs are recorded as `RUNNING`, then finalized as `SUCCEEDED`, `SKIPPED`, or `FAILED`; execution details remain available for auditing.
