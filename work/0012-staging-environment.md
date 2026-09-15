---
status: doing
opened: 2026-09-15
---

# A staging environment that actually exists

## Why

CLAUDE.md says staging before production, DEPLOY.md repeats it, and
`.railway/railway.ts` declares both environments. In practice every change so
far has been tested on a laptop and then pushed straight to guests. The two
production incidents this month — the silent retry loop and the logout that
stuck on "loading" — would both have surfaced on a staging bot first.

## What exists today (checked 2026-09-15)

**Staging is an empty name.** The environment exists in the Railway project,
but `railway service list -e staging` returns `[]` and its committed config is
`{"privateNetworkDisabled": false}` — no service instances, no database, no
volume. The `RAILWAY_*` variables the CLI shows for services there are
synthesized; nothing is deployed.

**Production has drifted from `.railway/railway.ts`**, which matters here
because staging should copy what works, not what the file says:

- Postgres is the `postgres-ssl:18` image. The test suite runs 16
- `admin` builds with RAILPACK, driven by `RAILPACK_*` and `NIXPACKS_*`
  variables, not by the build and start commands in the file
- `migrator` watches `scripts/migrate.mjs`; the file says `scripts/*.mjs` and
  `prompts/**`
- `bot` *does* have watch patterns, which contradicts [0001](0001-ci-as-a-deploy-gate.md)
- **`DATABASE_URL` embeds each role's password as a literal**, instead of the
  `${{BOT_DB_PASSWORD}}` / `${{ADMIN_DB_PASSWORD}}` reference the file intends.
  Each password is therefore stored twice, and rotating one means editing two
  variables and hoping they agree

## Done

- A `staging` git branch, from `main`, pushed. Nothing tracks it yet
- An attempt to stage non-secret config for `migrator`, `bot` and `admin` with
  `railway environment edit -e staging --stage`. It ran against an environment
  with no instances, the CLI printed no confirmation, and nothing is visible
  afterwards. **Treat it as not done.** If a staged changeset shows up in the
  dashboard, review it before committing or discard it
- Production re-read after that attempt: branches, builders, commands and
  variable names identical to before

## Why the rest is not scripted

- **Creating instances needs a real Postgres** — a volume, and credentials
  Railway generates. No CLI path for that could be verified without risking a
  deploy
- **"Sync" or "duplicate from production" copies variables**, and among them is
  `TELEGRAM_BOT_TOKEN`. The bot calls `setWebhook` on every boot
  (`apps/bot/src/index.ts:54`). A staging bot holding production's token takes
  over production's webhook the moment it starts — every guest message goes to
  staging, and production goes quiet with no error anywhere
- **Every remaining value is a secret**, and secrets are created by the owner

## Procedure

In this order. Every step in the **staging** environment unless it says
otherwise.

1. **BotFather → a new bot** for staging. A second token is not optional; see
   above
2. **Add Postgres** to staging (New → Database → PostgreSQL), so it gets its own
   volume and generated credentials. If syncing from production instead,
   **deselect every variable**
3. **Add `migrator`, `bot` and `admin`**, and set each one's source branch to
   `staging`. Again, no variables carried over
4. **Variables** — plain values and references first, then secrets:

   | Service | Set to a value | Secrets (owner) |
   |---|---|---|
   | `migrator` | `MIGRATE_DATABASE_URL=${{Postgres.DATABASE_URL}}` | `BOT_DB_PASSWORD`, `ADMIN_DB_PASSWORD`, `ADMIN_ALLOWLIST` |
   | `bot` | `DATABASE_URL=postgres://bot_user:${{BOT_DB_PASSWORD}}@${{Postgres.RAILWAY_PRIVATE_DOMAIN}}:5432/${{Postgres.PGDATABASE}}` · `MODEL_PROVIDER=gemini` · `MODEL_NAME=gemini-3.1-flash-lite` · `AGENT_KEY=guest` · `TIMEZONE=Asia/Jerusalem` · `LOG_LEVEL=info` | `BOT_DB_PASSWORD`, `TELEGRAM_BOT_TOKEN` (**the staging bot**), `TELEGRAM_WEBHOOK_SECRET`, `GEMINI_API_KEY` |
   | `admin` | `DATABASE_URL=postgres://admin_user:${{ADMIN_DB_PASSWORD}}@${{Postgres.RAILWAY_PRIVATE_DOMAIN}}:5432/${{Postgres.PGDATABASE}}` · `PUBLIC_URL=https://${{RAILWAY_PUBLIC_DOMAIN}}` · `PORT=3000` · `LOG_LEVEL=info` | `ADMIN_DB_PASSWORD`, `AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `TELEGRAM_BOT_TOKEN` (**the staging bot**) |

   The same password goes to `migrator` and to the service that uses it. Use
   the reference form of `DATABASE_URL` shown here, not production's
5. **Domains**: `railway domain -s bot -e staging` and
   `railway domain -s admin -e staging`
6. **Google Cloud** (not Railway): add
   `https://<staging admin domain>/api/auth/callback/google` to the OAuth
   client's authorized redirect URIs
7. **Deploy `migrator` first**; its log should show the `applying` lines. Then
   `bot` and `admin`
8. **Verify both bots**: the staging bot answers in Telegram, and — the check
   that matters — **the production bot still answers too**

## Before the first staging deploy

- `TELEGRAM_BOT_TOKEN` in staging is the new bot's, on both `bot` and `admin`
- `GEMINI_API_KEY`: a separate key, or accept that staging testing spends
  production's free-tier quota — 20 requests a day for the model that ran out
  on 2026-09-10
- Nothing copied from production's database. Guest conversations are personal
  data; staging gets a clean one from the migrations

## Follow-ups this turned up

- Switch production's `DATABASE_URL`s to the reference form, so each password
  is stored once
- Reconcile `.railway/railway.ts` with what production really runs, then apply
  it ([0002](0002-apply-railway-config.md)). The drift list above is the diff
- Decide Postgres 16 or 18, and make the test container match production

## Open

Whether `railway environment edit --stage` against an environment with no
service instances stages anything at all. The CLI's silence did not say.
