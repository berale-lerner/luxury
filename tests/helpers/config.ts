/**
 * Test-only connection settings.
 *
 * These are not service environment variables — apps/bot and apps/admin each
 * own theirs at the service level. This is the throwaway container from
 * docker-compose.test.yml, and the passwords below exist only inside it.
 */
export const OWNER_URL =
  process.env['TEST_DATABASE_URL'] ?? 'postgres://postgres:postgres@localhost:55432/luxury_test';

export const ROLE_PASSWORDS = {
  bot_user: 'test_bot_pw',
  admin_user: 'test_admin_pw',
} as const;

export type AppRole = keyof typeof ROLE_PASSWORDS;

/** The owner URL with the credentials swapped for one of the application roles. */
export function urlForRole(role: AppRole): string {
  const url = new URL(OWNER_URL);
  url.username = role;
  url.password = ROLE_PASSWORDS[role];
  return url.toString();
}
