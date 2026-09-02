/**
 * The Railway project, as code.
 *
 * Same reasoning as the migrations: infrastructure defined in a console is
 * infrastructure nobody can review, and it drifts from what the repository
 * says. `railway config plan` shows the diff, `railway config apply` lands it.
 *
 * Secrets are never in this file. Anything sealed is `preserve()`, which keeps
 * whatever was set in Railway and writes nothing back to source.
 */
import { defineRailway, github, postgres, preserve, project, ref, service } from 'railway/iac';

const REPO = 'berale-lerner/luxury';
const BRANCH = 'main';

/** Every code service builds the whole workspace: pnpm needs the repo root. */
const nixpacks = {
  builder: 'NIXPACKS',
  buildCommand: 'pnpm install --frozen-lockfile && pnpm build',
} as const;

export default defineRailway(() => {
  const db = postgres('Postgres');

  // Owner credentials, and the only service that holds them. Migrations create
  // roles, GRANTs and RLS policies, so the role that runs them is deliberately
  // not the role either application connects as.
  //
  // It runs once per deploy and exits: restartPolicyType NEVER. Re-running is
  // harmless — an applied migration is skipped through migrations.applied.
  const migrator = service('migrator', {
    source: github(REPO, { branch: BRANCH }),
    build: {
      builder: 'NIXPACKS',
      buildCommand: 'pnpm install --frozen-lockfile',
      watchPatterns: ['migrations/**', 'scripts/migrate.mjs', 'pnpm-lock.yaml'],
    },
    deploy: {
      startCommand: 'node scripts/migrate.mjs',
      numReplicas: 1,
      restartPolicyType: 'NEVER',
    },
    env: {
      MIGRATE_DATABASE_URL: ref(db, 'DATABASE_URL'),
    },
  });

  // Public. The Telegram webhook is a deliberate exception to "behind auth by
  // default", recorded in DESIGN.md.
  const bot = service('bot', {
    source: github(REPO, { branch: BRANCH }),
    build: {
      ...nixpacks,
      watchPatterns: ['apps/bot/**', 'packages/**', 'pnpm-lock.yaml', 'tsconfig*.json'],
    },
    deploy: {
      startCommand: 'pnpm --filter @luxury/bot start',
      healthcheckPath: '/health',
      restartPolicyType: 'ON_FAILURE',
      restartPolicyMaxRetries: 3,
    },
    env: {
      // The role name is the security-relevant half of this string, so it lives
      // in code where it is reviewed. Only the password is set by hand, once,
      // and stays sealed in Railway.
      DATABASE_URL:
        'postgres://bot_user:${{BOT_DB_PASSWORD}}@${{Postgres.RAILWAY_PRIVATE_DOMAIN}}:5432/${{Postgres.PGDATABASE}}',
      BOT_DB_PASSWORD: preserve(),
      TELEGRAM_BOT_TOKEN: preserve(),
      TELEGRAM_WEBHOOK_SECRET: preserve(),
      LOG_LEVEL: 'info',
    },
  });

  // Behind Google sign-in and the allowlist. Reaches every schema, including
  // business, which is why the allowlist is checked server-side.
  const admin = service('admin', {
    source: github(REPO, { branch: BRANCH }),
    build: {
      ...nixpacks,
      watchPatterns: ['apps/admin/**', 'packages/**', 'pnpm-lock.yaml', 'tsconfig*.json'],
    },
    deploy: {
      startCommand: 'pnpm --filter @luxury/admin start',
      healthcheckPath: '/health',
      restartPolicyType: 'ON_FAILURE',
      restartPolicyMaxRetries: 3,
    },
    env: {
      DATABASE_URL:
        'postgres://admin_user:${{ADMIN_DB_PASSWORD}}@${{Postgres.RAILWAY_PRIVATE_DOMAIN}}:5432/${{Postgres.PGDATABASE}}',
      ADMIN_DB_PASSWORD: preserve(),
      GOOGLE_CLIENT_ID: preserve(),
      GOOGLE_CLIENT_SECRET: preserve(),
      BETTER_AUTH_SECRET: preserve(),
      BETTER_AUTH_URL: 'https://${{RAILWAY_PUBLIC_DOMAIN}}',
      // Declared again here rather than shared with the bot. A project-level
      // variable would hand both services one environment and undo the
      // separation this whole structure exists for.
      TELEGRAM_BOT_TOKEN: preserve(),
      LOG_LEVEL: 'info',
    },
  });

  return project('luxury', {
    environments: ['production', 'staging'],
    resources: [db, migrator, bot, admin],
  });
});
