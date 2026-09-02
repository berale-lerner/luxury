# luxury

Property management system for an apartment hotel.

Read [CLAUDE.md](CLAUDE.md) before changing anything — it holds the security
boundaries. [DESIGN.md](DESIGN.md) describes what the system does,
[STANDARDS.md](STANDARDS.md) how the code is written, [TESTING.md](TESTING.md)
how it is tested.

## Layout

```
apps/
├── bot/      Public. Talks to guests over Telegram. Connects as bot_user.
└── admin/    Behind auth. server/ (Fastify) + web/ (React SPA). admin_user.
packages/
├── shared/     Types, schemas, pure utils. No dependencies, no env, no DB.
└── messaging/  The one outbound client. Credentials are passed in, never read.
migrations/   Roles, GRANTs and RLS — the single source of truth for all three.
tests/        Permission and structural tests, run against real Postgres.
```

Two services, two deployments, two database roles. One repo is not one process.

## Getting started

```bash
corepack enable
pnpm install
```

## Tests

The suite runs against a throwaway Postgres container whose schema is built
from `migrations/` and nothing else — a database assembled any other way would
not be the one the code produces.

```bash
pnpm db:up        # postgres:16 on localhost:55432, data in tmpfs
pnpm test
pnpm db:down
```

`pnpm test` resets the test database and replays every migration on each run.

## Migrations

```bash
pnpm db:migrate "postgres://owner:...@host:5432/luxury"
pnpm db:migrate "postgres://..." --reset   # test databases only
```

Roles, GRANTs and RLS policies exist only here. Creating or changing one by
hand in a console means the tests verify a database that does not exist in the
code — and the difference surfaces in production.

Migrations run as an owner role that is neither `bot_user` nor `admin_user`.
Its connection string is an operator input (argument or `MIGRATE_DATABASE_URL`),
not a service environment variable: each service holds its own `DATABASE_URL`
at the service level, and neither of them may alter the permission model.

Role passwords are set per environment, outside the migrations, and never
appear in git.
