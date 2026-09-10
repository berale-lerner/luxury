---
status: done
opened: 2026-09-09
---

# The prompt editing page

## The storage question is already answered

The backend for this exists — migration 0007 built it and the bot reads it in
production today. Three tables:

| | |
|---|---|
| `agents` | The stable key the code resolves (`guest`) |
| `prompt_documents` | The editable set. Ordered by `position`, assembled by concatenation |
| `prompt_versions` | A frozen snapshot, taken at publish |

Documents are a draft; a version is what the bot serves. `bot_user` has **no
grant at all** on `prompt_documents`, so a half-written sentence cannot reach
a guest even by mistake — that is a boundary, not a convention.

Versioning is set-level rather than per document, because reverting one
document while the others moved on produces a combination that never ran and
nobody reviewed.

## And so is the efficiency question

Loading is not a cost worth designing around, because three things already
handle it:

1. **The assembly happens at publish, not at call time.** `prompt_versions.body`
   holds the finished text. A guest message reads one row through
   `prompt_versions_latest_idx` — no join across documents, no concatenation
2. **`PromptCache`, 10s TTL** ([prompt.ts](../apps/bot/src/agent/prompt.ts)).
   Six reads a minute per process, not one per message. The TTL is
   deliberately dumb: publishing happens in the admin process, so there is
   nothing in the bot to invalidate it, and a manager waits at most ten
   seconds. If that ever needs to be immediate, the answer is Postgres
   `LISTEN`/`NOTIFY` rather than a shorter number
3. **Provider-side prompt caching.** The Anthropic adapter marks the system
   prompt `cache_control: ephemeral`, so the stable prefix is not reprocessed
   or recharged on every turn

So the work here is the page, not the storage.

## What is actually missing

- **No routes.** The admin server serves conversations and `/api/me` and
  nothing else. Read, edit, reorder, preview and publish all need endpoints
- **Publishing is a script.** `scripts/publish-prompt.mjs` writes both tables
  from files under `prompts/<agent>/`, as a stopgap that says so in its own
  header. The page replaces it — see the conflict below
- **The assembly rule lives in the script.** The separator (`\n\n---\n\n`) and
  the ordering are defined in `publish-prompt.mjs`. The preview must produce
  byte-identical output to what publish stores, so this belongs in one shared
  place before there are two callers, not after

## Resolved: deploy republishes over the manager

`scripts/deploy.mjs` calls `publishIfChanged` on **every deploy**. It assembles
`prompts/guest/` from the repo and publishes a new version whenever the body
differs from the latest one.

The moment the page exists, that is a silent revert: the manager publishes
version 5 in the UI, the next push deploys, the files still say something
else, and version 6 rewinds their work — with no error, because from the
script's point of view it did its job.

**Decided: first-publish-only.** `publishIfChanged` became
`publishIfUnpublished` and now returns early whenever any version exists for
the agent. A fresh database still comes up with an agent that can answer;
after that the prompt belongs to the screen, and `prompts/` is a starting
point rather than a source of truth. The deploy test asserts the case that
matters — the files changed and it published nothing — and that a draft the
manager is mid-edit is left alone.

## Resolved: two things that bit, as predicted

**Reordering.** Migration 0011 makes the constraint `DEFERRABLE INITIALLY
IMMEDIATE`, so an ordinary insert still fails where the error is useful and a
reorder asks for the check to be postponed to `COMMIT`. `reorderDocuments`
also refuses a list that does not name every document exactly once — a partial
list would leave the rest sitting on positions the same pass just handed out.

**Version numbers.** Allocated inside the transaction behind
`SELECT ... FROM agents ... FOR UPDATE`. The test runs two publishes at once
and asserts no version number repeats.

**One that was not predicted:** whether publishing would change anything has
to be decided by the server, not by comparing character counts in the browser.
`getPrompt` returns `hasChanges`, compared against the stored text — otherwise
the screen offers a button the server refuses, or hides one it would have
accepted.

## Revert

`prompt_versions.snapshot` already holds what the document set looked like, so
revert is: copy that snapshot back over the documents, then publish it as a
**new** version. Never rewind to an old row — the bot reads the highest
version number, and rewinding would mean history that disagrees with what is
being served.

## Boundaries

CLAUDE.md, and worth repeating on the page itself in some form: **a prompt
document is not a security mechanism.** "Never reveal cost prices" is not
protection — the protection is that the tool does not return the field. And no
secrets in a document, ever; it is text sent to a third-party model on every
message.

Facts about apartments belong in tools, not in documents. A document that
lists prices is a second source of truth that goes stale without anyone
noticing.

## Depends on

[0004](0004-admin-app-shell.md) for somewhere to put the page.
[0005](0005-user-management-and-roles.md) decides who may publish — an edit
here changes what every guest is told, immediately and with no deploy to roll
back, which argues for the highest role rather than the middle one.

## Where the assembly rule lives

`packages/shared/src/prompt.ts` — `PROMPT_SEPARATOR` and `assemblePrompt`.
Pure, no data access, no environment, which is what makes shared the right
home for it. Three callers use it: the preview, the publish, and the
bootstrap script.

One difference from the old script worth knowing: the shared function honours
`isActive`, and the file-based bootstrap has no such concept — every file is
a document. That is correct for a bootstrap and would be a divergence if the
script were still the main path, which is exactly why it no longer is.

## Tests

- Preview and publish produce identical text for the same document set. If
  they can diverge, the preview is decoration
- Reordering a set of three survives, including the swap that trips the
  unique constraint
- Revert produces a new version whose body equals the reverted one, and leaves
  the intervening versions in place
- `bot_user` still cannot select from `prompt_documents` — the existing
  permission suite covers this and it must stay covered
