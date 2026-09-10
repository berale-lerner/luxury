---
status: todo
opened: 2026-09-10
---

# A screen for message templates

## The gap

`public.message_templates` exists and holds `agent_unavailable`, the notice
sent when the agent cannot answer ([0009](0009-agent-unavailable-notice.md)).
The text is in a table rather than in the code, which is the important half of
CLAUDE.md's rule. The other half is not done: *"live in a DB table **with a
screen in the admin UI**. Never hardcoded. Goal: the owner can change text
without a deploy and without a developer."*

Right now changing it takes a developer and a connection to production.

## Scope

Small, and mostly already built. Templates are a list of keyed rows with a
body — the same shape as the users screen, without the ordering and publishing
that made the prompt page interesting. One page, an edit box per template,
`updated_by` and `updated_at` recorded.

Reuse: the page shell from [0004](0004-admin-app-shell.md), the role gate from
[0005](0005-user-management-and-roles.md).

## Decisions to make

- **Who may edit.** Owner, most likely: this is text sent to guests in the
  business's name. Manager is defensible. It is one line either way
- **Whether templates are versioned.** The prompt is, because a bad edit
  changes every conversation at once and there is no deploy to roll back. A
  template is smaller and more obviously wrong when it is wrong — but
  `updated_by` and `updated_at` are the minimum, and they exist
- **Whether a template may be deleted.** Probably not: the code looks templates
  up by key, so deleting one turns a fallback into silence. Deactivating is a
  different question from deleting, and the answer may be that neither is
  offered

## The rule this page must not break

A template is guest-facing text that the code sends. It is not a prompt, and
the model never sees it. Nothing on this page should accept text that is then
passed to the model, because that would make it a prompt document with none of
the protections [0006](0006-prompt-editing-page.md) built — no draft, no
version, no revert.

## Tests

The write path, and one structural: every key the code looks up has a row. A
template referenced by a constant in the bot and missing from the table is a
silence in production, and it is exactly the kind of thing a rename causes.
