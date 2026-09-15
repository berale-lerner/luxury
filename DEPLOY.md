# DEPLOY.md — Deploying on Railway

An operational document. The rules behind these decisions are in
[CLAUDE.md](CLAUDE.md) (Operations) and [DESIGN.md](DESIGN.md) (infrastructure).

> **Read this first: `.railway/railway.ts` does not describe production.**
> It was written as the project's definition-as-code, but it has never been
> successfully applied, and production has since been configured in the
> dashboard and drifted from it ([work/0002](work/0002-apply-railway-config.md);
> the drift is listed in [work/0012](work/0012-staging-environment.md)).
> **Do not run `railway config apply`** until the file is reconciled. It would
> try to make production match a file that is out of date, and may propose
> changing or deleting what is running.

---

## ⚠️ The Railway rule that is easiest to break

Railway has **Shared Variables at the project and environment level**. They are
convenient, and they directly contradict a rule in CLAUDE.md.

**Every variable is defined at the service level only.** If
`TELEGRAM_BOT_TOKEN` is defined once as a shared variable, both services
receive it — and the separation this whole structure exists for disappears in
one click. That is why the token is set twice, once on each service.

Reference variables (`${{Postgres.RAILWAY_PRIVATE_DOMAIN}}`) are fine: they are
defined on the service that consumes them.

---

## Structure: four services in each environment

| Service | DB role | Exposed to the internet |
|---|---|---|
| `Postgres` | — | No |
| `migrator` | Owner | No |
| `bot` | `bot_user` | **Yes** — Telegram's webhook |
| `admin` | `admin_user` | Yes, behind auth and the allowlist |

### Production URLs

| Service | URL |
|---|---|
| `admin` | https://admin-production-3e57.up.railway.app |
| `bot` | https://bot-production-9347.up.railway.app |

Railway generated these, and the admin one also appears as `PUBLIC_URL` on the
`admin` service. That value builds the OAuth callback
(`<PUBLIC_URL>/api/auth/callback/google`) and the cookie scope, so changing it
requires a matching change in Google Cloud.

They are addresses, not secrets, which is why they live here: an address that
exists only in the console is one you look up again every time.

### Staging URLs

| Service | URL |
|---|---|
| `admin` | https://admin-staging-9fe9.up.railway.app |
| `bot` | https://bot-staging-2a5a.up.railway.app |

Staging's services track the **`staging`** branch, not `main`. A push to `main`
does not reach staging; test there by pushing to `staging`.

### ⚠️ Never duplicate production as it is

Railway's "Duplicate environment" copies **every variable** and each service's
source branch. The bot calls `setWebhook` on every boot, so a bot in the
duplicated environment holding production's token **takes over the real bot's
webhook**. Guests' messages go to the new environment, and the production bot
goes quiet with no error anywhere. This happened on 2026-09-15
([work/0012](work/0012-staging-environment.md)).

If you duplicate anyway, **before the first deploy**:

- Set `TELEGRAM_BOT_TOKEN` to a separate bot from BotFather, on both `bot` and
  `admin`
- Change every service's source branch to the environment's own branch
- Replace `PUBLIC_URL`, `AUTH_SECRET`, both role passwords and
  `GEMINI_API_KEY`. All of them are copied from production
- Use the reference form of `DATABASE_URL` (`${{BOT_DB_PASSWORD}}`), not one
  with a password written into it

### Railway from your own machine

- The CLI remembers a linked environment, **and for everyone who has linked so
  far that is `production`.** Any command without `--environment` runs against
  production — including `redeploy`, `scale` and `variable set`. Pass
  `--environment` explicitly on every command
- `railway variable list --kv` and `railway environment config --json` return
  **raw secret values.** Never print them, and never paste them into a chat
- **A push to `main` deploys production.** CI runs alongside it and does not
  block it ([work/0001](work/0001-ci-as-a-deploy-gate.md)), so test on
  `staging` first

### Settings that exist only in Railway

As of 2026-09-15. They are changed in the dashboard, not in git, so check
before relying on them.

