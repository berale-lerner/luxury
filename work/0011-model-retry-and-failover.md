---
status: todo
opened: 2026-09-10
---

# Retry and failover in the model layer

## Why

A provider returning 503 is now survivable — the guest is told
([0009](0009-agent-unavailable-notice.md)) — but "we could not answer" is a
worse outcome than answering, and both are reachable from the same failure.

The observed case: three deliveries of one guest message, each waiting about
twenty seconds for Gemini to refuse, an hour of the bot being useless for
everyone. Every retry came from Telegram, and there is no attempt to recover
inside the request at all.

## Two separate things

**Retry** is the same provider, again, after a pause. It fixes a single
unlucky call and costs latency. A tight bound — two attempts, a short backoff,
a hard ceiling well under the platform's webhook timeout — turns most 503s
into an answered message the guest never knew was at risk.

**Failover** is a different provider. It fixes an outage rather than a blip,
and it is the reason the model layer was built as a port with adapters in the
first place: `createModel(selection, keys)` already returns one of two
implementations without the caller knowing which.

## What is missing before failover is real

**A second key.** Production has `GEMINI_API_KEY` and no `ANTHROPIC_API_KEY`,
so today the switch has nothing to switch to. That is a variable, not code.

## Decisions

- **Where retry lives.** Inside the adapter, or around the port? Around it:
  retrying is not a property of any one vendor, and putting it in each adapter
  means writing it twice and getting it slightly different the second time
- **What is retryable.** A 503 or a timeout, yes. A refusal is not a failure
  and must not be retried — the model answered, and the answer was no. A 4xx
  is a bug in the request and will fail identically forever
- **Whether failover is automatic or configured.** Automatic failover means
  guests get answers from a model the owner did not choose, in a different
  voice, without anyone noticing. That may still be right, and it should be a
  decision rather than a default
- **What the manager sees.** A conversation answered by the fallback provider
  is worth marking, if only so a complaint about tone can be traced

## The budget that constrains all of it

Telegram redelivers when a webhook does not answer in time. Every retry inside
the request spends that budget. Two attempts at twenty seconds each is already
most of it — so the ceiling is a hard number, and exceeding it converts a
recoverable failure into a redelivery, which is the thing retry was meant to
avoid.

## Tests

The existing `flakyModel` in `tests/bot/redelivery-reply.test.ts` is most of
the harness. What is owed on top: that a refusal is not retried, that the
ceiling is respected, and that failover picks the second provider exactly when
the first is unavailable and not when it declined to answer.
