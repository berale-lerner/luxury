---
status: todo
opened: 2026-09-08
---

# `.railway/railway.ts` has never been applied

## The problem

The Railway project is defined as code in `.railway/railway.ts`, and every
setting it describes was in fact set by hand in the console. `railway config
apply` silently no-ops: the `@railway/cli` binary is not properly installed,
so the command exits without doing anything and without saying so.

The file is therefore not a description of production. It is a description of
what production was intended to be, and it has drifted — service settings,
build configuration and watch patterns were all changed in the console after
it was written.

An infrastructure file nobody applies is worse than no file, because the next
change gets made against it in good faith.

## The fix

```bash
npm install -g @railway/cli --foreground-scripts
```

The flag matters: the install script is what fetches the platform binary, and
it is being suppressed. Then `railway config apply` against a real project,
and confirm from its output that it actually changed something.

Before applying, reconcile: read the current console state for all three
services and update `.railway/railway.ts` to match, then apply. Applying a
stale file over live configuration would revert settings that were made
deliberately.

## Open

Whether Railway's config-as-code covers environment variables at all. If it
does not, the file can never be the whole truth and its scope should be stated
inside it — secrets are set at the service level by hand on purpose
(CLAUDE.md, "Never define env vars at the project level").