| | production | staging |
|---|---|---|
| Telegram bot | `Pedrotest7bot` | `pedro_suites_stage_bot` |
| `MODEL_PROVIDER` | `gemini` | `gemini` |
| `MODEL_NAME` | `gemini-3.1-flash-lite` | `gemini-3.1-flash-lite` |

- **There is no `ANTHROPIC_API_KEY` in production**, so failing over to a
  second provider is not yet possible
  ([work/0011](work/0011-model-retry-and-failover.md))
- **Gemini's free tier is limited per model, and the quota is small.**
  `gemini-3.8-flash` stopped after 20 requests with a 429 on 2026-09-10, and
  the roughly 55-second wait the error suggested was not the real window

### Why `migrator` is a separate service

Migrations run as the owner role — the only role allowed to create roles,
GRANTs and RLS policies. If `apps/admin` ran them in a pre-deploy step, the
service that already reaches every schema would also hold the owner's
credentials.

A separate service that runs and exits (`restartPolicyType: NEVER`) also
satisfies a second rule: **production credentials never land on a local
machine** — nobody runs migrations from a laptop. Re-running is safe: a file
that has already run is skipped through `migrations.applied`.

On every deploy it runs `node scripts/deploy.mjs`, which does three things in
order: applies pending migrations, sets the role passwords from its own
variables, and adds the addresses in `ADMIN_ALLOWLIST` to the allowlist.

---

## Setting up an environment

**Staging before production.** The same steps in both environments, each with
its own Postgres and its own variables.

### 1. Log in and link — in the browser, once

```bash
railway login
```

Railway also needs access to the repository on GitHub (the GitHub App
installed on `berale-lerner/luxury`) — another one-time approval in the
browser.

```bash
railway link
```

Choose the environment deliberately when linking. Whatever you pick becomes
the default for every command that omits `--environment`.

### 2. Services — in the dashboard

In the target environment:

1. **Postgres:** New → Database → PostgreSQL. This gives it its own volume and
   credentials that Railway generates
2. **`migrator`, `bot` and `admin`:** from the repository, each with its source
   branch set to the environment's branch (`main` for production, `staging`
   for staging)

Build and start settings — what production actually runs:

| Service | Build command | Start command | Other |
|---|---|---|---|
| `migrator` | `pnpm install --frozen-lockfile` | `node scripts/deploy.mjs` | Restart policy `NEVER` |
| `bot` | `pnpm install --frozen-lockfile && pnpm build` | `pnpm --filter @luxury/bot start` | Healthcheck `/health` |
| `admin` | `pnpm install --frozen-lockfile && pnpm build` | `pnpm --filter @luxury/admin start` | Healthcheck `/health` |

Production's `admin` currently gets these commands from `RAILPACK_*` and
`NIXPACKS_*` variables rather than from service settings; either works.

### 3. Variables

**Plain values and references:**

| Service | Variable | Value |
|---|---|---|
| `migrator` | `MIGRATE_DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
| `bot` | `DATABASE_URL` | `postgres://bot_user:${{BOT_DB_PASSWORD}}@${{Postgres.RAILWAY_PRIVATE_DOMAIN}}:5432/${{Postgres.PGDATABASE}}` |
| `bot` | `MODEL_PROVIDER`, `MODEL_NAME`, `LOG_LEVEL` | e.g. `gemini`, `gemini-3.1-flash-lite`, `info` |
| `admin` | `DATABASE_URL` | `postgres://admin_user:${{ADMIN_DB_PASSWORD}}@${{Postgres.RAILWAY_PRIVATE_DOMAIN}}:5432/${{Postgres.PGDATABASE}}` |
| `admin` | `PUBLIC_URL` | `https://${{RAILWAY_PUBLIC_DOMAIN}}` |
| `admin` | `PORT`, `LOG_LEVEL` | `3000`, `info` |

The role name in `DATABASE_URL` (`bot_user` / `admin_user`) is the
security-relevant half of the string — it decides what the service may see —
so it is written out, while the password is only ever a reference.

**Secrets — through stdin, never as an argument.** `--stdin` keeps the value
out of your shell history. Generate passwords with `openssl rand -hex 24`: the
password is placed inside a URL, where characters like `@`, `:` or `/` would
break it. Keep them in a password manager, never in a chat or a file.

