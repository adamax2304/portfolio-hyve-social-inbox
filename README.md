# Hyve

An early B2B omnichannel inbox SaaS for online businesses that sell through Instagram, WhatsApp, Telegram, Messenger, and web chat. (Formerly known as "Social Inbox OS".)

## What this build includes

- Multi-tenant data model for separate client businesses.
- Shared conversation timeline with inbound, outbound, and internal notes.
- Business onboarding flow that creates a workspace, owner seat, launch checklist, and starter channels.
- Team model with owner, admin, agent, and viewer roles.
- Tenant-level AI policy fields and automation rules.
- Encrypted integration secret storage for tokens and webhook secrets.
- Demo inbound simulator plus webhook-ready API routes for Telegram and Meta-style payloads.
- Workspace UI for channels, onboarding progress, inbox operations, team management, and integration vault setup.

## Stack

- Next.js 16 App Router
- TypeScript
- Tailwind CSS 4
- Prisma Client
- SQLite for local MVP speed

## Run locally

```bash
npm install
npx prisma generate
npm run db:setup
npm run db:seed
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

## Demo routes

- `/`
- `/onboarding`
- `/tenants/northstar-atelier`
- `POST /api/demo/inbound`
- `POST /api/webhooks/telegram?tenant=northstar-atelier`
- `GET /api/webhooks/meta?hub.verify_token=dev-meta-token&hub.challenge=123`
- `POST /api/webhooks/meta?tenant=northstar-atelier&provider=instagram`

## Security notes

- Provider secrets are encrypted before writing to the database.
- The encryption key can be supplied through `APP_ENCRYPTION_KEY`.
- Local development falls back to a deterministic dev key; replace it before any real deployment.

## Current product direction

- Web app remains the main control surface for teams and account security.
- Telegram acts as a fast operator surface and alerting layer.
- Official APIs stay the integration standard for Instagram, WhatsApp, and Messenger.
- AI starts in suggestion mode before any autopilot rollout.

## Next implementation steps

- Add real authentication and session management.
- Add provider-specific outbound dispatchers and retry queues.
- Add embedded Instagram and WhatsApp onboarding flows.
- Add CRM sync, analytics, and billing.
- Move from local SQLite bootstrap to production Postgres migrations.
