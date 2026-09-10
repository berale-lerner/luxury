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

## How it works

Everything happens inside one request, and nothing is counted anywhere.

The guest presses send. Before the model is asked at all, a typing indicator
starts and renews every 4.5 seconds — Telegram's expires after about five and
cannot be extended, so it has to be repeated, and sending the reply clears it.
The wait is then visible while it is happening, which is most of the
complaint: a two-second answer and a twenty-second failure looked identical
from the guest's side.

The model is asked twice, each call bounded at 15 seconds, with a short
backoff between. One retry covers the single unlucky call, which is the common
failure; the ceiling exists because the failure seen in production took twenty
seconds to arrive, and without a bound the first attempt can spend the whole
request on its own.

If both fail, the guest is told, and the delivery is accepted with a 200. Not
a 500: the retries are already spent, so asking the platform to redeliver
would buy another round of the same failure a minute later with the guest
still watching nothing happen.

**An earlier version of this counted deliveries in the database** — an upsert
raising `delivery_attempts` on the message row, so the platform's own
redeliveries were the retry. It worked, and it was more machinery than the
problem needed: a migration, a new GRANT, an RLS policy, and a counter, to
learn something the process already knows within a single request. Removed
before it shipped.

## Where the words live

`public.message_templates`, seeded with `agent_unavailable`. Guest-facing text
belongs in a table so the owner can change it without a deploy (CLAUDE.md,
"Editable content"). It is bilingual, because guests write in both languages
and this message is sent precisely when there is no model available to pick
one.

**Still owed: a screen for it.** The table exists and the text is editable with
an UPDATE; a manager cannot yet change it without a developer, which is half
of what the rule asks for. That is [0010](0010-message-templates-screen.md).

## Why the retries are in the agent layer

Not in each adapter: an unlucky call is not a property of any one vendor, and
writing the logic twice is how the two end up behaving slightly differently.

What is retried is a *failure to answer*. A refusal is not one — the model
answered, and the answer was no. Retrying it would be arguing with it, and
apologising for it would misdescribe what happened.

## Why `sender = 'system'`

The model produced nothing — that is the whole reason this message exists.
Recording it as `agent` would tell the manager the agent said something it
never said, and would replay the apology to the model as its own history, so
failing to answer would slowly become part of how the agent believes it talks.

## What it is not

Not a proactively-initiated message. It is a reply, on the channel the guest
wrote on, to a message they just sent — the case CLAUDE.md describes as
automatic. Nothing here sends anything to anyone who did not just write in.

## No new permissions

`bot_user` gained nothing beyond SELECT on two columns of the new templates
table. It still cannot change a stored message in any way, and a permission
test now asserts that its UPDATE grant on `messages` is empty rather than
merely narrow.

**Worth remembering from the version that was removed:** granting a column
without a matching RLS policy is half a permission, and the missing half fails
at runtime rather than at migration time — `ON CONFLICT ... DO UPDATE` came
back with "new row violates row-level security policy" while the GRANT looked
perfectly correct.

## The typing indicator

`ChannelSender.indicateTyping` is optional on the port, because it is a
courtesy rather than a capability: a platform without one simply does not
offer it and the caller shows nothing, instead of branching on which platform
it is talking to.

Every failure is swallowed — in the router, not at the call site. A courtesy
that can break a reply which would otherwise have worked is worse than no
courtesy, so there is deliberately nothing for a caller to handle.

The interval is cleared in a `finally`, on every path including the throw. A
live interval outliving its request would go on telling the guest that an
answer is coming.

## Tests

`tests/bot/agent-unavailable.test.ts` — asked exactly twice then the notice;
recorded as `system` and never as `agent`; said once however many times the
update is redelivered; **answered on the second attempt with the guest never
learning of the first**, which is the case the retry exists for; a refusal
asked once and never apologised for; and the typing hint started before the
model is asked rather than after.

## Still open

Failing over to a second provider — [0011](0011-model-retry-and-failover.md).
The retry half of that task is done here; failover is blocked on there being a
second key in production to fail over to.
