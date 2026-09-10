---
status: todo
opened: 2026-09-10
---

# A page for the developer, with room for metrics

## What it is for

There is a set of facts about this system that nobody can see without a
terminal and a database password: which prompt version the bot is actually
serving, whether the Telegram webhook is registered, which migrations have
run, which model provider is answering. Today the only way to learn any of
them is to connect to production, and CLAUDE.md's own rule is that production
credentials never land on a local machine — so in practice the answer is that
nobody looks.

This page is where those facts live, and the frame that later holds metrics.
Building the frame first is deliberate: what makes a metrics page hard is
deciding what may be counted and where the numbers come from, and both
questions can be settled while the page still shows three rows.

## The rule that shapes everything here

**Counts and timings, never content.** CLAUDE.md forbids feeding conversation
content to analytics on the admin side, and this page is exactly where that
line gets crossed by accident — a "recent activity" panel showing the last few
messages is the natural next feature and is not allowed. The page shows how
many, how long, how often. It does not show what anyone said.

Stated as a test for anything added later: if the panel would still be useful
with every message body replaced by its length, it is fine. If it would not,
it does not belong here.

## Where the numbers come from

**The database, and only the database.** `admin_user` already reads every
table the bot writes, so message volume, conversations awaiting a reply, the
published prompt version and the migration ledger are all ordinary queries.

The tempting alternative is a metrics endpoint on `apps/bot` that the admin
calls. That would be a new channel between the two services, and CLAUDE.md
allows at most one narrow purpose-built endpoint in that direction and only
when genuinely required. Runtime counters that exist only in the bot's memory
are not worth opening it — so anything this page wants from the bot, the bot
writes down.

## What it can show on day one, with nothing new stored

| | From |
|---|---|
| Published prompt version, and when | `prompt_versions` |
| Migrations applied, and when | `migrations.applied` |
| Messages per day, inbound vs outbound, by sender | `messages` |
| Conversations awaiting a reply | last message per conversation is inbound |
| Conversations by channel | `conversations` |
| Muted conversations — the agent held by a human | `conversations.agent_muted` |
| Queue depth and age | `tasks` |

## What it needs before it can show more

- **A build identity.** Nothing embeds a commit sha today, so the page cannot
  say which version is running — which is the first thing anyone asks when
  behaviour looks wrong. That is a build-time variable and a Railway setting
- **Agent outcomes.** `agent.refused` and `agent.skipped` are logged and
  nowhere else. A count of refusals over time is a genuine signal about the
  prompt, and it needs a row rather than a log line
- **Webhook state.** Whether Telegram currently points at us is knowable only
  by asking Telegram. That is an outbound call on a schedule, not a query

## Access

`owner`, using the roles from [0005](0005-user-management-and-roles.md) —
one entry in `shell/routes.tsx` with `minRole: 'owner'`, and
`requires('owner')` on the endpoints. No new role: "developer" is not a
different set of permissions from "owner", it is the same person wearing a
different hat, and a fourth role would have to be justified by something it
can do that owner cannot.

## The efficiency question it will force

`messageCount` on the conversation list already counts every message in every
conversation on every poll, capped only by the 100-row list limit. It is
harmless now and it is the first thing that hurts as conversations
accumulate. A page whose whole purpose is aggregates is the right moment to
decide whether these are computed per request, cached, or maintained — and to
stop the list from paying for a number nobody reads.

## Depends on

[0007](0007-bilingual-interface.md), loosely. Not blocked by it, but a page
built after the catalogue exists is a page whose strings are written once.

## Tests

The queries, not the page. Each aggregate against a seeded database with a
known answer — an aggregate that is quietly wrong is worse than one that is
missing, because it gets believed.

And one that belongs to the rule above rather than to any query: no endpoint
under this page returns a message body. Structural, in the manner of
`tests/structure/`, so it holds for panels nobody has written yet.
