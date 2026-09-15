---
status: done
opened: 2026-09-15
---

# A staging environment that actually exists

## Why

CLAUDE.md says staging before production, DEPLOY.md repeats it, and
`.railway/railway.ts` declares both environments. Until now every change was
tested on a laptop and pushed straight to guests. Both production incidents
this month — the silent retry loop and the logout stuck on "loading" — would
have surfaced on a staging bot first.

## Result

Staging runs end to end, verified in the logs on 2026-09-15 rather than
assumed:

| | |
|---|---|
| Bot | A message to `pedro_suites_stage_bot` was stored (`stored=true`) and answered (`agent.replied`) |
| Admin | Google's callback reached `admin-staging-9fe9`, the session was created, and the allowlist passed — the page then polled every 8 seconds |
| Database | `bot_user` and `admin_user` authenticate and write with staging's own passwords |
| Branch | `bot`, `admin` and `migrator` track `staging`; a push to `main` does not reach them |
| Production | Webhook still `Pedrotest7bot` → `bot-production-9347`, no errors |

URLs and the duplication warning are in DEPLOY.md.

## What happened on the way

Staging was created by **duplicating production** in the Railway dashboard
(08:23 UTC). A duplicate copies services, variables and source settings, and
two consequences were found in the logs:

- **The staging bot took over production's webhook.** It booted at 08:26 with
  production's `TELEGRAM_BOT_TOKEN` and a public domain, and called
  `setWebhook` (`apps/bot/src/index.ts:54`), registering `bot="Pedrotest7bot"`
  — production's bot — at `bot-staging-2a5a`. For about an hour and three
  quarters, messages to the real bot went to staging. **None arrived in that
  window**; the staging bot logged zero `webhook.received` events
- **Staging tracked `main`**, so every push would have redeployed the staging
  bot and taken the webhook again

Remediated by the owner in the dashboard; the CLI route was refused by the
permission system. The staging token was replaced with a separate bot,
production's bot was redeployed from its existing build and registered back
at 10:11, and staging moved to its own branch.

Then everything else the duplicate had copied was replaced: `PUBLIC_URL` (it
pointed staging's Google callback at production's admin), the Google redirect
URI, `AUTH_SECRET`, both role passwords with `DATABASE_URL` switched to the
reference form, and `GEMINI_API_KEY`.

**Verification limit, stated:** the `AUTH_SECRET` and `GEMINI_API_KEY`
replacements were confirmed by the owner, not by me — checking would mean
reading production's secrets beside staging's. The deployment history is
consistent with them being live: nothing was pending, and no deploy followed
the 10:33 one they would have been part of.

## Two mistakes of mine worth keeping

- A password comparison script built one lookup per service inside a Python
  loop; every lookup read the *last* service's variables, so it reported a set
  variable as missing and "confirmed" a password by comparing it with itself.
  Rewritten with a plain dict per service before any conclusion was kept
- An `admin` startup error ("Could not validate the database schema") was
  first read as a wrong password. It was a race: `migrator` spends about a
  minute installing dependencies, and applied the new password 64 seconds
  *after* `admin`'s one-time schema check. Better Auth does not check again, so
  the line stays in the log. Deploy `migrator` first

## Follow-ups

- **A `getMe` check before `setWebhook`.** The bot refuses to register — loudly —
  when the token's bot is not the one configured for its environment. A copied
  token would then fail at boot instead of silently diverting production.
  This is the change that makes the incident above impossible rather than
  merely documented
- Production's own `DATABASE_URL`s embed the role passwords as literals;
  switch them to references so each password is stored once
- Reconcile `.railway/railway.ts` with what production really runs, then apply
  it ([0002](0002-apply-railway-config.md)). The drift: Postgres image 18 while
  tests use 16; `admin` built by RAILPACK through `RAILPACK_*` and
  `NIXPACKS_*` variables; `migrator` watching `scripts/migrate.mjs` rather
  than `scripts/*.mjs` and `prompts/**`; and `bot` does have watch patterns,
  contrary to [0001](0001-ci-as-a-deploy-gate.md)
