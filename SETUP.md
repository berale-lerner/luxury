# Setup — a new machine

Three things to install. Everything else the project brings with it.

| | Why | Check |
|---|---|---|
| **Node 22+** | `engines` in package.json; the services run on it | `node -v` |
| **pnpm 9.15.4** | Workspaces. Comes with Node — see below | `pnpm -v` |
| **Docker** with Compose v2 | Postgres runs in a container | `docker compose version` |

**No local Postgres.** The two databases are containers, and the port numbers
below are deliberately not 5432 so they cannot collide with one you already
have. Installing Postgres on the machine is not part of this.

pnpm is not installed separately — the version is pinned in `packageManager`
and Corepack, which ships with Node, fetches exactly that one:

```bash
corepack enable
```

On macOS, Docker Desktop covers both Docker and Compose. Node from
[nodejs.org](https://nodejs.org) or `brew install node@22`.

## First run

```bash
pnpm install
pnpm dev:db:up      # Postgres on 55433, survives a restart
pnpm dev:setup      # migrations, then the two role passwords
pnpm dev:publish    # publishes the agent's system prompt into the DB
pnpm build
```

`dev:setup` is what makes `bot_user` and `admin_user` usable: the migrations
create them without passwords, because a password belongs to an environment
and never to git.

## Secrets

```bash
cp apps/bot/.env.example   apps/bot/.env.local
cp apps/admin/.env.example apps/admin/.env.local
```

Both `.env.local` files are git-ignored and are the only place real tokens
live. Each file says where every value comes from. The database URLs in them
already point at the dev container and need no editing.

What you have to go and get:

- **`TELEGRAM_BOT_TOKEN`** — from [@BotFather](https://t.me/BotFather). Both
  services have their own; the same token in both is fine locally
- **`TELEGRAM_WEBHOOK_SECRET`**, **`AUTH_SECRET`** — invent them:
  `openssl rand -hex 32`
- **`GEMINI_API_KEY`** — [aistudio.google.com/apikey](https://aistudio.google.com/apikey).
  Or set `MODEL_PROVIDER=anthropic` and use `ANTHROPIC_API_KEY` instead
- **`DEV_ADMIN_EMAIL`** — your address, so the admin side can skip Google
  sign-in locally. It still passes the real guard, so add it to the allowlist:

  ```sql
  INSERT INTO public.admin_allowlist (email) VALUES ('you@example.com');
  ```

Google OAuth credentials are only needed to sign in the way production does.
Local development does not need them.

## Running

```bash
pnpm dev:admin      # builds, then serves on :3000
pnpm dev:bot        # :3001 — run `pnpm build` first, this one does not
```

The bot needs to be reachable from the internet for Telegram to deliver
anything, so a local run wants a tunnel (`cloudflared`, `ngrok`) and then
`pnpm telegram:webhook`. Reading conversations and replying from the admin
side works without any of that.

## Tests

A second container, separate from the one above and wiped on every run:

```bash
pnpm db:up
pnpm test
pnpm db:down
```

Different port (55432), tmpfs, no volume. A long-lived database accumulates
changes made by hand, and then a permission test passes because of a policy
that exists in a console rather than in the migrations.

## When something is wrong

| | |
|---|---|
| `pnpm: command not found` | `corepack enable`, then reopen the shell |
| Compose says the port is in use | Another Postgres on 55432/55433 — `docker ps` |
| Tests fail on connection | `pnpm db:up` was skipped, or `db:down` ran and took the container |
| The bot answers nothing | `pnpm dev:publish` — with no published prompt there is nothing to answer with |
