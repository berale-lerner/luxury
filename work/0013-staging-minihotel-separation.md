---
status: todo
opened: 2026-09-28
---

# Staging reaches MiniHotel's production account

## The problem

On 2026-09-28 the owner decided that staging should, for now, run against the
real MiniHotel account, so the availability screen can be tried there before
production. Staging's `admin` therefore holds the production MiniHotel
credentials (`MINIHOTEL_USERNAME` / `PASSWORD` / `HOTEL_ID=luxury50`, no
`MINIHOTEL_ARI_URL`).

What that costs:

- **The credential is monolithic.** The same user can create reservations and
  charge credit cards (MINIHOTEL.md, "אימות"). Staging is where unreviewed
  code runs first, so it now holds that reach too. What limits it today is
  that `packages/minihotel` exposes reads only.
- **Nothing on MiniHotel's side separates the environments.** Staging leaves
  Railway from the same addresses as production (DEPLOY.md, "Static egress
  addresses"), and all five are on the vendor's allowlist.
- **One more place holds the production password.** Rotating it means
  updating both environments.

## The fix

Move staging to the sandbox: `MINIHOTEL_USERNAME=Test`,
`MINIHOTEL_PASSWORD=3657488`, `MINIHOTEL_HOTEL_ID=sandbox`,
`MINIHOTEL_ARI_URL=https://sandbox.minihotel.cloud/gds` (DEPLOY.md). Do it
before any write method is added to `packages/minihotel`, and before the bot
gets MiniHotel access in staging (work/0003).

## Open

- Does the owner want staging to keep one real, read-only view — for example
  a separate read-only user, if MiniHotel can issue one — or is the sandbox
  enough?
