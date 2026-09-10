---
status: todo
opened: 2026-09-08
---

# `check_availability` — the first agent tool

## What it is

The slice that turns the bot from a conversationalist into something useful:
a guest asks whether there is room for four people over a weekend, and the
answer comes from MiniHotel rather than from the prompt.

## The shape

Input from the model: dates and party size, nothing else. Never a unit id,
never a price, never a free-form query (CLAUDE.md, "Agent tools"). Both
validated in code before the call, regardless of what the prompt says.

Output: a whitelist, built by naming the fields that may cross rather than by
removing the ones that may not. The test is the one in CLAUDE.md — if the
guest saw exactly what the function returns, would that be fine?

`Allocation` and `maxavail` are excluded, and the reason is subtle enough to
write down: together they give exact current occupancy. That is a business
fact about how full the hotel is, and it does not belong in a guest's chat
window even indirectly, because whatever the tool returns can end up quoted
back by the model.

## A prerequisite, now met

The model resolves "this weekend" into the dates this tool receives, and until
[0009](0009-agent-unavailable-notice.md) it had no way to: a model has no
clock, and neither provider injects one through the API. It would have inferred
a date from its training data — plausible, confidently stated, and very likely
in the wrong year.

The agent is now told the current local time on every call, so the translation
has something to stand on. Worth remembering when the validation is written:
checking that a date parses is not checking that it is the date the guest
meant, and a wrong year passes both.

## Credentials

MiniHotel's credentials are monolithic: the same key that reads availability
also calls `processCreditCard()` (MINIHOTEL.md). They are read from env on the
server side and never enter the model's context. The narrowness of the tool is
the only boundary here, since the vendor does not offer a read-only key.

## Also required

Rate limit and timeout on the call — inside the tool, so every caller gets
them — and a log line per invocation with the parameters but not the response
body.

## Open

What the bot answers when MiniHotel is down. Silence is wrong and a raw error
is worse; the fallback text is a product decision, and it probably belongs in
a prompt document rather than in code.
