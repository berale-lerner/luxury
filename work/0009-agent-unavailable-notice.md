---
status: done
opened: 2026-09-10
---

# Telling the guest when the agent cannot answer

## Why

Found in production: Gemini returned 503 "This model is currently
experiencing high demand" for a real guest message. The system behaved
correctly — stored the message, answered 500, let Telegram redeliver — and the
guest saw nothing at all, three times, and would have gone on seeing nothing
until the platform quietly gave up.

Nothing here fixes the provider. What it fixes is the silence.

## How it counts

The platform's redeliveries *are* the retry. Retrying inside the request would
mean holding the webhook open for a minute across three provider timeouts,
which is how a request gets abandoned and redelivered anyway.

So the count lives on the message row. The deduplicating insert became an
upsert: the first delivery writes the row, each redelivery raises
`delivery_attempts`. Three deliveries, then the notice, then 200 so the
platform stops.

`delivery_attempts` is also how the code knows which branch of the upsert ran.
The obvious way is `(xmax = 0)`, and it does not work here: system columns are
not reachable through a column-level grant, so reading `xmax` would demand
table-level SELECT on `messages` — a wider grant, bought for a fact the
returned counter already carries.

## Where the words live

`public.message_templates`, seeded with `agent_unavailable`. Guest-facing text
belongs in a table so the owner can change it without a deploy (CLAUDE.md,
"Editable content"). It is bilingual, because guests write in both languages
and this message is sent precisely when there is no model available to pick
one.

**Still owed: a screen for it.** The table exists and the text is editable with
an UPDATE; a manager cannot yet change it without a developer, which is half
of what the rule asks for. That is [0010](0010-message-templates-screen.md).

## Why `sender = 'system'`

The model produced nothing — that is the whole reason this message exists.
Recording it as `agent` would tell the manager the agent said something it
never said, and would replay the apology to the model as its own history, so
failing to answer would slowly become part of how the agent believes it talks.

## What it is not

Not a proactively-initiated message. It is a reply, on the channel the guest
wrote on, to a message they just sent — the case CLAUDE.md describes as
automatic. Nothing here sends anything to anyone who did not just write in.

## The grant, stated

`bot_user` gained UPDATE on exactly one column, `messages.delivery_attempts`,
on rows of the conversation the request has already claimed. It cannot rewrite
a guest's words, move a message between conversations, or turn an inbound row
into an outbound one. A permission test asserts that the UPDATE grant covers
that column and no other.

**A trap worth remembering:** 0012 granted the column and stopped there. RLS is
enabled on `messages` and `bot_user` had policies for SELECT and INSERT only,
so `ON CONFLICT ... DO UPDATE` failed with "new row violates row-level
security policy" and every redelivery errored. A column-level GRANT without a
matching policy is half a permission, and the half that is missing fails at
runtime rather than at migration time. 0013 adds the policy.

## Tests

`tests/bot/delivery-fallback.test.ts` — the sequence end to end: 500 until the
last delivery, then the notice and a 200; recorded as `system` and never as
`agent`; said once rather than on every subsequent redelivery; and a new
message still answered normally once the provider recovers.

## Still open

The fallback is what happens after failure, not a way to avoid it. Retries
with backoff inside the model layer, and failing over to a second provider,
are [0011](0011-model-retry-and-failover.md) — worth doing once there is a
second key to fail over to.