Each role password goes on **two** services — `migrator`, which applies it to
the role, and the service that connects with it. The two values must be
identical.

```bash
echo -n '<bot_user password>'   | railway variable set BOT_DB_PASSWORD   --stdin --service migrator --environment <env>
echo -n '<bot_user password>'   | railway variable set BOT_DB_PASSWORD   --stdin --service bot      --environment <env>
echo -n '<admin_user password>' | railway variable set ADMIN_DB_PASSWORD --stdin --service migrator --environment <env>
echo -n '<admin_user password>' | railway variable set ADMIN_DB_PASSWORD --stdin --service admin    --environment <env>

echo -n '<your email>'          | railway variable set ADMIN_ALLOWLIST   --stdin --service migrator --environment <env>

echo -n '<Telegram token>'      | railway variable set TELEGRAM_BOT_TOKEN      --stdin --service bot   --environment <env>
openssl rand -hex 32            | railway variable set TELEGRAM_WEBHOOK_SECRET --stdin --service bot   --environment <env>
echo -n '<Gemini key>'          | railway variable set GEMINI_API_KEY          --stdin --service bot   --environment <env>

echo -n '<Google client id>'    | railway variable set GOOGLE_CLIENT_ID     --stdin --service admin --environment <env>
echo -n '<Google secret>'       | railway variable set GOOGLE_CLIENT_SECRET --stdin --service admin --environment <env>
openssl rand -hex 32            | railway variable set AUTH_SECRET          --stdin --service admin --environment <env>
echo -n '<Telegram token>'      | railway variable set TELEGRAM_BOT_TOKEN   --stdin --service admin --environment <env>
```

Each environment gets its **own** Telegram bot, its own passwords and its own
`AUTH_SECRET`. See the duplication warning above for what a shared token does.

### 4. Deploy — `migrator` first

Deploy `migrator` and wait for it to finish before `bot` and `admin`. Its log
should show the migrations, then:

```
password set for bot_user
password set for admin_user
allowlist: added <your email>
```

```bash
railway logs --service migrator --environment <env>
```

The order matters because `migrator` spends about a minute installing
dependencies before it applies the passwords. An `admin` that starts in that
window runs Better Auth's schema check with a password the role does not accept
yet, and logs a one-time "Could not validate the database schema" error.

### 5. Domains

```bash
railway domain --service bot   --environment <env>
railway domain --service admin --environment <env>
```

`bot` is the only service exposed on purpose — for the webhook. `admin` sits
behind sign-in and the allowlist.

### 6. Google sign-in

In Google Cloud, add the environment's callback to the OAuth client's
authorized redirect URIs:

```
https://<admin domain>/api/auth/callback/google
```

Signing in with Google is not authorization: until your address is on the
allowlist, nobody gets in, including you. The first address comes from
`ADMIN_ALLOWLIST` in step 3. After that, managers are added from the Users page
in the admin interface — no SQL by hand. The variable only adds; a removal made
in the interface is not undone by the next deploy.

---

## Routine deploys

- **Deploy from git only.** No manual changes in production
- A push to `staging` deploys staging; **a push to `main` deploys production**
- Which services rebuild on a push: `bot` and `migrator` have watch patterns;
  production's `admin` currently has none, so it rebuilds on every push
- **A new migration:** `migrator` watches `migrations/**`, so pushing one
  redeploys it. To run it again by hand, before the code that depends on it
  ships:

  ```bash
  railway service redeploy --service migrator --environment <env>
  ```

- **Infrastructure changes** (a variable, a start command, a new service) are
  made in the dashboard for now, and recorded in
  [work/0002](work/0002-apply-railway-config.md) until `.railway/railway.ts`
  matches reality
- CI runs typecheck and the tests on every push to `main` and on every pull
  request ([.github/workflows/ci.yml](.github/workflows/ci.yml)). That is the
  enforcement — not the Skill. It does not yet block a deploy

---

## Still required before production is production-grade

- **Automated backups, and a restore that has actually been tested.** A backup
  that has never been restored is not a backup
- **Sentry and uptime monitoring** on both services
- **Key rotation:** any key that has passed through git or a chat is replaced
  immediately
