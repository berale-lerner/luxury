# @luxury/shared

Types, validation schemas and pure utilities. Imported by every other package.

Hard boundaries (CLAUDE.md):

- no external dependencies — Zod is a `peerDependency`, pinned through the workspace `catalog:`
- no credentials, no `process.env`
- no network calls
- no database access

The reason is concrete: importing a single type from here must never drag a
channel SDK or a database driver into a service. Anything that talks to the
outside world belongs in `packages/messaging` or in the app that owns it.
