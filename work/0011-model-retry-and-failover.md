---
status: todo
opened: 2026-09-10
---

# Failover to a second model provider

## Why

A provider returning 503 is now survivable — the guest is told
([0009](0009-agent-unavailable-notice.md)) — but "we could not answer" is a
worse outcome than answering, and both are reachable from the same failure.

The observed case: three deliveries of one guest message, each waiting about
twenty seconds for Gemini to refuse, an hour of the bot being useless for
everyone. Every retry came from Telegram, and there is no attempt to recover
inside the request at all.

## Retry is done

[0009](0009-agent-unavailable-notice.md) built it: two attempts around the
port, each bounded at 15 seconds, short backoff, refusals never retried. That
covers the single unlucky call, which is the common failure.

**Failover is what is left.** It fixes an outage rather than a blip, and it is
the reason the model layer was built as a port with adapters in the first
place: `createModel(selection, keys)` already returns one of two
implementations without the caller knowing which.

## What is missing before failover is real

**A second key.** Production has `GEMINI_API_KEY` and no `ANTHROPIC_API_KEY`,
so today the switch has nothing to switch to. That is a variable, not code.

## Decisions

- **Whether failover is automatic or configured.** Automatic failover means
  guests get answers from a model the owner did not choose, in a different
  voice, without anyone noticing. That may still be right, and it should be a
  decision rather than a default
- **What the manager sees.** A conversation answered by the fallback provider
  is worth marking, if only so a complaint about tone can be traced

## The budget that constrains all of it

Telegram redelivers when a webhook does not answer in time, and the retries
already spend some of it: two attempts at up to fifteen seconds each. Failover
adds a third call to a different provider on top of that, which is very likely
past the ceiling — so it probably cannot be another attempt in the same
request. Either the ceiling comes down when a fallback exists, or failover is
chosen before the first call rather than after the second.

## Tests

`countingModel` in `tests/bot/agent-unavailable.test.ts` is most of the
harness, and the refusal case is already covered there. What is owed on top:
that failover picks the second provider exactly when the first is unavailable
and not when it declined to answer, and that the combined time still fits the
delivery budget.
