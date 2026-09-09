---
status: todo
opened: 2026-09-09
---

# User management with roles

## Today

`public.admin_allowlist` is binary: an address is on it or it is not, and
everyone on it can reach every route in the guarded scope equally. There is no
screen — a manager is added with an `INSERT` by hand, which is the thing
CLAUDE.md says must not be necessary.

What is asked for is a page to add, remove and edit people, and a role that
separates reading conversations from writing into them.

## The roles

Two roles were asked for; the page itself forces a third, because someone has
to be allowed to grant access and that is not the same permission as replying
to a guest.

| | Can | Cannot |
|---|---|---|
| `viewer` | Read conversations and messages | Send anything |
| `manager` | Everything a viewer can, plus send messages and mute the agent | Manage users |
| `owner` | Everything, plus this page | — |

Muting the agent sits with `manager` rather than `viewer` deliberately: it
changes what the guest experiences, which is the line the roles are drawn on.
Worth a second opinion before it is built — it is the one row above that could
reasonably go either way.

## Where it is enforced

**On the server, per route, and nowhere else.** CLAUDE.md already says the
allowlist is never enforced only in the UI; a role is the same rule with more
surface. Hiding a button is a courtesy to the user, not a boundary.

The guard is the right place to extend, and it is already registered on the
whole API scope so a forgotten route fails closed
([session.ts](../apps/admin/server/src/auth/session.ts)). Two changes:

- `isAllowed` returns the row rather than a boolean, and the role joins
  `email`/`name` on `request.admin`
- Every route declares the role it needs. **A route that declares nothing gets
  the highest requirement, not the lowest** — the default has to fail closed,
  or a new endpoint written on a Friday is a viewer's escalation

The existing `tests/structure/` suite is the natural place to prove that: walk
the registered routes and assert each one declares a requirement, so the rule
holds for endpoints nobody has written yet.

No new GRANT is needed. `admin_user` already has `FOR ALL` on
`admin_allowlist` (0004_rls.sql:63).

## The database

Migration 0010: a `role` column on `admin_allowlist`, `NOT NULL`, with a
`CHECK` over the three values. A lookup table would buy nothing at this size,
and the `CHECK` is an advantage rather than a limitation — a role is a set of
permissions written in code, so introducing one requires a deploy regardless.

**The migration must promote the existing rows to `owner`.** Defaulting them
to `viewer` locks every current manager out of the page that would fix it, and
the fix would be an `INSERT` by hand in production — the exact thing this task
exists to remove. This is the part to get right on the first attempt.

## Rules the page has to enforce, server-side

- **Email is not editable.** It is the identity the whole check is keyed on;
  changing it is removing one person and adding another, and it should look
  like that in the UI. What is editable is the role
- **Nobody demotes or removes themselves.** Not a courtesy — it is how an
  account is locked out by a mis-click
- **At least one `owner` survives.** Enforced in the transaction that performs
  the change, not by a check beforehand: two concurrent demotions each see
  another owner and both succeed

## Audit

`added_by` already exists and is only half the story now — a role change grants
access to every guest conversation, and it should say who made it and when.
Whether that is two more columns or a small history table depends on whether
the answer to "who gave them access" needs to survive the next change.

## Depends on

[0004](0004-admin-app-shell.md). This is the second admin page, and there is
currently nowhere to put a second page.

## Tests

Not optional here, and not frontend tests. This changes a migration and adds
an authorization boundary, which are two of the mandatory categories in
TESTING.md:

- A `viewer` gets 403 from `POST /api/conversations/:id/messages`, proven
  against the real server. If it is only proven by the button being hidden, it
  is not proven
- The 0010 migration leaves existing rows as `owner`, on a database built from
  the migration files
- The last `owner` cannot be demoted or deleted, including by two requests
  racing
