# Public export security report

Source: `C:\Users\adama\Documents\New project\social-inbox`
Status: product prototype
Files copied: 98
Files omitted: 22

Excluded runtime data includes secrets, environment files, credentials, session files, databases, logs, caches, archives, generated artifacts, and files above 20 MB.

## Omitted paths

- `.env | policy-excluded`
- `.env.example | policy-excluded`
- `DEPLOY.md | Telegram-token`
- `src\lib\access-request-db.ts | provider-secret`
- `src\lib\managed-setup-db.ts | provider-secret`
- `src\lib\prisma.ts | provider-secret`
- `src\lib\service-bot.ts | provider-secret`
- `src\lib\telegram-setup-db.ts | provider-secret`
- `src\lib\i18n\messages\de.ts | Telegram-token`
- `src\lib\i18n\messages\en.ts | Telegram-token`
- `src\lib\i18n\messages\ru.ts | Telegram-token`
- `src\lib\i18n\messages\tr.ts | Telegram-token`
- `src\app\api\webhooks\meta\route.ts | provider-secret`
- `scripts\turso-add-access-table.mjs | provider-secret`
- `scripts\turso-apply.mjs | provider-secret`
- `scripts\turso-check.mjs | provider-secret`
- `scripts\turso-migrate-locale.mjs | provider-secret`
- `scripts\turso-migrate-managed-setup.mjs | provider-secret`
- `scripts\turso-migrate-profile.mjs | provider-secret`
- `scripts\turso-migrate-telegram-setup.mjs | provider-secret`
- `prisma\dev.db | policy-excluded`
- `prisma\seed.ts | provider-secret`