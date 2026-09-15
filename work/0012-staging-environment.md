---
status: doing
opened: 2026-09-15
---

# A staging environment that actually exists

## Why

CLAUDE.md says staging before production, DEPLOY.md repeats it, and
`.railway/railway.ts` declares both environments. Until now every change was
tested on a laptop and pushed straight to guests. Both production incidents
this month — the silent retry loop and the logout stuck on "loading" — would
have surfaced on a staging bot first.

## What happened on 2026-09-15

Staging was created by **duplicating production** in the Railway dashboard
(08:23 UTC). A duplicate copies services, variables and source settings. Two
consequences, both found in the logs, not assumed:

- **The staging bot took over production's webhook.** It booted at 08:26 with
  production's `TELEGRAM_BOT_TOKEN` and a public domain, and — like every boot —
  called `setWebhook` (`apps/bot/src/index.ts:54`). The registration logged
  `bot="Pedrotest7bot"`, production's bot, pointing at
  `bot-staging-2a5a.up.railway.app`. For about an hour and three quarters,
  messages to the real bot went to staging. **None arrived in that window** —
  the staging bot's log has zero `webhook.received` events
- **Staging tracked `main`**, so every push would have redeployed the staging
  bot and taken the webhook again, indefinitely

Remediation, done by the owner in the dashboard (the CLI route — scaling the
staging bot to zero and redeploying production — was refused by the
permission system):

1. `TELEGRAM_BOT_TOKEN` on staging `bot` and `admin` replaced with a new bot,
   `pedro_suites_stage_bot`
2. Production `bot` redeployed from its existing build (10:10 UTC)
3. Staging `bot`, `admin` and `migrator` switched to the `staging` branch

**The safeguard that would have prevented it is worth building.** The bot
could call `getMe` before `setWebhook` and refuse to register — loudly — when
the token's bot is not the one configured for this environment (for example a
`TELEGRAM_BOT_USERNAME` per environment). A copied token would then fail at
boot instead of silently diverting production.

## Verified state (2026-09-15, ~10:14 UTC)

| | |
|---|---|
| Production webhook | `Pedrotest7bot` → `bot-production-9347` (registered 10:11) |
| Staging webhook | `pedro_suites_stage_bot` → `bot-staging-2a5a` |
| Production bot | Running, no errors since the redeploy |
| Staging services | All four deployed; `bot`, `admin`, `migrator` on branch `staging` |
| Staging domains | `bot-staging-2a5a.up.railway.app`, `admin-staging-9fe9.up.railway.app` |

## Still carried over from production

In order of consequence:

1. **`PUBLIC_URL` on staging `admin` is production's URL.** Staging sign-in
   would send Google's callback to production's admin and scope the cookie
   there. Set it to `https://${{RAILWAY_PUBLIC_DOMAIN}}`
2. **Google Cloud**: add
   `https://admin-staging-9fe9.up.railway.app/api/auth/callback/google` to the
   OAuth client's authorized redirect URIs
3. **`AUTH_SECRET` is shared with production.** Sessions are signed with the
   same key in both environments. Replace it in staging
4. **Role passwords are identical to production's**, which DEPLOY.md says must
   differ — and staging's `DATABASE_URL`s embed them as literals, copied from
   production. Order matters, or staging loses its database:
   1. Change staging's `DATABASE_URL`s to the reference form —
      `postgres://bot_user:${{BOT_DB_PASSWORD}}@${{Postgres.RAILWAY_PRIVATE_DOMAIN}}:5432/${{Postgres.PGDATABASE}}`
      on `bot`, and the `admin_user` / `${{ADMIN_DB_PASSWORD}}` equivalent on
      `admin`
   2. Set new `BOT_DB_PASSWORD` and `ADMIN_DB_PASSWORD`, the same value on
      `migrator` and on the service that uses it
   3. Redeploy `migrator` — it applies the passwords to the roles — then `bot`
      and `admin`
5. **`GEMINI_API_KEY`** — not verified to be a separate key; checking would
   mean reading both keys. If shared, staging testing spends production's
   free-tier quota

## Follow-ups

- The `getMe` safeguard above
- Production's own `DATABASE_URL`s embed the passwords as literals too; switch
  them to references so each password is stored once
- Reconcile `.railway/railway.ts` with what production really runs, then apply
  it ([0002](0002-apply-railway-config.md)). The drift: Postgres image 18
  while tests use 16; `admin` built by RAILPACK through `RAILPACK_*` and
  `NIXPACKS_*` variables; `migrator` watching `scripts/migrate.mjs` rather than
  `scripts/*.mjs` and `prompts/**`; and `bot` does have watch patterns,
  contrary to [0001](0001-ci-as-a-deploy-gate.md)
- DEPLOY.md: say plainly that duplicating an environment is unsafe while the
  bot registers its webhook at boot
