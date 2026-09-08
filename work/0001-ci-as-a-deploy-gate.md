---
status: todo
opened: 2026-09-08
---

# CI does not gate the deploy

## The problem

GitHub Actions and Railway both trigger on a push to `main`, in parallel.
Railway does not wait for the workflow. A push whose tests fail still deploys,
and the red check arrives after the bad build is already serving guests.

The suite is not decoration here — it is what proves the permission model.
`tests/permissions/` is the only thing standing between a wrong GRANT and
`bot_user` reading `business`. A deploy that does not wait for it is a deploy
that does not check.

## The fix

Railway has "Wait for CI" per service (Settings → Deploy). It holds the
deployment until the commit's checks pass on GitHub. Three services, so three
settings — the bot is the one exposed to the internet, so it is the one that
matters most, but a broken admin build is a manager locked out.

## Also worth doing in the same pass

No service has `watchPatterns`, so every push rebuilds all three regardless of
what changed. Related to this task only in that both are Railway deploy
settings and both are one visit to the same screen — but see
[0002](0002-apply-railway-config.md): setting either by hand widens the drift
between the console and `.railway/railway.ts`.

## Open

Whether "Wait for CI" blocks on *all* checks or on required ones only — it
should be confirmed against a deliberately failing commit on a branch, not
assumed.
